<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  Flame, RefreshCw, Copy, Check, Share2, 
  SendHorizontal, Calendar, FolderPlus, 
  HelpCircle, UserCheck, MapPin, Clock, AlertTriangle, Wrench
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
const isAnalyzing = ref(false);
const isCopied = ref(false);
const isSavedToVault = ref(false);
const sendStatus = ref<{ target: string; message: string; success: boolean } | null>(null);

const rawAnalysis = ref('');

function setDateOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  selectedDate.value = d.toISOString().slice(0, 10);
  handleAnalyze5W1H();
}

async function handleAnalyze5W1H() {
  isAnalyzing.value = true;
  sendStatus.value = null;
  try {
    const chatLog = chatStore.messages.map((m) => {
      const sender = m.senderName;
      const role = m.senderRole ? ` (${m.senderRole})` : '';
      return `[${m.timestamp}] [${m.platform.toUpperCase()}] ${sender}${role}: ${m.content}${m.aiRelayBriefing ? `\n   ↳ AI Relay: ${m.aiRelayBriefing}` : ''}`;
    }).join('\n');

    const tasksLog = taskStore.tasks.map((t) => {
      return `- [${t.status.toUpperCase()}] [${t.divisi.toUpperCase()}] ${t.deskripsi} (PIC: ${t.assigneeName || 'Unassigned'}, Prioritas: ${t.prioritas}, Deadline: ${t.deadline || 'N/A'})`;
    }).join('\n');

    const prompt = `Anda adalah Senior Intelligence Analyst tim. Analisis seluruh obrolan dan tugas hari ini (${selectedDate.value}) menggunakan metodologi 5W1H (Things That Matter) untuk menyaring keputusan krusial, blocker, dan prioritas penting dalam Bahasa Indonesia.

Log Chat Hari Ini:
${chatLog || '(Tidak ada log obrolan hari ini)'}

Daftar Kartu Tugas Sprint:
${tasksLog || '(Belum ada kartu tugas)'}

Format Laporan:
# 🔥 Things That Matter (Laporan 5W1H Tim - ${selectedDate.value})

### 1. WHAT (Apa yang Paling Krusial Hari Ini?)
(Jelaskan keputusan teknis kunci, perbaikan bug, atau instruksi prioritas yang muncul)

### 2. WHO (Siapa yang Terlibat & Bertanggung Jawab?)
(Sebutkan stakeholder yang meminta, personil yang ditugaskan, dan siapa yang menunggu hasil kerja)

### 3. WHERE (Di Mana Kanal & Titik Eksekusi?)
(Platform komunikasi yang digunakan dan repositori/layanan/sistem yang menjadi fokus)

### 4. WHEN (Kapan Target & Batas Waktu Penting?)
(Tenggat waktu/deadline eksplisit yang disebutkan atau disepakati)

### 5. WHY (Mengapa Hal Ini Mendesak / Mengapa Keputusan Diambil?)
(Latar belakang urgensi, dampak bila tertunda, atau alasan strategi teknis)

### 6. HOW (Bagaimana Langkah Tindak Lanjut & Solusinya?)
(Rencana aksi konkret bagi tim untuk menyelesaikannya secara efektif)

Kembalikan laporan dalam format Markdown yang rapi dengan heading dan bullet points.`;

    try {
      const result = await aiClient.chatCompletion(prompt, settingStore.activeProvider);
      rawAnalysis.value = result.trim();
    } catch (err: any) {
      console.warn('AI remote failed, falling back to local 5W1H engine:', err);
      rawAnalysis.value = generateLocal5W1H();
    }
  } catch (err: any) {
    rawAnalysis.value = generateLocal5W1H();
  } finally {
    isAnalyzing.value = false;
  }
}

function generateLocal5W1H(): string {
  const tasks = taskStore.tasks;
  const messages = chatStore.messages;
  const urgentTasks = tasks.filter(t => t.prioritas === 'tinggi');
  const activeTasks = tasks.filter(t => t.status !== 'done');

  let report = `# 🔥 Things That Matter (Laporan 5W1H Tim - ${selectedDate.value})\n\n`;
  report += `> 💡 *Laporan ini dianalisis secara instan oleh Engine Lokal berdasarkan data aktivitas aktual.*\n\n`;

  report += `### 1. WHAT (Apa yang Paling Krusial Hari Ini?)\n`;
  if (messages.length > 0) {
    report += `- Aktivitas komunikasi: **${messages.length} pesan** terkoordinasi di feed tim hari ini.\n`;
  }
  if (urgentTasks.length > 0) {
    report += `- Fokus paling krusial adalah penyelesaian tugas berprioritas tinggi:\n`;
    urgentTasks.forEach(t => report += `  - **${t.deskripsi}** pada divisi **${t.divisi.toUpperCase()}**\n`);
  } else if (activeTasks.length > 0) {
    report += `- Eksekusi sprint aktif sebanyak **${activeTasks.length} tugas** yang saat ini sedang dalam progres.\n`;
  } else {
    report += `- Koordinasi umum dan persiapan sprint mendatang. Belum ada insiden atau blocker kritis.\n`;
  }

  report += `\n### 2. WHO (Siapa yang Terlibat & Bertanggung Jawab?)\n`;
  const assignees = Array.from(new Set(activeTasks.map(t => t.assigneeName).filter(Boolean)));
  if (assignees.length > 0) {
    report += `- Personil yang memegang tanggung jawab aktif:\n`;
    assignees.forEach(name => report += `  - **${name}**\n`);
  } else {
    report += `- Seluruh personil tim yang terdaftar dalam direktori stakeholder.\n`;
  }

  report += `\n### 3. WHERE (Di Mana Kanal & Titik Eksekusi?)\n`;
  const divisions = Array.from(new Set(activeTasks.map(t => t.divisi.toUpperCase())));
  if (divisions.length > 0) {
    report += `- Titik kerja & divisi yang terdampak: **${divisions.join(', ')}**\n`;
  } else {
    report += `- Universal Chat Feed dan Papan Kanban MedioChat.\n`;
  }

  report += `\n### 4. WHEN (Kapan Target & Batas Waktu Penting?)\n`;
  const deadlines = activeTasks.filter(t => t.deadline).map(t => `${t.deskripsi} (Deadline: ${t.deadline})`);
  if (deadlines.length > 0) {
    deadlines.slice(0, 3).forEach(d => report += `- ⏰ ${d}\n`);
  } else {
    report += `- Target penyelesaian disesuaikan dengan siklus sprint mingguan tim.\n`;
  }

  report += `\n### 5. WHY (Mengapa Hal Ini Mendesak / Mengapa Keputusan Diambil?)\n`;
  if (urgentTasks.length > 0) {
    report += `- Keterlambatan pada tugas-tugas prioritas tinggi ini berisiko menghambat deliverable divisi terkait.\n`;
  } else {
    report += `- Menjaga konsistensi alur kerja dan meminimalisir miskomunikasi antar stakeholder.\n`;
  }

  report += `\n### 6. HOW (Bagaimana Langkah Tindak Lanjut & Solusinya?)\n`;
  report += `- Pastikan setiap PIC memperbarui status tugas di papan Kanban segera setelah pekerjaan selesai.\n`;
  report += `- Koordinasikan kendala teknis secara langsung melalui feed chat atau PTT voice memo.\n`;

  return report;
}

async function handleCopy() {
  if (!rawAnalysis.value) return;
  await navigator.clipboard.writeText(rawAnalysis.value);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 2000);
}

function handleSaveToVault() {
  if (!rawAnalysis.value) return;
  try {
    const raw = localStorage.getItem('mediochat_vault_docs_v1');
    const docs = raw ? JSON.parse(raw) : [];
    const newDoc = {
      id: `ttm-${Date.now()}`,
      name: `Things_That_Matter_${selectedDate.value}.md`,
      category: 'Laporan',
      sizeBytes: new Blob([rawAnalysis.value]).size,
      uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      summary: `Analisis intelijen 5W1H hal-hal penting tim tanggal ${selectedDate.value}.`,
      content: rawAnalysis.value,
    };
    docs.unshift(newDoc);
    localStorage.setItem('mediochat_vault_docs_v1', JSON.stringify(docs));
    isSavedToVault.value = true;
    setTimeout(() => (isSavedToVault.value = false), 3000);
  } catch (e) {
    console.error('Gagal menyimpan ke Vault:', e);
  }
}

async function handleForwardToTelegram() {
  if (!rawAnalysis.value) return;
  const res = await platformStore.sendTelegramMessage(rawAnalysis.value);
  sendStatus.value = { target: 'Telegram', message: res.message, success: res.success };
}

async function handleForwardToSlack() {
  if (!rawAnalysis.value) return;
  const res = await platformStore.sendSlackMessage(rawAnalysis.value);
  sendStatus.value = { target: 'Slack', message: res.message, success: res.success };
}

onMounted(() => {
  handleAnalyze5W1H();
});
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
    <!-- Header (Aligned h-16 Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white shrink-0 select-none">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Things That Matter (5W1H Intelligence)</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#FDA4AF] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            Penting & Krusial
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
          @click="handleAnalyze5W1H"
          :disabled="isAnalyzing"
          class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/80 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw class="h-3.5 w-3.5 stroke-[2.5]" :class="{ 'animate-spin': isAnalyzing }" />
          <span>{{ isAnalyzing ? 'Menganalisis 5W1H...' : 'Analisis Ulang' }}</span>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6 w-full">
      <!-- 1. 5W1H Pillar Badges Overview -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div class="p-3 rounded-xl bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <HelpCircle class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">WHAT</span>
          <span class="text-[9px] font-bold text-black/70">Aksi & Keputusan</span>
        </div>
        <div class="p-3 rounded-xl bg-[#7DD3FC] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <UserCheck class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">WHO</span>
          <span class="text-[9px] font-bold text-black/70">PIC Penanggung Jawab</span>
        </div>
        <div class="p-3 rounded-xl bg-[#C4B5FD] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <MapPin class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">WHERE</span>
          <span class="text-[9px] font-bold text-black/70">Kanal & Titik Aksi</span>
        </div>
        <div class="p-3 rounded-xl bg-[#BBF7D0] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <Clock class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">WHEN</span>
          <span class="text-[9px] font-bold text-black/70">Batas Deadline</span>
        </div>
        <div class="p-3 rounded-xl bg-[#FECDD3] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <AlertTriangle class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">WHY</span>
          <span class="text-[9px] font-bold text-black/70">Urgensi & Alasan</span>
        </div>
        <div class="p-3 rounded-xl bg-[#FED7AA] border-2 border-black shadow-[2px_2px_0px_#000] text-center">
          <Wrench class="h-4 w-4 mx-auto stroke-[2.5] mb-1" />
          <span class="text-[10px] font-black uppercase block">HOW</span>
          <span class="text-[9px] font-bold text-black/70">Solusi & Tindak Lanjut</span>
        </div>
      </div>

      <!-- 2. Forwarding Status Alert -->
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

      <!-- 3. 5W1H Report Container -->
      <div class="p-6 rounded-2xl bg-white border-3 border-black shadow-[5px_5px_0px_#000] space-y-4">
        <div class="flex items-center justify-between pb-3 border-b-2 border-black">
          <div class="flex items-center gap-2.5">
            <div class="h-9 w-9 rounded-xl bg-[#FDA4AF] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Flame class="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-xs font-black text-black">Hasil Analisis Intelijen 5W1H</h3>
              <p class="text-[11px] font-medium text-black/60">Disaring dari obrolan feed & task kanban aktif</p>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <button
              @click="handleCopy"
              class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Salin isi analisis ke clipboard"
            >
              <Check v-if="isCopied" class="h-3.5 w-3.5 stroke-[3] text-emerald-600" />
              <Copy v-else class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{{ isCopied ? 'Tersalin!' : 'Salin Teks' }}</span>
            </button>

            <button
              @click="handleSaveToVault"
              class="px-3 py-1.5 rounded-xl bg-[#FEF08A] hover:bg-[#FFE600] text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              title="Simpan dokumen 5W1H ini ke Knowledge Vault"
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

        <!-- Content Viewer -->
        <div v-if="isAnalyzing" class="py-16 flex flex-col items-center justify-center space-y-3">
          <RefreshCw class="h-8 w-8 stroke-[2.5] animate-spin text-black" />
          <p class="text-xs font-black text-black">Mengekstrak poin-poin 5W1H penting dari percakapan...</p>
        </div>

        <div v-else class="p-4 rounded-xl bg-[#FFFDF5] border-2 border-black shadow-[2px_2px_0px_#000]">
          <pre class="font-sans whitespace-pre-wrap text-xs text-black font-semibold leading-relaxed">{{ rawAnalysis }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
