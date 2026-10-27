<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  RefreshCw, Copy, Check, Share2, 
  Calendar, FolderPlus, Sparkles, MessageSquare, 
  CheckCircle2, Clock, Mic, SendHorizontal
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/useChatStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { usePlatformStore } from '@/stores/usePlatformStore';
import { aiClient } from '@/services/ai/client';

const chatStore = useChatStore();
const taskStore = useTaskStore();
const settingStore = useSettingStore();
const platformStore = usePlatformStore();

const selectedDate = ref(new Date().toISOString().slice(0, 10));
const isGenerating = ref(false);
const isCopied = ref(false);
const isSavedToVault = ref(false);
const sendStatus = ref<{ target: string; message: string; success: boolean } | null>(null);

const generatedReport = ref('');

// Kanban statistics
const todoTasks = computed(() => taskStore.tasks.filter((t) => t.status === 'todo').length);
const inProgressTasks = computed(() => taskStore.tasks.filter((t) => t.status === 'in_progress').length);
const doneTasks = computed(() => taskStore.tasks.filter((t) => t.status === 'done').length);
const totalVoiceNotes = computed(() => {
  return chatStore.messages.filter((m) => m.messageType === 'voice_processed').length;
});

function setDateOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  selectedDate.value = d.toISOString().slice(0, 10);
  generatedReport.value = '';
}

async function handleGenerateReport() {
  isGenerating.value = true;
  sendStatus.value = null;
  try {
    const chatLog = chatStore.messages.map((m) => {
      const sender = m.senderName;
      const role = m.senderRole ? ` (${m.senderRole})` : '';
      return `[${m.timestamp}] ${sender}${role}: ${m.content}${m.aiRelayBriefing ? `\n   ↳ AI Relay: ${m.aiRelayBriefing}` : ''}`;
    }).join('\n');

    const tasksLog = taskStore.tasks.map((t) => {
      return `- [${t.status.toUpperCase()}] [${t.divisi.toUpperCase()}] ${t.deskripsi} (PIC: ${t.assigneeName || 'Unassigned'}, Prioritas: ${t.prioritas})`;
    }).join('\n');

    const prompt = `Anda adalah Asisten Eksekutif & AI Project Manager. Buatkan laporan aktivitas harian tim (Daily Standup & Progress Report) untuk tanggal ${selectedDate.value} dalam format Markdown yang terstruktur, padat, dan profesional dalam Bahasa Indonesia.

Data Percakapan Feed Hari Ini:
${chatLog || '(Tidak ada obrolan teks hari ini)'}

Daftar Kartu Tugas Kanban:
${tasksLog || '(Belum ada tugas tercatat)'}

Format Laporan:
## 📊 Ringkasan Aktivitas Tim (${selectedDate.value})
### 1. Poin Utama & Keputusan Kunci
(Rangkum 2-4 hal terpenting yang dibahas atau diputuskan hari ini)

### 2. Progres Tugas & Sprint
- **Selesai (${doneTasks.value} tugas)**: (Sebutkan tugas yang selesai)
- **Sedang Dikerjakan (${inProgressTasks.value} tugas)**: (Sebutkan fokus aktif)
- **Antrean Tugas (${todoTasks.value} tugas)**: (Sebutkan tugas yang belum disentuh)

### 3. Masalah / Kendala / Blocker
(Identifikasi apakah ada kendala teknis atau kebutuhan yang tertahan)

### 4. Rencana & Prioritas Berikutnya
(Saran langkah prioritas untuk tim besok)`;

    try {
      const result = await aiClient.chatCompletion(prompt, settingStore.activeProvider);
      generatedReport.value = result.trim();
    } catch (err: any) {
      console.warn('AI remote failed, falling back to local synthesis engine:', err);
      generatedReport.value = generateLocalDailyReport();
    }
  } catch (err: any) {
    generatedReport.value = generateLocalDailyReport();
  } finally {
    isGenerating.value = false;
  }
}

function generateLocalDailyReport(): string {
  const tasks = taskStore.tasks;
  const messages = chatStore.messages;
  const done = tasks.filter(t => t.status === 'done');
  const inProg = tasks.filter(t => t.status === 'in_progress');
  const todo = tasks.filter(t => t.status === 'todo');

  let report = `## 📊 Ringkasan Aktivitas Tim (${selectedDate.value})\n\n`;
  report += `> 💡 *Laporan ini disintesis secara instan oleh Engine Lokal berdasarkan data percakapan feed dan status papan Kanban.*\n\n`;

  report += `### 1. Poin Utama & Aktivitas Kunci\n`;
  if (messages.length > 0) {
    report += `- Teridentifikasi **${messages.length} pesan percakapan** antar personil tim pada feed universal.\n`;
    const recent = messages.slice(-3);
    for (const m of recent) {
      report += `- **${m.senderName}**: "${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}"\n`;
    }
  } else {
    report += `- Belum ada pesan komunikasi baru yang tercatat untuk tanggal ini.\n`;
  }

  report += `\n### 2. Progres Tugas & Sprint\n`;
  report += `- **Selesai (${done.length} tugas)**:\n`;
  if (done.length > 0) {
    done.forEach(t => report += `  - ✅ [${t.divisi.toUpperCase()}] ${t.deskripsi} (PIC: ${t.assigneeName || 'Tim'})\n`);
  } else {
    report += `  - *(Belum ada tugas yang berstatus selesai hari ini)*\n`;
  }

  report += `- **Sedang Dikerjakan (${inProg.length} tugas)**:\n`;
  if (inProg.length > 0) {
    inProg.forEach(t => report += `  - ⏳ [${t.divisi.toUpperCase()}] ${t.deskripsi} (PIC: ${t.assigneeName || 'Tim'}, Deadline: ${t.deadline || 'Besok'})\n`);
  } else {
    report += `  - *(Tidak ada tugas yang sedang aktif berjalan)*\n`;
  }

  report += `- **Antrean Tugas (${todo.length} tugas)**:\n`;
  if (todo.length > 0) {
    todo.forEach(t => report += `  - 📌 [${t.divisi.toUpperCase()}] ${t.deskripsi} (PIC: ${t.assigneeName || 'Unassigned'})\n`);
  } else {
    report += `  - *(Antrean tugas kosong)*\n`;
  }

  report += `\n### 3. Masalah / Kendala / Blocker\n`;
  const highPriority = tasks.filter(t => t.prioritas === 'tinggi' && t.status !== 'done');
  if (highPriority.length > 0) {
    report += `- ⚠️ Ditemukan **${highPriority.length} tugas prioritas tinggi** yang membutuhkan perhatian tim:\n`;
    highPriority.forEach(t => report += `  - **${t.deskripsi}** (PIC: ${t.assigneeName || 'Unassigned'})\n`);
  } else {
    report += `- Tidak ada blocker kritis yang tercatat saat ini. Semua alur tugas berjalan terkoordinasi.\n`;
  }

  report += `\n### 4. Rencana & Prioritas Berikutnya\n`;
  if (inProg.length > 0) {
    report += `- Fokus utama tim adalah menyelesaikan ${inProg.length} tugas yang sedang berlangsung.\n`;
  } else if (todo.length > 0) {
    report += `- Mulai ambil tugas dari kolom Todo untuk menjaga kelancaran sprint tim.\n`;
  } else {
    report += `- Terus jaga koordinasi dan perbarui status pekerjaan di papan Kanban.\n`;
  }

  return report;
}

async function handleCopy() {
  if (!generatedReport.value) return;
  await navigator.clipboard.writeText(generatedReport.value);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 2000);
}

function handleSaveToVault() {
  if (!generatedReport.value) return;
  try {
    const raw = localStorage.getItem('mediochat_vault_docs_v1');
    const docs = raw ? JSON.parse(raw) : [];
    const newDoc = {
      id: `rep-${Date.now()}`,
      name: `Laporan_Harian_${selectedDate.value}.md`,
      category: 'Laporan',
      sizeBytes: new Blob([generatedReport.value]).size,
      uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      summary: `Rekap harian aktivitas tim tanggal ${selectedDate.value}.`,
      content: generatedReport.value,
    };
    docs.unshift(newDoc);
    localStorage.setItem('mediochat_vault_docs_v1', JSON.stringify(docs));
    isSavedToVault.value = true;
    setTimeout(() => (isSavedToVault.value = false), 3000);
  } catch (e) {
    console.error('Gagal menyimpan laporan ke Vault:', e);
  }
}

async function handleForwardToTelegram() {
  if (!generatedReport.value) return;
  const res = await platformStore.sendTelegramMessage(generatedReport.value);
  sendStatus.value = { target: 'Telegram', message: res.message, success: res.success };
}

async function handleForwardToSlack() {
  if (!generatedReport.value) return;
  const res = await platformStore.sendSlackMessage(generatedReport.value);
  sendStatus.value = { target: 'Slack', message: res.message, success: res.success };
}

onMounted(() => {
  handleGenerateReport();
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
    <!-- Header (Aligned h-16 Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white shrink-0 select-none">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Laporan Harian (Daily Reports)</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#FFE600] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            AI Summary
          </span>
        </h2>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="setDateOffset(0)"
          :class="[
            'px-2.5 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_#000]',
            selectedDate === new Date().toISOString().slice(0, 10)
              ? 'bg-[#FFE600] text-black'
              : 'bg-white hover:bg-slate-50 text-black'
          ]"
        >
          Hari Ini
        </button>
        <button
          @click="setDateOffset(-1)"
          class="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer"
        >
          Kemarin
        </button>
        <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFFDF5] border-2 border-black shadow-[2px_2px_0px_#000]">
          <Calendar class="h-3.5 w-3.5 stroke-[2.5]" />
          <input
            v-model="selectedDate"
            type="date"
            class="bg-transparent text-xs font-black text-black focus:outline-none"
          />
        </div>
        <button
          @click="handleGenerateReport"
          :disabled="isGenerating"
          class="px-3.5 py-1.5 rounded-xl bg-[#86EFAC] hover:bg-[#86EFAC]/80 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw class="h-3.5 w-3.5 stroke-[2.5]" :class="{ 'animate-spin': isGenerating }" />
          <span>{{ isGenerating ? 'Menganalisis...' : 'Analisis Ulang' }}</span>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6 w-full">
      <!-- 1. Metrics Grid (Ghost-Relay Style) -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Messages Count -->
        <div class="p-4 rounded-2xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-black/60 uppercase block">Total Pesan</span>
            <span class="text-2xl font-black text-black">{{ chatStore.messages.length }}</span>
            <div class="text-[10px] font-bold text-black/60 mt-0.5">Percakapan tim</div>
          </div>
          <div class="h-10 w-10 rounded-xl bg-[#7DD3FC] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <MessageSquare class="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        <!-- Voice Notes -->
        <div class="p-4 rounded-2xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-black/60 uppercase block">Voice Note</span>
            <span class="text-2xl font-black text-black">{{ totalVoiceNotes }}</span>
            <div class="text-[10px] font-bold text-black/60 mt-0.5">Ditranskrip AI</div>
          </div>
          <div class="h-10 w-10 rounded-xl bg-[#C4B5FD] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Mic class="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        <!-- In Progress Tasks -->
        <div class="p-4 rounded-2xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-black/60 uppercase block">Sprint Aktif</span>
            <span class="text-2xl font-black text-black">{{ inProgressTasks }}</span>
            <div class="text-[10px] font-bold text-black/60 mt-0.5">{{ todoTasks }} antrean tugas</div>
          </div>
          <div class="h-10 w-10 rounded-xl bg-[#FEF08A] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Clock class="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>

        <!-- Done Tasks -->
        <div class="p-4 rounded-2xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-black/60 uppercase block">Task Selesai</span>
            <span class="text-2xl font-black text-black">{{ doneTasks }}</span>
            <div class="text-[10px] font-bold text-black/60 mt-0.5">Tuntas dirampungkan</div>
          </div>
          <div class="h-10 w-10 rounded-xl bg-[#86EFAC] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <CheckCircle2 class="h-5 w-5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      <!-- 2. Forwarding Status Alert (if sent to Telegram/Slack) -->
      <div
        v-if="sendStatus"
        :class="[
          'p-3.5 rounded-xl text-xs font-black flex items-center justify-between border-2 border-black shadow-[3px_3px_0px_#000]',
          sendStatus.success ? 'bg-[#BBF7D0] text-black' : 'bg-[#FECDD3] text-black'
        ]"
      >
        <div class="flex items-center gap-2">
          <span>{{ sendStatus.target }}: {{ sendStatus.message }}</span>
        </div>
        <button @click="sendStatus = null" class="text-sm font-black p-0.5 cursor-pointer">&times;</button>
      </div>

      <!-- 3. AI Generated Report Container -->
      <div class="p-6 rounded-2xl bg-white border-3 border-black shadow-[5px_5px_0px_#000] space-y-4">
        <div class="flex items-center justify-between pb-3 border-b-2 border-black">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Sparkles class="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-xs font-black text-black">Hasil Laporan Eksekutif Harian</h3>
              <p class="text-[11px] font-medium text-black/60">Disintesis otomatis oleh model {{ settingStore.activeProvider.selectedModel }}</p>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <button
              @click="handleCopy"
              class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Salin isi laporan ke clipboard"
            >
              <Check v-if="isCopied" class="h-3.5 w-3.5 stroke-[3] text-emerald-600" />
              <Copy v-else class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{{ isCopied ? 'Tersalin!' : 'Salin Teks' }}</span>
            </button>

            <button
              @click="handleSaveToVault"
              class="px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FFE600] text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Simpan dokumen ini ke Knowledge Vault"
            >
              <FolderPlus class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{{ isSavedToVault ? 'Tersimpan di Vault!' : 'Simpan ke Vault' }}</span>
            </button>

            <!-- Forward to Telegram -->
            <button
              v-if="platformStore.telegram.botToken"
              @click="handleForwardToTelegram"
              class="px-3 py-1.5 rounded-xl bg-[#7DD3FC] hover:bg-[#38BDF8] text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Teruskan laporan ini ke grup Telegram"
            >
              <SendHorizontal class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Kirim ke Telegram</span>
            </button>

            <!-- Forward to Slack -->
            <button
              v-if="platformStore.slack.webhookUrl"
              @click="handleForwardToSlack"
              class="px-3 py-1.5 rounded-xl bg-[#C4B5FD] hover:bg-[#A78BFA] text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Teruskan laporan ini ke channel Slack"
            >
              <Share2 class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Kirim ke Slack</span>
            </button>
          </div>
        </div>

        <!-- Report Content Viewer -->
        <div v-if="isGenerating" class="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw class="h-8 w-8 stroke-[2.5] animate-spin text-black" />
          <p class="text-xs font-black text-black">Menganalisis log percakapan dan kartu tugas tim...</p>
        </div>

        <div v-else class="p-4 rounded-xl bg-[#FFFDF5] border-2 border-black shadow-[2px_2px_0px_#000] prose prose-sm max-w-none">
          <pre class="font-sans whitespace-pre-wrap text-xs text-black font-semibold leading-relaxed">{{ generatedReport }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
