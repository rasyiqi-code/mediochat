<script setup lang="ts">
import { ref } from 'vue';
import { 
  Send, Sparkles, Clock, Mic, Square, Loader2, ArrowRight
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/useChatStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { aiClient } from '@/services/ai/client';
import { productionAudioRecorder } from '@/services/audio/recorder';
import type { Division, TaskItem } from '@/types';

const chatStore = useChatStore();
const taskStore = useTaskStore();
const settingStore = useSettingStore();

const inputText = ref('');
const isDecomposing = ref(false);
const isRecording = ref(false);
const recordingDuration = ref(0);
const liveTranscript = ref('');
let recordInterval: any = null;

function getDivisionColor(divisi: Division) {
  switch (divisi) {
    case 'backend': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'frontend': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'desain': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
    case 'qa': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'devops': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
}

function sendMessage() {
  if (!inputText.value.trim()) return;

  chatStore.addMessage({
    id: `m-${Date.now()}`,
    platform: 'local',
    senderName: 'Saya (Local PC)',
    senderId: 'self',
    isSelf: true,
    content: inputText.value,
    messageType: 'text',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  inputText.value = '';
}

async function handleDecomposeWithAI() {
  const text = inputText.value.trim();
  if (!text) return;

  isDecomposing.value = true;
  try {
    const result = await aiClient.decomposeTask(text, settingStore.activeProvider);

    const generatedTasks: TaskItem[] = result.daftar_tugas.map((t, idx) => ({
      id: `t-${Date.now()}-${idx}`,
      divisi: t.divisi,
      deskripsi: t.deskripsi,
      prioritas: t.prioritas,
      status: 'todo',
      deadline: result.tanggal_deadline || 'Besok',
      senderName: 'Saya (Voice/AI)',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    // 1. Add tasks to Kanban board
    for (const task of generatedTasks) {
      taskStore.addTask(task);
    }

    // 2. Add processed message to feed
    chatStore.addMessage({
      id: `m-${Date.now()}`,
      platform: 'local',
      senderName: 'Saya (Local PC)',
      senderId: 'self',
      isSelf: true,
      content: text,
      messageType: 'voice_processed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transcription: text,
      summary: result.ringkasan,
      tasks: generatedTasks,
    });

    inputText.value = '';
  } catch (err: any) {
    console.error('Gagal dekomposisi:', err);
  } finally {
    isDecomposing.value = false;
  }
}

async function startMicRecording() {
  try {
    isRecording.value = true;
    recordingDuration.value = 0;
    liveTranscript.value = '';
    recordInterval = setInterval(() => {
      recordingDuration.value++;
    }, 1000);

    await productionAudioRecorder.start(
      () => {},
      (transcript) => {
        liveTranscript.value = transcript;
        inputText.value = transcript;
      }
    );
  } catch (err: any) {
    alert(err.message || 'Gagal mengakses mikrofon.');
    stopMicRecording();
  }
}

async function stopMicRecording() {
  if (!isRecording.value) return;
  isRecording.value = false;
  clearInterval(recordInterval);

  try {
    const audioRes = await productionAudioRecorder.stop();
    if (audioRes.transcript) {
      inputText.value = audioRes.transcript;
    }
  } catch (err) {
    console.warn('Stop recording note:', err);
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950">
    <!-- Top Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Universal Team Feed</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            P2P Direct Sync
          </span>
        </h2>
        <p class="text-xs text-slate-400">Pesan dan voice note dari semua platform tim teragregasi secara lokal</p>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-400 mr-1">AI Aktif:</span>
        <router-link
          to="/settings"
          class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors"
        >
          <Sparkles class="h-3 w-3 text-violet-400" />
          <span>{{ settingStore.activeProvider.name }}: {{ settingStore.activeProvider.selectedModel }}</span>
        </router-link>
      </div>
    </header>

    <!-- Chat Messages Stream -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        :class="['flex flex-col', msg.isSelf ? 'items-end' : 'items-start']"
      >
        <!-- Sender Name & Meta -->
        <div class="flex items-center gap-2 mb-1.5 px-1">
          <span class="text-xs font-semibold text-slate-300">{{ msg.senderName }}</span>
          <span class="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {{ msg.platform }}
          </span>
          <span class="text-[11px] text-slate-500">{{ msg.timestamp }}</span>
        </div>

        <!-- Text Bubble -->
        <div
          v-if="msg.messageType === 'text'"
          :class="[
            'max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed',
            msg.isSelf
              ? 'bg-violet-600 text-white rounded-br-sm'
              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm'
          ]"
        >
          {{ msg.content }}
        </div>

        <!-- AI Voice Processed Card -->
        <div
          v-else-if="msg.messageType === 'voice_processed'"
          class="max-w-2xl w-full bg-slate-900/90 border border-violet-500/30 rounded-2xl p-4 shadow-xl shadow-violet-950/20 space-y-3"
        >
          <!-- Summary Header -->
          <div class="flex items-start gap-2.5">
            <div class="h-7 w-7 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles class="h-4 w-4" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-violet-300 tracking-tight">Dekomposisi Tugas AI</h4>
                <router-link
                  to="/board"
                  class="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
                >
                  <span>Lihat di Kanban</span>
                  <ArrowRight class="h-3 w-3" />
                </router-link>
              </div>
              <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                "{{ msg.summary }}"
              </p>
            </div>
          </div>

          <!-- Raw Transcript Dropdown/Quote -->
          <div v-if="msg.transcription" class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 italic">
            Transkrip: "{{ msg.transcription }}"
          </div>

          <!-- Decomposed Task Cards -->
          <div v-if="msg.tasks && msg.tasks.length" class="space-y-2 pt-1 border-t border-slate-800/60">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Daftar Tugas yang Diekstrak AI ({{ msg.tasks.length }}):
            </span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div
                v-for="task in msg.tasks"
                :key="task.id"
                class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionColor(task.divisi)]">
                      {{ task.divisi }}
                    </span>
                    <span class="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock class="h-3 w-3 text-slate-500" />
                      {{ task.deadline }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-200 font-medium leading-snug">
                    {{ task.deskripsi }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Recording Banner -->
    <div
      v-if="isRecording"
      class="px-6 py-2.5 bg-rose-950/50 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-200"
    >
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
        </span>
        <span class="font-semibold">Merekam Mikrofon ({{ recordingDuration }}s)...</span>
        <span v-if="liveTranscript" class="text-rose-300/80 italic text-[11px] truncate max-w-md">
          "{{ liveTranscript }}"
        </span>
      </div>

      <button
        @click="stopMicRecording"
        class="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 transition-all"
      >
        <Square class="h-3 w-3" />
        <span>Selesai Bicara</span>
      </button>
    </div>

    <!-- Bottom Input Bar -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
      <form @submit.prevent="sendMessage" class="flex items-center gap-2.5">
        <!-- Push to talk mic button -->
        <button
          type="button"
          @click="isRecording ? stopMicRecording() : startMicRecording()"
          :class="[
            'h-10 w-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
            isRecording
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          ]"
          :title="isRecording ? 'Hentikan Rekaman' : 'Mulai Rekam Suara (PTT)'"
        >
          <Square v-if="isRecording" class="h-4 w-4" />
          <Mic v-else class="h-4 w-4" />
        </button>

        <div class="relative flex-1">
          <input
            v-model="inputText"
            type="text"
            placeholder="Ketik instruksi sprint, perintah suara, atau pesan tim..."
            class="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <!-- AI Decompose Button -->
        <button
          type="button"
          @click="handleDecomposeWithAI"
          :disabled="!inputText.trim() || isDecomposing"
          class="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 flex-shrink-0"
        >
          <Loader2 v-if="isDecomposing" class="h-3.5 w-3.5 animate-spin" />
          <Sparkles v-else class="h-3.5 w-3.5" />
          <span>{{ isDecomposing ? 'Mendekomposisi...' : 'Dekomposisi AI' }}</span>
        </button>

        <!-- Send Button -->
        <button
          type="submit"
          :disabled="!inputText.trim()"
          class="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-700 flex-shrink-0"
        >
          <Send class="h-3.5 w-3.5" />
          <span>Kirim</span>
        </button>
      </form>
    </div>
  </div>
</template>
