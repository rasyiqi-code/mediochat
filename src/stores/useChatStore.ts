import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage } from '@/types';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([
    {
      id: 'm1',
      platform: 'local',
      senderName: 'Andi (Backend Lead)',
      senderId: 'user-1',
      isSelf: false,
      content: 'Server staging auth API sudah di-update ke versi terbaru ya guys.',
      messageType: 'text',
      timestamp: '09:30',
    },
    {
      id: 'm2',
      platform: 'telegram',
      senderName: 'Budi (Project Manager)',
      senderId: 'user-2',
      isSelf: false,
      content: 'Instruksi sprint hari ini: tim backend tolong siapkan endpoint migrasi database, dan frontend sesuaikan form onboarding.',
      messageType: 'voice_processed',
      timestamp: '10:15',
      transcription: 'Halo semuanya, instruksi sprint hari ini: tolong backend fokus selesaikan endpoint migrasi database PostgreSQL, dan frontend langsung sesuaikan form onboarding agar padding dan validasinya pas. Target selesai lusa ya.',
      summary: 'Instruksi tugas sprint: Backend fokus migrasi database PostgreSQL, Frontend sesuaikan form onboarding.',
      tasks: [
        {
          id: 't-1',
          divisi: 'backend',
          deskripsi: 'Selesaikan endpoint migrasi database PostgreSQL',
          prioritas: 'tinggi',
          status: 'todo',
          deadline: 'Besok, 17:00',
          senderName: 'Budi (PM)',
          timestamp: '10:15',
        },
        {
          id: 't-2',
          divisi: 'frontend',
          deskripsi: 'Sesuaikan form onboarding (padding & validasi input)',
          prioritas: 'sedang',
          status: 'in_progress',
          deadline: 'Lusa, 12:00',
          senderName: 'Budi (PM)',
          timestamp: '10:15',
        },
      ],
    },
  ]);

  const isRecording = ref(false);
  const recordingDuration = ref(0);
  let recordTimer: any = null;

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
  }

  return {
    messages,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    addMessage,
  };
});
