<script setup lang="ts">
import { ref } from 'vue';
import { 
  Key, Mic, Check, Radio, Plus, Trash2, Cpu, Globe, RefreshCw, Zap, Server, AlertCircle
} from 'lucide-vue-next';
import { useSettingStore } from '@/stores/useSettingStore';
import { aiClient } from '@/services/ai/client';
import type { AIProviderConfig, AIProviderType } from '@/services/ai/types';

const settingStore = useSettingStore();

const newModelInput = ref('');
const isTesting = ref(false);
const testResult = ref<{ success: boolean; message: string; latencyMs?: number } | null>(null);
const isFetchingModels = ref(false);

// New Provider Modal
const showAddProviderModal = ref(false);
const newProviderForm = ref<{
  name: string;
  type: AIProviderType;
  baseUrl: string;
  apiKey: string;
  initialModel: string;
}>({
  name: '',
  type: 'custom',
  baseUrl: 'http://localhost:8000/v1',
  apiKey: '',
  initialModel: '',
});

async function handleTestConnection() {
  isTesting.value = true;
  testResult.value = null;
  try {
    const result = await aiClient.testConnection(settingStore.activeProvider);
    testResult.value = {
      success: result.success,
      message: result.message,
      latencyMs: result.latencyMs,
    };
    settingStore.updateProvider(settingStore.activeProvider.id, {
      status: result.success ? 'connected' : 'error',
      latencyMs: result.latencyMs,
      errorMessage: result.success ? undefined : result.message,
    });
  } catch (err: any) {
    testResult.value = {
      success: false,
      message: err.message || 'Koneksi gagal.',
    };
  } finally {
    isTesting.value = false;
  }
}

async function handleFetchModels() {
  isFetchingModels.value = true;
  testResult.value = null;
  try {
    const models = await aiClient.fetchModels(settingStore.activeProvider);
    for (const m of models) {
      settingStore.addModelToProvider(settingStore.activeProvider.id, m);
    }
    testResult.value = {
      success: true,
      message: `Berhasil mendeteksi ${models.length} model dari server!`,
    };
  } catch (err: any) {
    testResult.value = {
      success: false,
      message: err.message || 'Gagal mengambil model.',
    };
  } finally {
    isFetchingModels.value = false;
  }
}

function handleAddModel() {
  if (!newModelInput.value.trim()) return;
  settingStore.addModelToProvider(settingStore.activeProvider.id, newModelInput.value.trim());
  newModelInput.value = '';
}

function handleRemoveModel(modelName: string) {
  settingStore.removeModelFromProvider(settingStore.activeProvider.id, modelName);
}

function handleSelectModel(modelName: string) {
  settingStore.setSelectedModel(settingStore.activeProvider.id, modelName);
}

function handleCreateProvider() {
  if (!newProviderForm.value.name.trim()) return;

  const id = `provider-${Date.now()}`;
  const models = newProviderForm.value.initialModel.trim()
    ? [newProviderForm.value.initialModel.trim()]
    : ['default-model'];

  const provider: AIProviderConfig = {
    id,
    name: newProviderForm.value.name.trim(),
    type: newProviderForm.value.type,
    baseUrl: newProviderForm.value.baseUrl.trim(),
    apiKey: newProviderForm.value.apiKey.trim(),
    selectedModel: models[0],
    availableModels: models,
    status: 'unknown',
  };

  settingStore.addProvider(provider);
  settingStore.setActiveProvider(id);
  showAddProviderModal.value = false;

  newProviderForm.value = {
    name: '',
    type: 'custom',
    baseUrl: 'http://localhost:8000/v1',
    apiKey: '',
    initialModel: '',
  };
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white">Pengaturan Sistem & AI Engine</h2>
        <p class="text-xs text-slate-400">Multi-Provider AI (Ollama, Gemini, Qwen), model dinamis, dan transport LAN P2P</p>
      </div>

      <button
        @click="showAddProviderModal = true"
        class="px-3.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
      >
        <Plus class="h-3.5 w-3.5" />
        <span>Tambah Provider Baru</span>
      </button>
    </header>

    <!-- Settings Content -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6 max-w-4xl">
      <!-- 1. AI Provider Selection Tabs -->
      <div class="space-y-3">
        <label class="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Pilih AI Provider Aktif (Dinamis & Terbuka)
        </label>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            v-for="provider in settingStore.providers"
            :key="provider.id"
            @click="settingStore.setActiveProvider(provider.id)"
            :class="[
              'p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group',
              settingStore.activeProviderId === provider.id
                ? 'bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-950/40'
                : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="h-8 w-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <Server v-if="provider.type === 'ollama'" class="h-4 w-4" />
                  <Globe v-else-if="provider.type === 'gemini'" class="h-4 w-4" />
                  <Cpu v-else class="h-4 w-4" />
                </div>
                <div>
                  <h4 class="text-xs font-bold text-white">{{ provider.name }}</h4>
                  <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {{ provider.type }}
                  </span>
                </div>
              </div>

              <span
                v-if="settingStore.activeProviderId === provider.id"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1"
              >
                <Check class="h-3 w-3" />
                Aktif
              </span>
            </div>

            <div class="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span class="truncate max-w-[140px] font-mono text-slate-300">{{ provider.selectedModel }}</span>
              <span class="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-400">
                {{ provider.availableModels.length }} models
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- 2. Active Provider Detailed Configuration -->
      <div class="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-5 shadow-sm">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Key class="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-white flex items-center gap-2">
                <span>Konfigurasi: {{ settingStore.activeProvider.name }}</span>
                <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  {{ settingStore.activeProvider.type }}
                </span>
              </h3>
              <p class="text-[11px] text-slate-400">Atur Endpoint Host, API Key, dan daftar varian model</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleTestConnection"
              :disabled="isTesting"
              class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Zap class="h-3.5 w-3.5 text-amber-400" />
              <span>{{ isTesting ? 'Menguji Latensi...' : 'Test Koneksi & Latensi' }}</span>
            </button>

            <button
              v-if="settingStore.providers.length > 1"
              @click="settingStore.deleteProvider(settingStore.activeProvider.id)"
              class="h-8 w-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-all"
              title="Hapus Provider ini"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Connection Test Alert -->
        <div
          v-if="testResult"
          :class="[
            'p-3.5 rounded-xl text-xs flex items-center justify-between border',
            testResult.success
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
          ]"
        >
          <div class="flex items-center gap-2">
            <Check v-if="testResult.success" class="h-4 w-4 text-emerald-400" />
            <AlertCircle v-else class="h-4 w-4 text-rose-400" />
            <span>{{ testResult.message }}</span>
          </div>
          <span v-if="testResult.latencyMs" class="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40">
            {{ testResult.latencyMs }}ms
          </span>
        </div>

        <!-- Inputs: Base URL & API Key -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-slate-300">Endpoint / Base URL</label>
            <input
              v-model="settingStore.activeProvider.baseUrl"
              @change="settingStore.updateProvider(settingStore.activeProvider.id, { baseUrl: settingStore.activeProvider.baseUrl })"
              type="text"
              placeholder="http://localhost:11434 atau remote host"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-slate-300">API Key / Token Bearer</label>
            <input
              v-model="settingStore.activeProvider.apiKey"
              @change="settingStore.updateProvider(settingStore.activeProvider.id, { apiKey: settingStore.activeProvider.apiKey })"
              type="password"
              placeholder="Masukkan API Key atau Bearer Token"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <!-- 3. Dynamic Models Management -->
        <div class="space-y-3 pt-3 border-t border-slate-800/60">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-white">Varian Model Terdaftar</h4>
              <p class="text-[11px] text-slate-400">Pilih model aktif untuk dekomposisi instruksi tim & chat</p>
            </div>

            <button
              @click="handleFetchModels"
              :disabled="isFetchingModels"
              class="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isFetchingModels }" />
              <span>Fetch Otomatis dari Server</span>
            </button>
          </div>

          <!-- Model Tags Grid -->
          <div class="flex flex-wrap gap-2 pt-1">
            <div
              v-for="model in settingStore.activeProvider.availableModels"
              :key="model"
              @click="handleSelectModel(model)"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 cursor-pointer transition-all border',
                settingStore.activeProvider.selectedModel === model
                  ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30'
                  : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800'
              ]"
            >
              <span>{{ model }}</span>
              <span
                v-if="settingStore.activeProvider.selectedModel === model"
                class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/20 font-sans font-bold"
              >
                Dipakai
              </span>
              <button
                @click.stop="handleRemoveModel(model)"
                class="hover:text-rose-400 transition-colors p-0.5"
                title="Hapus Model"
              >
                &times;
              </button>
            </div>
          </div>

          <!-- Add Model Inline Input -->
          <div class="flex gap-2 pt-2">
            <input
              v-model="newModelInput"
              @keyup.enter="handleAddModel"
              type="text"
              placeholder="Tambah varian model baru (contoh: deepseek-r1:32b, llama3.3:70b)..."
              class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
            <button
              @click="handleAddModel"
              class="px-4 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/40 text-violet-200 border border-violet-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>Tambah Model</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Network Mode Selection (Roadmap 3 Fase) -->
      <div class="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Radio class="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-white">Mode Komunikasi Perangkat</h3>
            <p class="text-[11px] text-slate-400">Pilih lapisan transport jaringan (Abstraksi Transport 3 Fase)</p>
          </div>
        </div>

        <div class="space-y-2">
          <label
            @click="settingStore.networkMode = 'lan_p2p'"
            :class="[
              'p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all',
              settingStore.networkMode === 'lan_p2p'
                ? 'bg-violet-950/30 border-violet-500/60'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-750'
            ]"
          >
            <input type="radio" value="lan_p2p" v-model="settingStore.networkMode" class="mt-0.5 text-violet-600" />
            <div>
              <span class="text-xs font-bold text-white block">Fase 1: Murni Mandiri & LAN P2P (Aktif via Rust Core)</span>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Koneksi direct UDP socket & mDNS via Wi-Fi lokal kantor. Nol biaya server cloud ($0/bulan). Privasi 100% lokal.
              </p>
            </div>
          </label>

          <label
            @click="settingStore.networkMode = 'cloudflare_hybrid'"
            :class="[
              'p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all',
              settingStore.networkMode === 'cloudflare_hybrid'
                ? 'bg-violet-950/30 border-violet-500/60'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-750'
            ]"
          >
            <input type="radio" value="cloudflare_hybrid" v-model="settingStore.networkMode" class="mt-0.5 text-violet-600" />
            <div>
              <span class="text-xs font-bold text-white flex items-center gap-2">
                Fase 2: Cloudflare Workers Hybrid (Remote P2P)
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                  Tersedia di Tahap 2
                </span>
              </span>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Signaling WebRTC lintas internet + encrypted offline mailbox gratis via Cloudflare Workers.
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- 5. Push-to-Talk Hotkey Configuration -->
      <div class="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
            <Mic class="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-white">Global Push-to-Talk (PTT) Shortcut</h3>
            <p class="text-[11px] text-slate-400">Tekan tombol ini dari aplikasi mana saja untuk langsung mendiktekan tugas ke AI</p>
          </div>
        </div>

        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span class="text-xs text-slate-300">Shortcut Sistem Global</span>
          <kbd class="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-violet-300 font-semibold">
            {{ settingStore.globalHotkey }}
          </kbd>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Provider Baru -->
    <div
      v-if="showAddProviderModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 class="text-sm font-bold text-white">Tambah AI Provider Baru</h3>
        <p class="text-xs text-slate-400">Tambahkan provider custom seperti LocalAI, vLLM, Groq, DeepSeek, atau endpoint Ollama custom.</p>

        <div class="space-y-3 pt-2">
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Nama Provider</label>
            <input
              v-model="newProviderForm.name"
              type="text"
              placeholder="Contoh: Groq Cloud, vLLM Server, DeepSeek"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Tipe Protokol</label>
            <select
              v-model="newProviderForm.type"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="ollama">Ollama (Native & OpenAI API)</option>
              <option value="openai">OpenAI Compatible (vLLM, Groq, DeepSeek, LocalAI)</option>
              <option value="gemini">Google Gemini API</option>
              <option value="qwen">Alibaba DashScope (Qwen)</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Base URL</label>
            <input
              v-model="newProviderForm.baseUrl"
              type="text"
              placeholder="http://localhost:8000/v1"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">API Key / Token (Opsional)</label>
            <input
              v-model="newProviderForm.apiKey"
              type="password"
              placeholder="sk-..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Model Awal</label>
            <input
              v-model="newProviderForm.initialModel"
              type="text"
              placeholder="Contoh: llama3-70b-8192"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            @click="showAddProviderModal = false"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-all"
          >
            Batal
          </button>
          <button
            @click="handleCreateProvider"
            class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all"
          >
            Simpan Provider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
