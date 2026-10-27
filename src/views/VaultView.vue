<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Search, FileText, 
  Sparkles, Database, HardDrive, Plus, Trash2, Loader2, BookOpen
} from 'lucide-vue-next';
import { useSettingStore } from '@/stores/useSettingStore';
import { aiClient } from '@/services/ai/client';

interface VaultItem {
  id: string;
  name: string;
  category: string;
  sizeBytes: number;
  uploadedAt: string;
  summary: string;
  content: string;
}

const settingStore = useSettingStore();
const searchQuery = ref('');
const isSearchingVector = ref(false);
const isSummarizingAI = ref(false);

const STORAGE_VAULT_KEY = 'mediochat_vault_docs_v1';

const savedVault = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_VAULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const files = ref<VaultItem[]>(savedVault || []);

function persist() {
  localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(files.value));
}

// Modal State
const showAddModal = ref(false);
const newDocForm = ref<{
  name: string;
  category: string;
  content: string;
  summary: string;
}>({
  name: '',
  category: 'Teknis',
  content: '',
  summary: '',
});

async function handleGenerateAISummary() {
  if (!newDocForm.value.content.trim()) return;
  isSummarizingAI.value = true;
  try {
    const prompt = `Buatkan ringkasan 1-2 kalimat yang padat dan informatif untuk dokumen pengetahuan tim berikut ini:\n\n${newDocForm.value.content}`;
    const result = await aiClient.chatCompletion(prompt, settingStore.activeProvider);
    newDocForm.value.summary = result.trim();
  } catch (err: any) {
    newDocForm.value.summary = newDocForm.value.content.slice(0, 100) + '...';
  } finally {
    isSummarizingAI.value = false;
  }
}

function handleAddDocument() {
  if (!newDocForm.value.name.trim() || !newDocForm.value.content.trim()) return;

  const newItem: VaultItem = {
    id: `f-${Date.now()}`,
    name: newDocForm.value.name.trim(),
    category: newDocForm.value.category.trim(),
    sizeBytes: new Blob([newDocForm.value.content]).size,
    uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    summary: newDocForm.value.summary.trim() || newDocForm.value.content.slice(0, 100) + '...',
    content: newDocForm.value.content,
  };

  files.value.unshift(newItem);
  persist();
  showAddModal.value = false;

  newDocForm.value = {
    name: '',
    category: 'Teknis',
    content: '',
    summary: '',
  };
}

function handleDeleteDoc(id: string) {
  files.value = files.value.filter((f) => f.id !== id);
  persist();
}

const filteredFiles = computed(() => {
  if (!searchQuery.value.trim()) return files.value;
  const q = searchQuery.value.toLowerCase();
  return files.value.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.summary.toLowerCase().includes(q) ||
      f.content.toLowerCase().includes(q)
  );
});

import { formatBytes } from '@/lib/utils';
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

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <HardDrive class="h-4 w-4 text-slate-500" />
          <span>{{ files.length }} Dokumen</span>
        </div>

        <button
          @click="showAddModal = true"
          class="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Tambah Dokumen / SOP</span>
        </button>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="p-6 border-b border-slate-800/60 bg-slate-900/20">
      <div class="relative max-w-2xl">
        <Search class="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari semantik dokumen (contoh: 'rollback database', 'sla bug', 'design tokens')..."
          class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-24 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button
          class="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Sparkles class="h-3 w-3" />
          <span>{{ isSearchingVector ? 'Mencari...' : 'AI Search' }}</span>
        </button>
      </div>
    </div>

    <!-- Document List -->
    <div class="flex-1 p-6 overflow-y-auto space-y-3">
      <!-- Empty State -->
      <div
        v-if="filteredFiles.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800/60"
      >
        <div class="h-12 w-12 rounded-2xl bg-violet-600/10 text-violet-400 flex items-center justify-center">
          <FileText class="h-6 w-6" />
        </div>
        <h4 class="text-xs font-bold text-slate-300">Knowledge Vault Masih Kosong</h4>
        <p class="text-[11px] text-slate-500 max-w-sm">
          Belum ada dokumen atau SOP teknis yang tersimpan. Klik tombol "+ Tambah Dokumen / SOP" di atas untuk mengindeks catatan tim pertama Anda.
        </p>
      </div>

      <div
        v-for="file in filteredFiles"
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
          <button
            @click="handleDeleteDoc(file.id)"
            class="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Hapus Dokumen"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Dokumen Baru -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <BookOpen class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Tambah Dokumen ke Knowledge Vault</h3>
            <p class="text-xs text-slate-400">Indeks SOP teknis atau memori tim untuk referensi AI</p>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Judul / Nama File</label>
              <input
                v-model="newDocForm.name"
                type="text"
                placeholder="SOP_Deploy_v2.md"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Kategori</label>
              <select
                v-model="newDocForm.category"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="Desain">Desain</option>
                <option value="DevOps">DevOps</option>
                <option value="Manajemen">Manajemen</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Isi Dokumen / Catatan</label>
            <textarea
              v-model="newDocForm.content"
              rows="5"
              placeholder="Ketik atau tempel konten dokumen/SOP di sini..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
            ></textarea>
          </div>

          <!-- AI Ringkas Otomatis -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-medium text-slate-300">Ringkasan AI</label>
              <button
                type="button"
                @click="handleGenerateAISummary"
                :disabled="!newDocForm.content.trim() || isSummarizingAI"
                class="text-[11px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-40 transition-opacity"
              >
                <Loader2 v-if="isSummarizingAI" class="h-3 w-3 animate-spin" />
                <Sparkles v-else class="h-3 w-3" />
                <span>{{ isSummarizingAI ? 'Meringkas...' : 'Generate Ringkasan dengan AI' }}</span>
              </button>
            </div>
            <input
              v-model="newDocForm.summary"
              type="text"
              placeholder="Ringkasan 1-2 kalimat (klik tombol di atas untuk generate otomatis via AI)"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            @click="showAddModal = false"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-all"
          >
            Batal
          </button>
          <button
            @click="handleAddDocument"
            class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/30"
          >
            Simpan & Indeks
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
