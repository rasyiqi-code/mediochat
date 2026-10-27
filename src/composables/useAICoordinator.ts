import { ref } from 'vue';
import { useChatStore } from '@/stores/useChatStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { aiClient } from '@/services/ai/client';
import { getTransportService } from '@/services/transport';
import { formatTime } from '@/lib/utils';
import type { TaskItem } from '@/types';

export function useAICoordinator() {
  const chatStore = useChatStore();
  const taskStore = useTaskStore();
  const settingStore = useSettingStore();
  const stakeholderStore = useStakeholderStore();
  const isProcessing = ref(false);

  /**
   * Universal method to decompose an instruction (from voice or text)
   * into structured tasks, add them to the Kanban board, log to chat feed,
   * and broadcast over LAN P2P.
   */
  async function processTaskDecomposition(
    rawText: string,
    senderSource?: string,
    isVoice: boolean = false
  ): Promise<{ summary: string; tasks: TaskItem[] }> {
    const text = rawText.trim();
    if (!text) throw new Error('Teks instruksi kosong');

    isProcessing.value = true;
    try {
      const activeProvider = settingStore.activeProvider;
      const current = stakeholderStore.currentUser;
      const actualSender = senderSource || `${current.name} (${current.role})`;

      // Pass registered stakeholders to AI
      const result = await aiClient.decomposeTask(
        text,
        activeProvider,
        stakeholderStore.stakeholders
      );

      const timestamp = formatTime();
      const generatedTasks: TaskItem[] = result.daftar_tugas.map((t, idx) => {
        let matchedStakeholder = t.assignee_name
          ? stakeholderStore.findStakeholderByName(t.assignee_name)
          : undefined;

        if (!matchedStakeholder) {
          const candidates = stakeholderStore.findStakeholdersByDivision(t.divisi);
          if (candidates.length > 0) {
            matchedStakeholder = candidates[0];
          }
        }

        return {
          id: `t-${Date.now()}-${idx}`,
          divisi: t.divisi,
          deskripsi: t.deskripsi,
          prioritas: t.prioritas,
          status: 'todo' as const,
          deadline: result.tanggal_deadline || 'Besok',
          senderName: actualSender,
          timestamp,
          assigneeName: t.assignee_name || matchedStakeholder?.name || 'Belum Ditugaskan',
          assigneeRole: t.assignee_role || matchedStakeholder?.role || '',
          assigneeId: matchedStakeholder?.id,
        };
      });

      // 1. Add tasks to Kanban board
      for (const task of generatedTasks) {
        taskStore.addTask(task);
      }

      // 2. Add processed message to Universal Feed
      const messageId = `m-${Date.now()}`;
      chatStore.addMessage({
        id: messageId,
        platform: 'local',
        senderName: actualSender,
        senderId: current.id,
        senderRole: current.role,
        senderDivision: current.division,
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
        senderId: current.id,
        senderName: actualSender,
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
  function sendTextMessage(content: string, senderName?: string) {
    const text = content.trim();
    if (!text) return;

    const current = stakeholderStore.currentUser;
    const actualSender = senderName || `${current.name} (${current.role})`;
    const timestamp = formatTime();
    const messageId = `m-${Date.now()}`;

    chatStore.addMessage({
      id: messageId,
      platform: 'local',
      senderName: actualSender,
      senderId: current.id,
      senderRole: current.role,
      senderDivision: current.division,
      isSelf: true,
      content: text,
      messageType: 'text',
      timestamp,
    });

    const transport = getTransportService(settingStore.networkMode);
    transport.broadcastMessage({
      id: messageId,
      senderId: current.id,
      senderName: actualSender,
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
