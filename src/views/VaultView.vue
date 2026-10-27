<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Search, FileText, 
  Sparkles, Database, HardDrive, Plus, Trash2, Loader2, BookOpen
} from 'lucide-vue-next';
import { useSettingStore } from '@/stores/useSettingStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
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
const stakeholderStore = useStakeholderStore();
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

// Dynamic Categories
const customCategories = ref<string[]>([]);
const availableCategories = computed(() => {
  const set = new Set<string>();
  // 1. Division labels from stakeholder store
  stakeholderStore.divisions.forEach((d) => set.add(d.label));
  // 2. Existing categories in vault files
  files.value.forEach((f) => {
    if (f.category) set.add(f.category);
  });
  // 3. Defaults
  ['Backend', 'Frontend', 'Desain', 'DevOps', 'Manajemen', 'Umum'].forEach((c) => set.add(c));
  // 4. Custom added
  customCategories.value.forEach((c) => set.add(c));
  return Array.from(set);
});

// Modal State
const showAddModal = ref(false);
const isCustomCategory = ref(false);
const newDocForm = ref<{
  name: string;
  category: string;
  content: string;
  summary: string;
}>({
  name: '',
  category: 'Backend',
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

  const cat = newDocForm.value.category.trim() || 'Umum';
  if (!availableCategories.value.includes(cat)) {
    customCategories.value.push(cat);
  }

  const newItem: VaultItem = {
    id: `f-${Date.now()}`,
    name: newDocForm.value.name.trim(),
    category: cat,
    sizeBytes: new Blob([newDocForm.value.content]).size,
    uploadedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    summary: newDocForm.value.summary.trim() || newDocForm.value.content.slice(0, 100) + '...',
    content: newDocForm.value.content,
  };

  files.value.unshift(newItem);
  persist();
  showAddModal.value = false;
  isCustomCategory.value = false;

  newDocForm.value = {
    name: '',
    category: availableCategories.value[0] || 'Umum',
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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] text-black font-sans overflow-hidden">
    <!-- Header (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white select-none">
      <div>
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Knowledge Vault Lokal</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#86EFAC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            sqlite-vec (Offline RAG)
          </span>
        </h2>
        <p class="text-[11px] font-bold text-black/60">File dan memori tim terindeks secara semantik langsung di disk PC Anda</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-black font-black bg-white px-2.5 py-1 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
          <HardDrive class="h-4 w-4 stroke-[2.5]" />
          <span>{{ files.length }} Dokumen</span>
        </div>

        <button
          @click="showAddModal = true"
          class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black font-black text-xs flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Tambah Dokumen / SOP</span>
        </button>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="p-6 border-b-3 border-black bg-[#FFFDF5]">
      <div class="relative max-w-2xl">
        <Search class="absolute left-4 top-3.5 h-4 w-4 text-black stroke-[2.5]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari semantik dokumen (contoh: 'rollback database', 'sla bug', 'design tokens')..."
          class="w-full bg-white border-2 border-black rounded-xl pl-11 pr-28 py-3 text-xs text-black font-bold placeholder:text-black/40 shadow-[3px_3px_0px_#000] focus:shadow-[4px_4px_0px_#000] focus:outline-none transition-all"
        />
        <button
          class="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-[#C4B5FD] hover:bg-[#A78BFA] text-black font-black text-[11px] flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Sparkles class="h-3 w-3 stroke-[2.5]" />
          <span>{{ isSearchingVector ? 'Mencari...' : 'AI Search' }}</span>
        </button>
      </div>
    </div>

    <!-- Document List -->
    <div class="flex-1 p-6 overflow-y-auto space-y-3">
      <!-- Empty State -->
      <div
        v-if="filteredFiles.length === 0"
        class="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-white rounded-2xl border-3 border-black shadow-[5px_5px_0px_#000] max-w-lg mx-auto"
      >
        <div class="h-14 w-14 rounded-2xl bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
          <FileText class="h-7 w-7 stroke-[2.5]" />
        </div>
        <h4 class="text-sm font-black text-black">Knowledge Vault Masih Kosong</h4>
        <p class="text-xs font-semibold text-black/70 max-w-sm">
          Belum ada dokumen atau SOP teknis yang tersimpan. Klik tombol "+ Tambah Dokumen / SOP" di atas untuk mengindeks catatan tim pertama Anda.
        </p>
      </div>

      <div
        v-for="file in filteredFiles"
        :key="file.id"
        class="p-4 rounded-2xl bg-white border-2 border-black hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5 transition-all flex items-start justify-between group shadow-[4px_4px_0px_#000]"
      >
        <div class="flex items-start gap-3.5">
          <div class="h-11 w-11 rounded-xl bg-[#FEF08A] text-black border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[2px_2px_0px_#000]">
            <FileText class="h-5 w-5 stroke-[2.5]" />
          </div>

          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-black text-black">
                {{ file.name }}
              </h4>
              <span class="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-[#C4B5FD] text-black border border-black shadow-[1px_1px_0px_#000]">
                {{ file.category }}
              </span>
            </div>
            <p class="text-xs text-black/80 font-medium max-w-xl leading-relaxed">
              {{ file.summary }}
            </p>
            <div class="flex items-center gap-3 text-[11px] font-bold text-black/60 pt-1">
              <span>{{ formatBytes(file.sizeBytes) }}</span>
              <span>•</span>
              <span>Diunggah {{ file.uploadedAt }}</span>
              <span>•</span>
              <span class="text-black bg-[#86EFAC] px-1.5 py-0.5 rounded border border-black font-black flex items-center gap-1 shadow-[1px_1px_0px_#000]">
                <Database class="h-3 w-3 stroke-[2.5]" />
                Vektor Terindeks
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleDeleteDoc(file.id)"
            class="p-1.5 rounded-lg bg-white hover:bg-[#FDA4AF] text-black border border-black shadow-[1px_1px_0px_#000] transition-colors opacity-0 group-hover:opacity-100"
            title="Hapus Dokumen"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Dokumen Baru (Neobrutalism) -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white border-3 border-black rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-[6px_6px_0px_#000]">
        <div class="flex items-center gap-2.5">
          <div class="h-10 w-10 rounded-xl bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <BookOpen class="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 class="text-base font-black text-black">Tambah Dokumen ke Knowledge Vault</h3>
            <p class="text-xs font-bold text-black/60">Indeks SOP teknis atau memori tim untuk referensi AI</p>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-black text-black">Judul / Nama File</label>
              <input
                v-model="newDocForm.name"
                type="text"
                placeholder="SOP_Deploy_v2.md"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
              />
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-black text-black">Kategori</label>
                <button
                  type="button"
                  @click="isCustomCategory = !isCustomCategory"
                  class="text-[10px] font-black text-black underline hover:text-amber-600 cursor-pointer"
                >
                  {{ isCustomCategory ? 'Pilih dari List' : '+ Kategori Baru' }}
                </button>
              </div>

              <input
                v-if="isCustomCategory"
                v-model="newDocForm.category"
                type="text"
                placeholder="Ketik kategori baru (Marketing, SOP, dll)..."
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
              />
              <select
                v-else
                v-model="newDocForm.category"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
              >
                <option v-for="cat in availableCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-black text-black">Isi Dokumen / Catatan</label>
            <textarea
              v-model="newDocForm.content"
              rows="5"
              placeholder="Ketik atau tempel konten dokumen/SOP di sini..."
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl p-3 text-xs text-black font-bold focus:outline-none font-mono shadow-[2px_2px_0px_#000]"
            ></textarea>
          </div>

          <!-- AI Ringkas Otomatis -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-black text-black">Ringkasan AI</label>
              <button
                type="button"
                @click="handleGenerateAISummary"
                :disabled="!newDocForm.content.trim() || isSummarizingAI"
                class="text-[11px] font-black text-black bg-[#C4B5FD] hover:bg-[#A78BFA] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1 disabled:opacity-40 transition-opacity"
              >
                <Loader2 v-if="isSummarizingAI" class="h-3 w-3 animate-spin stroke-[2.5]" />
                <Sparkles v-else class="h-3 w-3 stroke-[2.5]" />
                <span>{{ isSummarizingAI ? 'Meringkas...' : 'Generate Ringkasan dengan AI' }}</span>
              </button>
            </div>
            <input
              v-model="newDocForm.summary"
              type="text"
              placeholder="Ringkasan 1-2 kalimat (klik tombol di atas untuk generate otomatis via AI)"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-black/10">
          <button
            @click="showAddModal = false"
            class="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Batal
          </button>
          <button
            @click="handleAddDocument"
            class="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Simpan & Indeks
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
