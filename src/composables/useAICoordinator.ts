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
   * Human -> AI -> Human Mediation Engine
   * Every communication (voice or text) from a human is analyzed and synthesized
   * by the AI Coordinator to brief recipient humans with context, intent, and actionable tasks.
   */
  async function mediateCommunication(
    rawText: string,
    isVoice: boolean = false,
    senderSource?: string
  ) {
    const text = rawText.trim();
    if (!text) throw new Error('Pesan komunikasi kosong');

    isProcessing.value = true;
    try {
      const activeProvider = settingStore.activeProvider;
      const current = stakeholderStore.currentUser;
      const cleanSender = senderSource
        ? senderSource.replace(/\s*\([^)]*\)/g, '').trim()
        : current.name;
      const senderDisplayName = cleanSender || current.name;

      const lowerText = text.toLowerCase().trim();
      const isCasual = ['halo', 'hai', 'pagi', 'selamat pagi', 'siang', 'malam', 'tes', 'test', 'ping'].includes(lowerText);

      // 0. Contextual Knowledge Vault Citation (RAG)
      const matchedCitations: { id: string; name: string; snippet?: string }[] = [];
      let vaultContext = '';
      try {
        const rawVault = localStorage.getItem('mediochat_vault_docs_v1');
        if (rawVault) {
          const docs = JSON.parse(rawVault);
          if (Array.isArray(docs) && docs.length > 0) {
            const queryWords = lowerText
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length >= 3 && !['dan', 'atau', 'yang', 'untuk', 'pada', 'tolong', 'siap', 'dong', 'bisa', 'buat', 'ini', 'itu'].includes(w));
            
            if (queryWords.length > 0) {
              const scoredDocs = docs.map((doc: any) => {
                let score = 0;
                const docText = `${doc.name} ${doc.category || ''} ${doc.summary || ''} ${doc.content || ''}`.toLowerCase();
                for (const word of queryWords) {
                  if (docText.includes(word)) score += 1;
                  if ((doc.name || '').toLowerCase().includes(word)) score += 2;
                }
                return { doc, score };
              }).filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score);

              if (scoredDocs.length > 0) {
                const top = scoredDocs.slice(0, 2);
                vaultContext = top.map(item => `Dokumen [${item.doc.name}] (Kategori: ${item.doc.category}): ${item.doc.summary || (item.doc.content || '').slice(0, 200)}...`).join('\n');
                top.forEach(item => {
                  matchedCitations.push({
                    id: item.doc.id,
                    name: item.doc.name,
                    snippet: item.doc.summary ? item.doc.summary.slice(0, 150) : (item.doc.content || '').slice(0, 150),
                  });
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Vault context lookup warning:', err);
      }

      // 1. Send to AI with Stakeholder Directory, Sender Identity, and Vault Context
      const result = await aiClient.decomposeTask(
        text,
        activeProvider,
        stakeholderStore.stakeholders,
        senderDisplayName,
        vaultContext
      );

      const timestamp = formatTime();

      // 2. Map Decomposed Tasks with Stakeholders (skip fake tasks if casual greeting or no tasks)
      const generatedTasks: TaskItem[] = isCasual
        ? []
        : (result.daftar_tugas || []).map((t, idx) => {
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
              senderName: senderDisplayName,
              timestamp,
              assigneeName: t.assignee_name || matchedStakeholder?.name || 'Belum Ditugaskan',
              assigneeRole: t.assignee_role || matchedStakeholder?.role || '',
              assigneeId: matchedStakeholder?.id,
            };
          });

      // 3. Add tasks to Kanban board
      for (const task of generatedTasks) {
        taskStore.addTask(task);
      }

      // 4. Natural AI Relay briefing
      const senderFirstName = senderDisplayName.split(' ')[0] || senderDisplayName;
      let aiRelayBriefing = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
      if (isCasual) {
        aiRelayBriefing = `Halo Mas ${senderFirstName}! Ada tugas atau koordinasi yang mau disampaikan ke tim hari ini?`;
      } else if (result.ai_relay_briefing && result.ai_relay_briefing.trim()) {
        aiRelayBriefing = result.ai_relay_briefing.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
        aiRelayBriefing = aiRelayBriefing.replace(/\s*\([^)]*\)\s*(menginformasikan|mengabarkan):/g, ' $1:');
      } else {
        aiRelayBriefing = `Halo tim! Si ${senderFirstName} bilang gini: ${text}`;
      }

      const messageId = `m-${Date.now()}`;

      // 5. Add AI-mediated message to Universal Feed
      chatStore.addMessage({
        id: messageId,
        platform: 'local',
        senderName: senderDisplayName,
        senderId: current.id,
        senderRole: current.role,
        senderDivision: current.division,
        isSelf: true,
        content: text,
        messageType: 'ai_mediated',
        timestamp,
        aiRelayBriefing,
        intentType: result.intent_type || 'general_info',
        targetStakeholders: result.target_stakeholders || ['Semua Tim'],
        urgency: result.urgency || 'normal',
        transcription: isVoice ? text : undefined,
        summary: result.ringkasan,
        tasks: generatedTasks,
        vaultCitations: matchedCitations.length > 0 ? matchedCitations : undefined,
      });

      // 6. Broadcast over P2P mesh
      const transport = getTransportService(settingStore.networkMode);
      transport.broadcastMessage({
        id: messageId,
        senderId: current.id,
        senderName: senderDisplayName,
        type: 'task_update',
        payload: {
          aiRelayBriefing,
          intentType: result.intent_type || 'general_info',
          targetStakeholders: result.target_stakeholders || ['Semua Tim'],
          urgency: result.urgency || 'normal',
          summary: result.ringkasan,
          tasks: generatedTasks,
          originalContent: text,
        },
        timestamp,
      }).catch((e) => console.warn('P2P broadcast note:', e));

      return {
        aiRelayBriefing,
        summary: result.ringkasan,
        tasks: generatedTasks,
      };
    } finally {
      isProcessing.value = false;
    }
  }

  /**
   * Process task decomposition (alias for mediateCommunication)
   */
  async function processTaskDecomposition(
    rawText: string,
    senderSource?: string,
    isVoice: boolean = false
  ) {
    return mediateCommunication(rawText, isVoice, senderSource);
  }

  /**
   * Send a text message (routed through AI mediation)
   */
  async function sendTextMessage(content: string, senderName?: string) {
    return mediateCommunication(content, false, senderName);
  }

  return {
    isProcessing,
    mediateCommunication,
    processTaskDecomposition,
    sendTextMessage,
  };
}
