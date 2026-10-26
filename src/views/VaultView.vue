<script setup lang="ts">
import { ref } from 'vue';
import { 
  Search, FileText, Download, 
  ExternalLink, Sparkles, Database, HardDrive
} from 'lucide-vue-next';
import type { VaultFile } from '@/types';

const searchQuery = ref('');
const isSearchingVector = ref(false);

const files = ref<VaultFile[]>([
  {
    id: 'f-1',
    name: 'SOP_Backend_Deploy_v2.pdf',
    category: 'Dokumen_Teknis',
    sizeBytes: 1024 * 1024 * 2.4,
    uploadedAt: '24 Okt 2026',
    summary: 'Panduan deployment staging, env key setup, dan rollback procedure PostgreSQL.',
  },
  {
    id: 'f-2',
    name: 'UI_Design_System_DarkTheme.fig',
    category: 'Desain',
    sizeBytes: 1024 * 1024 * 14.8,
    uploadedAt: '25 Okt 2026',
    summary: 'Komponen tombol, badge, color palette violet, dan typography Inter.',
  },
  {
    id: 'f-3',
    name: 'Perjanjian_Kerjasama_Klien_Q4.pdf',
    category: 'Kontrak',
    sizeBytes: 1024 * 780,
    uploadedAt: '22 Okt 2026',
    summary: 'Deliverables proyek, jadwal termin pembayaran, dan batasan SLA tim.',
  },
]);

function triggerSemanticSearch() {
  if (!searchQuery.value.trim()) return;
  isSearchingVector.value = true;
  setTimeout(() => {
    isSearchingVector.value = false;
  }, 600);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Knowledge Vault Lokal</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            sqlite-vec (Offline RAG)
          </span>
        </h2>
        <p class="text-xs text-slate-400">File dan memori tim terindeks secara semantik langsung di disk PC Anda</p>
      </div>

      <div class="flex items-center gap-2 text-xs text-slate-400">
        <HardDrive class="h-4 w-4 text-slate-500" />
        <span>Penyimpanan Lokal: 3 Dokumen (~18 MB)</span>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="p-6 border-b border-slate-800/60 bg-slate-900/20">
      <div class="relative max-w-2xl">
        <Search class="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
        <input
          v-model="searchQuery"
          @keydown.enter="triggerSemanticSearch"
          type="text"
          placeholder="Cari semantik isi dokumen (misal: 'SOP rollback database' atau 'termin kontrak')..."
          class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-24 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button
          @click="triggerSemanticSearch"
          class="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Sparkles class="h-3 w-3" />
          <span>{{ isSearchingVector ? 'Mencari...' : 'AI Search' }}</span>
        </button>
      </div>
    </div>

    <!-- Document List -->
    <div class="flex-1 p-6 overflow-y-auto space-y-3">
      <div
        v-for="file in files"
        :key="file.id"
        class="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-violet-500/40 transition-all flex items-start justify-between group shadow-sm"
      >
        <div class="flex items-start gap-3.5">
          <div class="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText class="h-5 w-5" />
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                {{ file.name }}
              </h4>
              <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {{ file.category }}
              </span>
            </div>
            <p class="text-xs text-slate-400 max-w-xl leading-relaxed">
              {{ file.summary }}
            </p>
            <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
              <span>{{ formatBytes(file.sizeBytes) }}</span>
              <span>•</span>
              <span>Diunggah {{ file.uploadedAt }}</span>
              <span>•</span>
              <span class="text-emerald-400/90 flex items-center gap-1">
                <Database class="h-3 w-3" />
                Vektor Terindeks
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Buka Dokumen">
            <ExternalLink class="h-3.5 w-3.5" />
          </button>
          <button class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Download">
            <Download class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
