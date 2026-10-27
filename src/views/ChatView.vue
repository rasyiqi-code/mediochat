<script setup lang="ts">
import { ref } from 'vue';
import { 
  Sparkles, Mic, Square, Loader2, ArrowRight, MessageSquare, 
  Trash2, Bot, Send
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
    console.error('Gagal mengirim pesan:', err);
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
      return { label: 'Butuh Data', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'task_instruction':
      return { label: 'Tugas Sprint', class: 'bg-violet-500/10 text-violet-400 border-violet-500/30' };
    case 'status_update':
      return { label: 'Update Status', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'confirmation_needed':
      return { label: 'Konfirmasi', class: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    default:
      return null;
  }
}

function cleanSenderName(name?: string): string {
  if (!name) return 'Rekan Tim';
  return name.replace(/\s*\([^)]*\)/g, '').trim() || 'Rekan Tim';
}

function cleanSenderRole(role?: string, name?: string): string {
  if (!role) return '';
  const clean = role.replace(/^\(/, '').replace(/\)$/, '').trim();
  if (name && name.toLowerCase().includes(clean.toLowerCase())) {
    return '';
  }
  return clean;
}

function cleanBriefingText(briefing?: string, content?: string): string {
  let text = (briefing || content || '').trim();
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (text.toLowerCase() === 'halo' || text.toLowerCase() === 'hai') {
    return 'Halo tim! Ada update apa untuk sprint hari ini?';
  }
  return text;
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
            <Sparkles class="h-3 w-3 text-violet-400" />
            AI Coordinator
          </span>
        </h2>
        <p class="text-xs text-slate-400">
          Komunikasi tim asinkron dengan koordinasi cerdas
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Active User Profile Pill -->
        <router-link
          to="/team"
          class="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800/80 hover:bg-slate-750 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors"
          title="Klik untuk melihat atau mengganti profil stakeholder aktif"
        >
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span class="font-semibold text-white truncate max-w-[130px]">{{ stakeholderStore.currentUser.name }}</span>
          <span class="text-[10px] text-slate-400">({{ stakeholderStore.currentUser.role }})</span>
        </router-link>

        <!-- Active AI Provider Badge -->
        <router-link
          to="/settings"
          class="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors"
        >
          <Bot class="h-3 w-3 text-violet-400" />
          <span>{{ settingStore.activeProvider.selectedModel }}</span>
        </router-link>

        <!-- Clear Feed Action -->
        <button
          v-if="chatStore.messages.length > 0"
          @click="chatStore.clearMessages()"
          class="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 flex items-center gap-1 transition-colors"
          title="Bersihkan riwayat percakapan"
        >
          <Trash2 class="h-3 w-3" />
          <span>Bersihkan Feed</span>
        </button>
      </div>
    </header>

    <!-- Chat Messages Stream -->
    <div class="flex-1 overflow-y-auto p-6 space-y-4">
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
          Ketik pesan instruksi sprint atau bicara via Push-to-Talk (PTT). AI Coordinator akan mengabarkan intisarinya ke rekan tim terkait.
        </p>
      </div>

      <!-- Natural Conversation Feed -->
      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 hover:border-slate-800 transition-all group max-w-3xl mx-auto w-full"
      >
        <!-- Sender Avatar -->
        <div class="relative flex-shrink-0 mt-0.5">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-violet-600/20">
            {{ cleanSenderName(msg.senderName).slice(0, 2).toUpperCase() }}
          </div>
          <div
            v-if="msg.messageType === 'ai_mediated' || msg.aiRelayBriefing"
            class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"
            title="Dikoordinasikan oleh AI Relay"
          >
            <Sparkles class="h-2.5 w-2.5 text-violet-400" />
          </div>
        </div>

        <!-- Message Body -->
        <div class="flex-1 min-w-0 space-y-2">
          <!-- Header Line: Name, Role Pill, Timestamp, Intent, Delete -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <span class="text-xs font-bold text-slate-100 truncate">
                {{ cleanSenderName(msg.senderName) }}
              </span>
              <span
                v-if="cleanSenderRole(msg.senderRole, msg.senderName)"
                class="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 truncate"
              >
                {{ cleanSenderRole(msg.senderRole, msg.senderName) }}
              </span>
              <span class="text-[10px] text-slate-500 font-mono flex-shrink-0">
                • {{ msg.timestamp }}
              </span>
              <span
                v-if="getIntentBadge(msg.intentType)"
                :class="['text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border flex-shrink-0', getIntentBadge(msg.intentType)!.class]"
              >
                {{ getIntentBadge(msg.intentType)!.label }}
              </span>
              <span class="text-[10px] text-violet-400/80 flex items-center gap-1 font-mono">
                <Sparkles class="h-2.5 w-2.5" />
                AI Relay
              </span>
            </div>

            <button
              @click="chatStore.deleteMessage(msg.id)"
              class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-all flex-shrink-0"
              title="Hapus pesan"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>

          <!-- Natural Message Text (No box, no quotes, natural reading) -->
          <p class="text-[13px] text-slate-100 leading-relaxed font-normal">
            {{ cleanBriefingText(msg.aiRelayBriefing, msg.content) }}
          </p>

          <!-- Voice Note Transcript (HANYA jika ada rekaman suara audio) -->
          <p
            v-if="msg.transcription"
            class="text-[11px] text-slate-400/90 flex items-center gap-1.5 pt-0.5"
          >
            <Mic class="h-3 w-3 text-violet-400 flex-shrink-0" />
            <span class="text-slate-500 text-[10px]">Transkrip suara:</span>
            <span class="italic text-slate-300">"{{ msg.transcription }}"</span>
          </p>

          <!-- Compact Kanban Tasks (Jika ada dekomposisi tugas aksi) -->
          <div
            v-if="msg.tasks && msg.tasks.length"
            class="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5"
          >
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span class="flex items-center gap-1.5">
                <Sparkles class="h-3 w-3 text-violet-400" />
                <span>{{ msg.tasks.length }} tugas sprint diteruskan ke Kanban:</span>
              </span>
              <router-link
                to="/board"
                class="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-0.5"
              >
                <span>Buka Board</span>
                <ArrowRight class="h-2.5 w-2.5" />
              </router-link>
            </div>

            <div class="space-y-1">
              <div
                v-for="task in msg.tasks"
                :key="task.id"
                class="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60"
              >
                <div class="flex items-center gap-2 truncate">
                  <span :class="['text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border flex-shrink-0', getDivisionBadge(task.divisi)]">
                    {{ task.divisi }}
                  </span>
                  <span class="text-slate-200 truncate font-medium">{{ task.deskripsi }}</span>
                </div>
                <span class="text-[10px] text-emerald-400 font-semibold flex-shrink-0 ml-3">
                  → {{ task.assigneeName || 'Tim' }}
                </span>
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
          <span>Bicara sebagai:</span>
          <span class="text-slate-200 font-semibold">{{ stakeholderStore.currentUser.name }}</span>
          <span class="text-slate-500">({{ stakeholderStore.currentUser.role }})</span>
        </span>
        <router-link to="/team" class="text-violet-400 hover:text-violet-300 text-[10px] font-medium underline">
          Ganti Profil
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
            placeholder="Ketik pesan atau instruksi sprint..."
            class="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <!-- Send Button -->
        <button
          type="submit"
          :disabled="!inputText.trim() || isMediating"
          class="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 flex-shrink-0"
        >
          <Loader2 v-if="isMediating" class="h-3.5 w-3.5 animate-spin" />
          <Send v-else class="h-3.5 w-3.5" />
          <span>{{ isMediating ? 'Memproses...' : 'Kirim' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
