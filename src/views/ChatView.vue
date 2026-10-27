<script setup lang="ts">
import { ref } from 'vue';
import { 
  Send, Sparkles, Clock, Mic, Square, Loader2, ArrowRight, MessageSquare, Trash2, User, CheckCircle2
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/useChatStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { productionAudioRecorder } from '@/services/audio/recorder';
import { useAICoordinator } from '@/composables/useAICoordinator';
import { getDivisionBadge } from '@/lib/utils';

const chatStore = useChatStore();
const settingStore = useSettingStore();
const stakeholderStore = useStakeholderStore();
const { isProcessing: isDecomposing, processTaskDecomposition, sendTextMessage } = useAICoordinator();

const inputText = ref('');
const isRecording = ref(false);
const recordingDuration = ref(0);
const liveTranscript = ref('');
let recordInterval: any = null;

function handleSend() {
  if (!inputText.value.trim()) return;
  sendTextMessage(inputText.value);
  inputText.value = '';
}

async function handleDecomposeWithAI() {
  if (!inputText.value.trim() || isDecomposing.value) return;
  try {
    await processTaskDecomposition(inputText.value);
    inputText.value = '';
  } catch (err: any) {
    console.error('Gagal dekomposisi:', err);
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

      <div class="flex items-center gap-2.5">
        <!-- Active User Profile Indicator -->
        <router-link
          to="/team"
          class="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors"
          title="Klik untuk melihat atau mengganti profil stakeholder aktif"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span class="text-slate-400 text-[10px]">Profil:</span>
          <span class="font-semibold text-white truncate max-w-[120px]">{{ stakeholderStore.currentUser.name }}</span>
        </router-link>

        <!-- Active AI Provider Badge -->
        <router-link
          to="/settings"
          class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors"
        >
          <Sparkles class="h-3 w-3 text-violet-400" />
          <span>{{ settingStore.activeProvider.name }}: {{ settingStore.activeProvider.selectedModel }}</span>
        </router-link>

        <!-- Clear Feed Action -->
        <button
          v-if="chatStore.messages.length > 0"
          @click="chatStore.clearMessages()"
          class="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center gap-1 transition-colors"
          title="Bersihkan semua pesan dalam feed"
        >
          <Trash2 class="h-3 w-3" />
          <span>Bersihkan Feed</span>
        </button>
      </div>
    </header>

    <!-- Chat Messages Stream -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Empty State -->
      <div
        v-if="chatStore.messages.length === 0"
        class="h-full flex flex-col items-center justify-center py-20 text-center space-y-3"
      >
        <div class="h-12 w-12 rounded-2xl bg-violet-600/10 text-violet-400 flex items-center justify-center">
          <MessageSquare class="h-6 w-6" />
        </div>
        <h4 class="text-xs font-bold text-slate-300">Belum Ada Percakapan Tim</h4>
        <p class="text-[11px] text-slate-500 max-w-sm">
          Ketik pesan instruksi sprint di bawah, atau tekan tombol mikrofon Push-to-Talk (PTT) untuk mendiktekan tugas ke AI.
        </p>
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        :class="['flex flex-col group relative', msg.isSelf ? 'items-end' : 'items-start']"
      >
        <!-- Sender Name, Role & Meta -->
        <div class="flex items-center gap-2 mb-1.5 px-1">
          <span class="text-xs font-semibold text-slate-300">{{ msg.senderName }}</span>
          <span v-if="msg.senderRole" class="text-[10px] text-violet-400 font-medium">
            • {{ msg.senderRole }}
          </span>
          <span class="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {{ msg.platform }}
          </span>
          <span class="text-[11px] text-slate-500">{{ msg.timestamp }}</span>

          <!-- Delete single message button -->
          <button
            @click="chatStore.deleteMessage(msg.id)"
            class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 rounded transition-all"
            title="Hapus pesan ini"
          >
            <Trash2 class="h-3 w-3" />
          </button>
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

          <!-- Decomposed Task Cards with Stakeholder Assignment -->
          <div v-if="msg.tasks && msg.tasks.length" class="space-y-2 pt-1 border-t border-slate-800/60">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Daftar Tugas yang Diekstrak & Dipetakan ke Stakeholder ({{ msg.tasks.length }}):
            </span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div
                v-for="task in msg.tasks"
                :key="task.id"
                class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
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

                <!-- Stakeholder Assigned Badge -->
                <div class="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span class="text-slate-500 flex items-center gap-1">
                    <User class="h-3 w-3 text-slate-400" />
                    <span>Ditugaskan:</span>
                  </span>
                  <span class="font-semibold text-emerald-400 flex items-center gap-1 truncate max-w-[130px]" :title="task.assigneeRole || ''">
                    <CheckCircle2 class="h-2.5 w-2.5" />
                    {{ task.assigneeName || 'Belum Ditugaskan' }}
                  </span>
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
      <!-- Active User Context Line -->
      <div class="mb-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
        <span class="flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Mengirim sebagai:</span>
          <span class="text-slate-200 font-semibold">{{ stakeholderStore.currentUser.name }}</span>
          <span class="text-slate-500">({{ stakeholderStore.currentUser.role }})</span>
        </span>
        <router-link to="/team" class="text-violet-400 hover:text-violet-300 text-[10px] font-medium underline">
          Ganti Profil Stakeholder
        </router-link>
      </div>

      <form @submit.prevent="handleSend" class="flex items-center gap-2.5">
        <!-- Push to talk mic button -->
        <button
          type="button"
          @click="isRecording ? stopMicRecording() : startMicRecording()"
          :class="[
            'h-10 w-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
            isRecording
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
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
          class="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-700 flex-shrink-0"
        >
          <Send class="h-3.5 w-3.5" />
          <span>Kirim</span>
        </button>
      </form>
    </div>
  </div>
</template>
