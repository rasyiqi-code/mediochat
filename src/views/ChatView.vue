<script setup lang="ts">
import { ref } from 'vue';
import { 
  Sparkles, Mic, Square, Loader2, MessageSquare, 
  Trash2, Bot, CheckCheck, Send
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/useChatStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { productionAudioRecorder } from '@/services/audio/recorder';
import { useAICoordinator } from '@/composables/useAICoordinator';

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

function cleanBriefingText(briefing?: string, content?: string): string {
  let text = (briefing || content || '').trim();
  const prefixMatch = text.match(/^([A-Za-z\s]+)\s*\([^)]*\)\s*(?:menginformasikan|mengabarkan):\s*["']?(.*)$/i);
  if (prefixMatch) {
    const sender = prefixMatch[1].trim();
    const senderFirst = sender.split(' ')[0] || sender;
    const rest = prefixMatch[2].replace(/["']$/g, '').trim();
    text = `Halo tim! Si ${senderFirst} bilang gini: ${rest}`;
  }
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (text.toLowerCase() === 'halo' || text.toLowerCase() === 'hai') {
    return 'Halo! Ada tugas atau koordinasi yang mau disampaikan ke tim hari ini?';
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
            Telegram-Style AI Relay
          </span>
        </h2>
        <p class="text-xs text-slate-400">
          Human ➔ AI Personal Assistant ➔ Human
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

    <!-- Telegram-Style Chat Messages Stream -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      <div class="max-w-3xl mx-auto w-full space-y-4">
        <!-- Empty State -->
        <div
          v-if="chatStore.messages.length === 0"
          class="h-full flex flex-col items-center justify-center py-24 text-center space-y-3"
        >
          <div class="h-12 w-12 rounded-2xl bg-violet-600/10 text-violet-400 flex items-center justify-center">
            <MessageSquare class="h-6 w-6" />
          </div>
          <h4 class="text-xs font-bold text-slate-300">Belum Ada Percakapan Tim</h4>
          <p class="text-[11px] text-slate-500 max-w-sm">
            Ketik kebutuhan kerja di bawah (misal: <span class="text-violet-300 font-mono">tolong @dimas siapkan UI-nya</span>). AI Asisten Pribadi di sebelah kiri akan langsung mengabarkan ke personil terkait.
          </p>
        </div>

        <!-- Message Item Loop -->
        <template v-for="msg in chatStore.messages" :key="msg.id">
          <!-- 1. BUBBLE KANAN: What the active user said (Telegram Outgoing Bubble) -->
          <div v-if="msg.isSelf" class="flex justify-end w-full group">
            <div class="relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%]">
              <!-- Outgoing bubble -->
              <div class="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 shadow-md shadow-violet-900/20">
                <p class="text-[13px] leading-relaxed break-words whitespace-pre-wrap">{{ msg.content }}</p>
                <div class="flex items-center justify-end gap-1 mt-1 text-[10px] text-violet-200/80 select-none">
                  <span>{{ msg.timestamp }}</span>
                  <CheckCheck class="h-3.5 w-3.5 text-violet-200" />
                </div>
              </div>

              <!-- Delete message button on hover -->
              <button
                @click="chatStore.deleteMessage(msg.id)"
                class="opacity-0 group-hover:opacity-100 absolute -left-7 top-2 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                title="Hapus pesan ini"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- 2. BUBBLE KIRI: AI Personal Assistant Speaking Directly to Recipient/Team (Telegram Incoming Bubble) -->
          <div class="flex items-start gap-2.5 w-full group">
            <!-- AI Assistant Avatar on the Left -->
            <div class="relative flex-shrink-0 mt-0.5">
              <div class="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
                <Bot class="h-4 w-4" />
              </div>
              <div class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                <Sparkles class="h-2 w-2 text-violet-400" />
              </div>
            </div>

            <!-- Incoming bubble -->
            <div class="relative max-w-[88%] sm:max-w-[75%] md:max-w-[70%]">
              <div class="bg-slate-900/90 border border-slate-800/80 rounded-2xl rounded-tl-xs px-4 py-3 shadow-md shadow-black/20 space-y-2">
                <!-- Bubble Header -->
                <div class="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[11px] font-bold text-violet-300 flex items-center gap-1">
                      <span>MedioAI Asisten</span>
                    </span>
                    <span v-if="!msg.isSelf" class="text-[10px] text-slate-400">
                      • dari {{ cleanSenderName(msg.senderName) }}
                    </span>
                    <span
                      v-if="getIntentBadge(msg.intentType)"
                      :class="['text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border', getIntentBadge(msg.intentType)!.class]"
                    >
                      {{ getIntentBadge(msg.intentType)!.label }}
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-500 font-mono">{{ msg.timestamp }}</span>
                </div>

                <!-- AI Speech: Directly saying "si A butuh ini...", "si A minta kamu siap ini...", etc. -->
                <p class="text-[13px] text-slate-100 leading-relaxed font-normal">
                  {{ cleanBriefingText(msg.aiRelayBriefing, msg.content) }}
                </p>

                <!-- Verbatim note for incoming peer messages -->
                <p
                  v-if="!msg.isSelf && msg.content && msg.content.trim().toLowerCase() !== cleanBriefingText(msg.aiRelayBriefing, msg.content).trim().toLowerCase()"
                  class="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5"
                >
                  <span class="text-slate-500 text-[10px]">Pesan asal:</span>
                  <span class="italic text-slate-400 truncate max-w-sm">"{{ msg.content }}"</span>
                </p>


              </div>

              <!-- Delete button on incoming bubble if not self -->
              <button
                v-if="!msg.isSelf"
                @click="chatStore.deleteMessage(msg.id)"
                class="opacity-0 group-hover:opacity-100 absolute -right-7 top-2 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                title="Hapus pesan ini"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </template>
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

    <!-- Bottom Input Bar (Telegram-Style) -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
      <div class="max-w-3xl mx-auto w-full">
        <!-- Active User Context Line -->
        <div class="mb-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 flex-wrap">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Bicara sebagai:</span>
            <span class="text-slate-200 font-semibold">{{ stakeholderStore.currentUser.name }}</span>
            <span class="text-slate-500">({{ stakeholderStore.currentUser.role }})</span>
            <span class="text-slate-600 font-mono">➔</span>
            <span class="text-violet-400 font-medium">Asisten AI meneruskan ke tim</span>
          </span>
          <router-link to="/team" class="text-violet-400 hover:text-violet-300 text-[10px] font-medium underline flex-shrink-0 ml-2">
            Ganti Profil
          </router-link>
        </div>

        <form @submit.prevent="handleSend" class="flex items-center gap-2">
          <!-- Push-to-Talk Mic Button -->
          <button
            type="button"
            @click="isRecording ? stopMicRecording() : startMicRecording()"
            :class="[
              'h-11 w-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0',
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/80'
            ]"
            :title="isRecording ? 'Hentikan Rekaman' : 'Mulai Rekam Suara (PTT)'"
          >
            <Square v-if="isRecording" class="h-4 w-4" />
            <Mic v-else class="h-4 w-4" />
          </button>

          <!-- Telegram-Style Input Field -->
          <div class="relative flex-1">
            <input
              v-model="inputText"
              type="text"
              placeholder="Tulis pesan atau instruksi kerja (misal: tolong @dimas siapkan UI-nya)..."
              class="w-full bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <!-- Telegram-Style Send Button -->
          <button
            type="submit"
            :disabled="!inputText.trim() || isMediating"
            class="h-11 px-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 flex-shrink-0"
          >
            <Loader2 v-if="isMediating" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            <span class="hidden sm:inline">{{ isMediating ? 'Memproses...' : 'Kirim' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
