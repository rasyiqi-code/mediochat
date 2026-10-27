import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage } from '@/types';

const STORAGE_CHAT_KEY = 'mediochat_messages_v1';

export const useChatStore = defineStore('chat', () => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_CHAT_KEY);
      if (!raw) return [];
      const parsed: ChatMessage[] = JSON.parse(raw);
      // Auto-purge any leftover legacy dummy messages
      const cleaned = parsed.filter(
        (m) =>
          m.id !== 'm1' &&
          m.id !== 'm2' &&
          !m.senderName.includes('Andi (Backend') &&
          !m.senderName.includes('Budi (Project')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  })();

  const messages = ref<ChatMessage[]>(saved);

  const isRecording = ref(false);
  const recordingDuration = ref(0);
  let recordTimer: any = null;

  function persist() {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages.value));
    } catch (e) {
      console.warn('Gagal menyimpan chat ke storage:', e);
    }
  }

  function startRecording() {
    isRecording.value = true;
    recordingDuration.value = 0;
    recordTimer = setInterval(() => {
      recordingDuration.value++;
    }, 1000);
  }

  function stopRecording(): number {
    isRecording.value = false;
    clearInterval(recordTimer);
    const duration = recordingDuration.value;
    recordingDuration.value = 0;
    return duration;
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg);
    persist();
  }

  function deleteMessage(messageId: string) {
    messages.value = messages.value.filter((m) => m.id !== messageId);
    persist();
  }

  function clearMessages() {
    messages.value = [];
    persist();
  }

  return {
    messages,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    addMessage,
    deleteMessage,
    clearMessages,
  };
});
