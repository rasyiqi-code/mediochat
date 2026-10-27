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
      return { label: 'Butuh Data', class: 'bg-[#FEF08A] text-black border-1.5 border-black font-black shadow-[1px_1px_0px_#000]' };
    case 'task_instruction':
      return { label: 'Tugas Sprint', class: 'bg-[#C4B5FD] text-black border-1.5 border-black font-black shadow-[1px_1px_0px_#000]' };
    case 'status_update':
      return { label: 'Update Status', class: 'bg-[#86EFAC] text-black border-1.5 border-black font-black shadow-[1px_1px_0px_#000]' };
    case 'confirmation_needed':
      return { label: 'Konfirmasi', class: 'bg-[#FDA4AF] text-black border-1.5 border-black font-black shadow-[1px_1px_0px_#000]' };
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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] text-black font-sans">
    <!-- Top Header (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white select-none">
      <div>
        <h2 class="text-sm font-black text-black">Universal Team Feed</h2>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Active User Profile Pill -->
        <router-link
          to="/team"
          class="px-3 py-1.5 rounded-xl text-xs bg-[#FEF08A] hover:bg-[#FDE047] text-black border-2 border-black flex items-center gap-2 font-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          title="Klik untuk melihat atau mengganti profil stakeholder aktif"
        >
          <span class="h-2.5 w-2.5 rounded-full bg-[#22C55E] border border-black"></span>
          <span class="truncate max-w-[130px]">{{ stakeholderStore.currentUser.name }}</span>
          <span class="text-[10px] text-black/70">({{ stakeholderStore.currentUser.role }})</span>
        </router-link>

        <!-- Active AI Provider Badge -->
        <router-link
          to="/settings"
          class="px-2.5 py-1.5 rounded-xl text-xs font-mono font-black bg-[#A7F3D0] text-black border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Bot class="h-3.5 w-3.5 stroke-[2.5]" />
          <span>{{ settingStore.activeProvider.selectedModel }}</span>
        </router-link>

        <!-- Clear Feed Action -->
        <button
          v-if="chatStore.messages.length > 0"
          @click="chatStore.clearMessages()"
          class="px-2.5 py-1.5 rounded-xl text-xs text-black bg-white hover:bg-[#FDA4AF] border-2 border-black flex items-center gap-1.5 font-bold shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          title="Bersihkan riwayat percakapan"
        >
          <Trash2 class="h-3.5 w-3.5" />
          <span>Bersihkan Feed</span>
        </button>
      </div>
    </header>

    <!-- Telegram-Style Chat Messages Stream (Neobrutalism) -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      <div class="max-w-3xl mx-auto w-full space-y-4">
        <!-- Empty State (Neobrutalism) -->
        <div
          v-if="chatStore.messages.length === 0"
          class="h-full flex flex-col items-center justify-center py-20 text-center space-y-4"
        >
          <div class="h-16 w-16 rounded-2xl bg-[#FFE600] text-black border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_#000]">
            <MessageSquare class="h-8 w-8 stroke-[2.5]" />
          </div>

          <div class="space-y-1.5">
            <h4 class="text-base font-black text-black">Belum Ada Percakapan Tim</h4>
            <p class="text-xs font-bold text-black/60 max-w-md mx-auto">
              Ketik kebutuhan kerja di bawah. AI Asisten Pribadi akan otomatis meneruskannya secara natural ke personil terkait.
            </p>
          </div>

          <!-- Clickable Example Prompt Chips -->
          <div class="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              @click="inputText = 'tolong @dimas siapkan UI-nya'"
              class="px-3.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FFE600] text-black border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center gap-2"
              title="Klik untuk mengisi otomatis contoh ini"
            >
              <span class="text-[9px] uppercase font-sans font-black bg-black text-white px-1.5 py-0.5 rounded">Contoh</span>
              <span>"tolong @dimas siapkan UI-nya"</span>
            </button>
            <button
              @click="inputText = 'andi tolong cek endpoint auth login'"
              class="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF8F5] text-black border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center gap-2"
              title="Klik untuk mengisi otomatis contoh ini"
            >
              <span class="text-[9px] uppercase font-sans font-black bg-black text-white px-1.5 py-0.5 rounded">Contoh</span>
              <span>"andi tolong cek endpoint auth"</span>
            </button>
          </div>
        </div>

        <!-- Message Item Loop -->
        <template v-for="msg in chatStore.messages" :key="msg.id">
          <!-- 1. BUBBLE KANAN: What the active user said (Telegram Outgoing - Neobrutalism Yellow) -->
          <div v-if="msg.isSelf" class="flex justify-end w-full group">
            <div class="relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%]">
              <!-- Outgoing bubble -->
              <div class="bg-[#FFE600] text-black border-2 border-black rounded-2xl rounded-br-xs px-4 py-3 shadow-[3px_3px_0px_#000]">
                <p class="text-[13px] font-bold leading-relaxed break-words whitespace-pre-wrap">{{ msg.content }}</p>
                <div class="flex items-center justify-end gap-1 mt-1 text-[10px] text-black/75 font-mono font-black select-none">
                  <span>{{ msg.timestamp }}</span>
                  <CheckCheck class="h-3.5 w-3.5 text-black stroke-[2.5]" />
                </div>
              </div>

              <!-- Delete message button on hover -->
              <button
                @click="chatStore.deleteMessage(msg.id)"
                class="opacity-0 group-hover:opacity-100 absolute -left-8 top-2.5 bg-white text-black hover:bg-[#FDA4AF] border border-black p-1 rounded-md shadow-[1px_1px_0px_#000] transition-opacity"
                title="Hapus pesan ini"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- 2. BUBBLE KIRI: AI Personal Assistant Speaking (Telegram Incoming - Neobrutalism White Box) -->
          <div class="flex items-start gap-2.5 w-full group">
            <!-- AI Assistant Avatar on the Left -->
            <div class="relative flex-shrink-0 mt-0.5">
              <div class="h-9 w-9 rounded-xl bg-[#C4B5FD] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000]">
                <Bot class="h-5 w-5 stroke-[2.5]" />
              </div>
              <div class="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#FFE600] border border-black flex items-center justify-center shadow-[1px_1px_0px_#000]">
                <Sparkles class="h-2.5 w-2.5 text-black stroke-[2.5]" />
              </div>
            </div>

            <!-- Incoming bubble -->
            <div class="relative max-w-[88%] sm:max-w-[75%] md:max-w-[70%]">
              <div class="bg-white border-2 border-black rounded-2xl rounded-tl-xs px-4 py-3 shadow-[4px_4px_0px_#000] space-y-2">
                <!-- Bubble Header -->
                <div class="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-1.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FEF08A] text-black border-1.5 border-black shadow-[1px_1px_0px_#000]">
                      MedioAI Asisten
                    </span>
                    <span v-if="!msg.isSelf" class="text-[11px] font-black text-black">
                      • dari {{ cleanSenderName(msg.senderName) }}
                    </span>
                    <span
                      v-if="getIntentBadge(msg.intentType)"
                      :class="['text-[9px] uppercase px-1.5 py-0.2 rounded border', getIntentBadge(msg.intentType)!.class]"
                    >
                      {{ getIntentBadge(msg.intentType)!.label }}
                    </span>
                  </div>
                  <span class="text-[10px] text-black/60 font-mono font-bold">{{ msg.timestamp }}</span>
                </div>

                <!-- AI Speech: Directly saying "si A butuh ini...", "si A minta kamu siap ini...", etc. -->
                <p class="text-[13px] text-black leading-relaxed font-semibold">
                  {{ cleanBriefingText(msg.aiRelayBriefing, msg.content) }}
                </p>

                <!-- Knowledge Vault Citation Chips (RAG Context) -->
                <div
                  v-if="msg.vaultCitations && msg.vaultCitations.length > 0"
                  class="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-black/10"
                >
                  <span class="text-[10px] font-bold text-black/60">Referensi Vault:</span>
                  <router-link
                    v-for="cite in msg.vaultCitations"
                    :key="cite.id"
                    to="/vault"
                    class="px-2 py-0.5 rounded-md bg-[#FEF08A] hover:bg-[#FFE600] text-black border border-black text-[10px] font-mono font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000] active:translate-x-0.5 transition-all"
                    :title="cite.snippet || cite.name"
                  >
                    <span>📚</span>
                    <span class="truncate max-w-[150px]">{{ cite.name }}</span>
                  </router-link>
                </div>

                <!-- Verbatim note for incoming peer messages -->
                <p
                  v-if="!msg.isSelf && msg.content && msg.content.trim().toLowerCase() !== cleanBriefingText(msg.aiRelayBriefing, msg.content).trim().toLowerCase()"
                  class="text-[11px] text-black/70 flex items-center gap-1.5 pt-1 border-t border-black/10 font-mono"
                >
                  <span class="text-black/50 text-[10px] font-bold">Pesan asal:</span>
                  <span class="italic text-black truncate max-w-sm">"{{ msg.content }}"</span>
                </p>
              </div>

              <!-- Delete button on incoming bubble if not self -->
              <button
                v-if="!msg.isSelf"
                @click="chatStore.deleteMessage(msg.id)"
                class="opacity-0 group-hover:opacity-100 absolute -right-8 top-2.5 bg-white text-black hover:bg-[#FDA4AF] border border-black p-1 rounded-md shadow-[1px_1px_0px_#000] transition-opacity"
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
      class="px-6 py-2.5 bg-[#FF6B6B] border-t-3 border-black flex items-center justify-between text-xs text-black font-black"
    >
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
        </span>
        <span>Merekam Suara ({{ recordingDuration }}s)...</span>
        <span v-if="liveTranscript" class="text-black/80 italic text-[11px] truncate max-w-md bg-white/40 px-2 py-0.5 rounded border border-black">
          "{{ liveTranscript }}"
        </span>
      </div>

      <button
        @click="stopMicRecording"
        class="px-3 py-1 rounded-lg bg-black hover:bg-neutral-800 text-white font-black text-xs flex items-center gap-1 transition-all border border-black shadow-[2px_2px_0px_#fff]"
      >
        <Square class="h-3 w-3 fill-current" />
        <span>Selesai Bicara</span>
      </button>
    </div>

    <!-- Bottom Input Bar (Neobrutalism) -->
    <div class="p-4 border-t-3 border-black bg-[#FFFDF5]">
      <div class="max-w-3xl mx-auto w-full">
        <form @submit.prevent="handleSend" class="flex items-center gap-2.5">
          <!-- Push-to-Talk Mic Button -->
          <button
            type="button"
            @click="isRecording ? stopMicRecording() : startMicRecording()"
            :class="[
              'h-12 w-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border-2 border-black neo-btn',
              isRecording
                ? 'bg-[#FF4D4D] text-white shadow-[3px_3px_0px_#000] animate-pulse'
                : 'bg-[#C4B5FD] hover:bg-[#A78BFA] text-black shadow-[3px_3px_0px_#000]'
            ]"
            :title="isRecording ? 'Hentikan Rekaman' : 'Mulai Rekam Suara (PTT)'"
          >
            <Square v-if="isRecording" class="h-4.5 w-4.5 fill-current" />
            <Mic v-else class="h-5 w-5 stroke-[2.5]" />
          </button>

          <!-- Neobrutalist Input Field -->
          <div class="relative flex-1">
            <input
              v-model="inputText"
              type="text"
              placeholder="Tulis pesan atau instruksi kerja (misal: tolong @dimas siapkan UI-nya)..."
              class="w-full bg-white border-2 border-black rounded-xl px-4 py-3 text-xs text-black font-bold placeholder:text-black/40 shadow-[3px_3px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none transition-all"
            />
          </div>

          <!-- Neobrutalist Send Button -->
          <button
            type="submit"
            :disabled="!inputText.trim() || isMediating"
            class="h-12 px-5 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] disabled:opacity-40 text-black font-black text-xs flex items-center gap-2 border-2 border-black shadow-[3px_3px_0px_#000] neo-btn flex-shrink-0"
          >
            <Loader2 v-if="isMediating" class="h-4 w-4 animate-spin stroke-[2.5]" />
            <Send v-else class="h-4 w-4 stroke-[2.5]" />
            <span class="hidden sm:inline">{{ isMediating ? 'Memproses...' : 'Kirim' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
