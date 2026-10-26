import { ref } from 'vue';
import { useChatStore } from '@/stores/useChatStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { aiClient } from '@/services/ai/client';
import { getTransportService } from '@/services/transport';
import { formatTime } from '@/lib/utils';
import type { TaskItem } from '@/types';

export function useAICoordinator() {
  const chatStore = useChatStore();
  const taskStore = useTaskStore();
  const settingStore = useSettingStore();
  const isProcessing = ref(false);

  /**
   * Universal method to decompose an instruction (from voice or text)
   * into structured tasks, add them to the Kanban board, log to chat feed,
   * and broadcast over LAN P2P.
   */
  async function processTaskDecomposition(
    rawText: string,
    senderSource: string = 'Saya (Local PC)',
    isVoice: boolean = false
  ): Promise<{ summary: string; tasks: TaskItem[] }> {
    const text = rawText.trim();
    if (!text) throw new Error('Teks instruksi kosong');

    isProcessing.value = true;
    try {
      const activeProvider = settingStore.activeProvider;
      const result = await aiClient.decomposeTask(text, activeProvider);

      const timestamp = formatTime();
      const generatedTasks: TaskItem[] = result.daftar_tugas.map((t, idx) => ({
        id: `t-${Date.now()}-${idx}`,
        divisi: t.divisi,
        deskripsi: t.deskripsi,
        prioritas: t.prioritas,
        status: 'todo' as const,
        deadline: result.tanggal_deadline || 'Besok',
        senderName: senderSource,
        timestamp,
      }));

      // 1. Add tasks to Kanban board
      for (const task of generatedTasks) {
        taskStore.addTask(task);
      }

      // 2. Add processed message to Universal Feed
      const messageId = `m-${Date.now()}`;
      chatStore.addMessage({
        id: messageId,
        platform: 'local',
        senderName: senderSource,
        senderId: 'self',
        isSelf: true,
        content: text,
        messageType: 'voice_processed',
        timestamp,
        transcription: isVoice ? text : undefined,
        summary: result.ringkasan,
        tasks: generatedTasks,
      });

      // 3. Broadcast to P2P peers via active network transport
      const transport = getTransportService(settingStore.networkMode);
      transport.broadcastMessage({
        id: messageId,
        senderId: 'self',
        senderName: senderSource,
        type: 'task_update',
        payload: {
          summary: result.ringkasan,
          tasks: generatedTasks,
        },
        timestamp,
      }).catch((e) => console.warn('P2P broadcast note:', e));

      return {
        summary: result.ringkasan,
        tasks: generatedTasks,
      };
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * Send a standard text chat message
   */
  function sendTextMessage(content: string, senderName: string = 'Saya (Local PC)') {
    const text = content.trim();
    if (!text) return;

    const timestamp = formatTime();
    const messageId = `m-${Date.now()}`;

    chatStore.addMessage({
      id: messageId,
      platform: 'local',
      senderName,
      senderId: 'self',
      isSelf: true,
      content: text,
      messageType: 'text',
      timestamp,
    });

    const transport = getTransportService(settingStore.networkMode);
    transport.broadcastMessage({
      id: messageId,
      senderId: 'self',
      senderName,
      type: 'chat',
      payload: { text },
      timestamp,
    }).catch((e) => console.warn('P2P broadcast note:', e));
  }

  return {
    isProcessing,
    processTaskDecomposition,
    sendTextMessage,
  };
}
