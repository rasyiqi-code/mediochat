<script setup lang="ts">
import { ref } from 'vue';
import { 
  Sparkles, Clock, Mic, Square, Loader2, ArrowRight, 
  Trash2, User, CheckCircle2, Bot, Target, Quote
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
const { isProcessing: isMediating, mediateCommunication } = useAICoordinator();

const inputText = ref('');
const isRecording = ref(false);
const recordingDuration = ref(0);
const liveTranscript = ref('');
let recordInterval: any = null;

async function handleSend() {
  if (!inputText.value.trim() || isMediating.value) return;
  const textToSend = inputText.value;
  inputText.value = '';
  try {
    await mediateCommunication(textToSend, false);
  } catch (err: any) {
    console.error('Gagal mediasi AI:', err);
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
    if (audioRes.transcript && audioRes.transcript.trim()) {
      await mediateCommunication(audioRes.transcript, true);
      inputText.value = '';
    }
  } catch (err) {
    console.warn('Stop recording note:', err);
  }
}

function getIntentBadge(intent?: string) {
  switch (intent) {
    case 'request_data':
      return { label: 'Permintaan Data', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'task_instruction':
      return { label: 'Instruksi Tugas', class: 'bg-violet-500/10 text-violet-400 border-violet-500/30' };
    case 'status_update':
      return { label: 'Update Status', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'confirmation_needed':
      return { label: 'Butuh Konfirmasi', class: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    default:
      return { label: 'Informasi Tim', class: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
  }
}

function getUrgencyBadge(urgency?: string) {
  switch (urgency) {
    case 'segera':
      return { label: 'Segera', class: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    case 'santai':
      return { label: 'Santai', class: 'bg-slate-800 text-slate-400 border-slate-700' };
    default:
      return { label: 'Normal', class: 'bg-slate-800 text-slate-300 border-slate-700' };
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
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium flex items-center gap-1">
            <Bot class="h-3 w-3 text-violet-400" />
            Human → AI → Human Relay
          </span>
        </h2>
        <p class="text-xs text-slate-400">
          Setiap pesan dianalisis dan disampaikan oleh AI Coordinator untuk meminimalkan beban kognitif tim
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Active User Profile Indicator -->
        <router-link
          to="/team"
          class="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors"
          title="Klik untuk melihat atau mengganti profil stakeholder aktif"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span class="text-slate-400 text-[10px]">Operator:</span>
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
          <Bot class="h-6 w-6" />
        </div>
        <h4 class="text-xs font-bold text-slate-300">Belum Ada Komunikasi Tim</h4>
        <p class="text-[11px] text-slate-500 max-w-sm">
          Ketik pesan instruksi atau gunakan tombol Push-to-Talk (PTT). AI Coordinator akan menganalisis kebutuhan Anda dan menyampaikannya ke rekan tim terkait.
        </p>
      </div>

      <!-- Human - AI - Human Communication Cards -->
      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="w-full max-w-3xl mx-auto group relative space-y-2"
      >
        <!-- AI Relay Dispatch Card -->
        <div
          class="bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-violet-500/30 hover:border-violet-500/50 rounded-2xl p-4 shadow-xl shadow-violet-950/20 transition-all space-y-3.5"
        >
          <!-- Card Top Bar: AI Relay Identity & Meta Badges -->
          <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div class="flex items-center gap-2">
              <div class="h-6 w-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-600/30">
                <Bot class="h-3.5 w-3.5 text-white" />
              </div>
              <span class="text-xs font-bold text-violet-300 tracking-tight">MedioAI Coordinator</span>
              <span class="text-[10px] font-mono text-slate-500">• {{ msg.timestamp }}</span>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- Intent Badge -->
              <span
                v-if="msg.intentType"
                :class="['text-[9px] font-bold uppercase px-2 py-0.5 rounded border', getIntentBadge(msg.intentType).class]"
              >
                {{ getIntentBadge(msg.intentType).label }}
              </span>

              <!-- Urgency Badge -->
              <span
                v-if="msg.urgency"
                :class="['text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border', getUrgencyBadge(msg.urgency).class]"
              >
                {{ getUrgencyBadge(msg.urgency).label }}
              </span>

              <!-- Delete Button -->
              <button
                @click="chatStore.deleteMessage(msg.id)"
                class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-all"
                title="Hapus pesan ini"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </div>

          <!-- PRIMARY AI VOICE: The AI speaking to recipient human -->
          <div class="space-y-1.5">
            <p class="text-[13px] text-white font-medium leading-relaxed bg-violet-950/20 border border-violet-500/20 rounded-xl p-3 shadow-inner">
              "{{ msg.aiRelayBriefing || msg.summary || msg.content }}"
            </p>
          </div>

          <!-- Communication Context: Pengirim & Target Stakeholder -->
          <div class="flex flex-wrap items-center gap-2 text-[11px] pt-1">
            <!-- Pengirim Asli -->
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
              <User class="h-3 w-3 text-slate-400" />
              <span class="text-slate-500">Dari:</span>
              <span class="font-semibold text-slate-200">{{ msg.senderName }}</span>
              <span v-if="msg.senderRole" class="text-slate-500 text-[10px]">({{ msg.senderRole }})</span>
            </div>

            <!-- Target Stakeholders -->
            <div
              v-if="msg.targetStakeholders && msg.targetStakeholders.length"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
            >
              <Target class="h-3 w-3 text-violet-400" />
              <span class="text-slate-500">Ditujukan ke:</span>
              <span class="font-semibold text-violet-300">{{ msg.targetStakeholders.join(', ') }}</span>
            </div>
          </div>

          <!-- Decomposed Task Cards (if any sprint tasks generated) -->
          <div v-if="msg.tasks && msg.tasks.length" class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Tugas Aksi yang Diekstrak & Diteruskan ke Kanban ({{ msg.tasks.length }}):
              </span>
              <router-link
                to="/board"
                class="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
              >
                <span>Buka Kanban</span>
                <ArrowRight class="h-3 w-3" />
              </router-link>
            </div>

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

          <!-- Verbatim Quote (Teks asli human pengirim) -->
          <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Quote class="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div class="min-w-0">
              <span class="text-[10px] uppercase font-bold text-slate-500 block">Kutipan Asli Pengirim:</span>
              <p class="italic text-slate-300 truncate">
                "{{ msg.transcription || msg.content }}"
              </p>
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
        <span>Selesai Bicara & Mediasi AI</span>
      </button>
    </div>

    <!-- Bottom Input Bar -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
      <!-- Active User Context Line -->
      <div class="mb-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
        <span class="flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Bicara sebagai:</span>
          <span class="text-slate-200 font-semibold">{{ stakeholderStore.currentUser.name }}</span>
          <span class="text-slate-500">({{ stakeholderStore.currentUser.role }})</span>
        </span>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-violet-400 font-mono flex items-center gap-1">
            <Sparkles class="h-3 w-3" />
            AI Mediation Pipeline Aktif
          </span>
          <router-link to="/team" class="text-slate-400 hover:text-white text-[10px] underline">
            Ganti Profil
          </router-link>
        </div>
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
            placeholder="Ketik instruksi, kebutuhan data, atau update status (AI akan memediasi ke tim)..."
            class="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <!-- Send Button with AI Mediation -->
        <button
          type="submit"
          :disabled="!inputText.trim() || isMediating"
          class="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 flex-shrink-0"
        >
          <Loader2 v-if="isMediating" class="h-3.5 w-3.5 animate-spin" />
          <Bot v-else class="h-3.5 w-3.5" />
          <span>{{ isMediating ? 'Memediasi...' : 'Kirim via AI Relay' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
