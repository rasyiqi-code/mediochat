<script setup lang="ts">
import { ref } from 'vue';
import { 
  Key, Mic, Check, Radio, Plus, Trash2, Cpu, Globe, RefreshCw, Zap, Server, AlertCircle, Users, Database,
  Share2
} from 'lucide-vue-next';
import { useSettingStore } from '@/stores/useSettingStore';
import { useChatStore } from '@/stores/useChatStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { usePlatformStore } from '@/stores/usePlatformStore';
import { aiClient } from '@/services/ai/client';
import type { AIProviderConfig, AIProviderType } from '@/services/ai/types';

const settingStore = useSettingStore();
const chatStore = useChatStore();
const taskStore = useTaskStore();
const stakeholderStore = useStakeholderStore();
const platformStore = usePlatformStore();

const newModelInput = ref('');
const isTesting = ref(false);
const testResult = ref<{ success: boolean; message: string; latencyMs?: number } | null>(null);
const isFetchingModels = ref(false);

// Platform Integrations Test States
const isTestingTelegram = ref(false);
const telegramResult = ref<{ success: boolean; message: string } | null>(null);
const isTestingSlack = ref(false);
const slackResult = ref<{ success: boolean; message: string } | null>(null);

async function handleTestTelegram() {
  isTestingTelegram.value = true;
  telegramResult.value = null;
  try {
    telegramResult.value = await platformStore.testTelegram();
  } catch (err: any) {
    telegramResult.value = { success: false, message: err.message || 'Gagal menguji Telegram' };
  } finally {
    isTestingTelegram.value = false;
  }
}

async function handleTestSlack() {
  isTestingSlack.value = true;
  slackResult.value = null;
  try {
    slackResult.value = await platformStore.testSlack();
  } catch (err: any) {
    slackResult.value = { success: false, message: err.message || 'Gagal menguji Slack' };
  } finally {
    isTestingSlack.value = false;
  }
}

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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
    <!-- Header (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white shrink-0">
      <div>
        <h2 class="text-sm font-black text-black">Pengaturan Sistem & AI Engine</h2>
        <p class="text-xs font-medium text-black/60">Multi-Provider AI (Ollama, Gemini, Qwen), model dinamis, dan transport LAN P2P</p>
      </div>

      <button
        @click="showAddProviderModal = true"
        class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
      >
        <Plus class="h-3.5 w-3.5 stroke-[3]" />
        <span>Tambah Provider Baru</span>
      </button>
    </header>

    <!-- Settings Content -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6 w-full">
      <!-- 1. AI Provider Selection Tabs -->
      <div class="space-y-3">
        <label class="text-xs font-black text-black uppercase tracking-wider block">
          Pilih AI Provider Aktif (Dinamis & Terbuka)
        </label>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            v-for="provider in settingStore.providers"
            :key="provider.id"
            @click="settingStore.setActiveProvider(provider.id)"
            :class="[
              'p-4 rounded-2xl border-2 border-black text-left flex flex-col justify-between transition-all relative overflow-hidden group cursor-pointer',
              settingStore.activeProviderId === provider.id
                ? 'bg-[#FEF08A] shadow-[4px_4px_0px_#000] -translate-y-0.5'
                : 'bg-white shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="h-8 w-8 rounded-xl bg-[#C4B5FD] text-black border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]">
                  <Server v-if="provider.type === 'ollama'" class="h-4 w-4 stroke-[2.5]" />
                  <Globe v-else-if="provider.type === 'gemini'" class="h-4 w-4 stroke-[2.5]" />
                  <Cpu v-else class="h-4 w-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 class="text-xs font-black text-black">{{ provider.name }}</h4>
                  <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-white border border-black text-black font-bold">
                    {{ provider.type }}
                  </span>
                </div>
              </div>

              <span
                v-if="settingStore.activeProviderId === provider.id"
                class="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#86EFAC] text-black border-2 border-black flex items-center gap-1 shadow-[1.5px_1.5px_0px_#000]"
              >
                <Check class="h-3 w-3 stroke-[3]" />
                Aktif
              </span>
            </div>

            <div class="mt-4 pt-3 border-t-2 border-black/10 flex items-center justify-between text-[11px] text-black/70">
              <span class="truncate max-w-[140px] font-mono text-black font-bold">{{ provider.selectedModel }}</span>
              <span class="text-[10px] bg-white border border-black px-2 py-0.5 rounded-md text-black font-mono font-bold shadow-[1px_1px_0px_#000]">
                {{ provider.availableModels.length }} models
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- 2. Active Provider Detailed Configuration -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-5 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center justify-between pb-3 border-b-2 border-black">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Key class="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-xs font-black text-black flex items-center gap-2">
                <span>Konfigurasi: {{ settingStore.activeProvider.name }}</span>
                <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-[#FEF08A] text-black border border-black font-black">
                  {{ settingStore.activeProvider.type }}
                </span>
              </h3>
              <p class="text-[11px] font-medium text-black/60">Atur Endpoint Host, API Key, dan daftar varian model</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleTestConnection"
              :disabled="isTesting"
              class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] disabled:opacity-50 cursor-pointer"
            >
              <Zap class="h-3.5 w-3.5 text-amber-500 fill-amber-500 stroke-[2.5]" />
              <span>{{ isTesting ? 'Menguji Latensi...' : 'Test Koneksi & Latensi' }}</span>
            </button>

            <button
              v-if="settingStore.providers.length > 1"
              @click="settingStore.deleteProvider(settingStore.activeProvider.id)"
              class="h-8 w-8 rounded-xl bg-[#FDA4AF] hover:bg-[#FDA4AF]/80 text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
              title="Hapus Provider ini"
            >
              <Trash2 class="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <!-- Connection Test Alert -->
        <div
          v-if="testResult"
          :class="[
            'p-3.5 rounded-xl text-xs font-black flex items-center justify-between border-2 border-black shadow-[3px_3px_0px_#000]',
            testResult.success
              ? 'bg-[#BBF7D0] text-black'
              : 'bg-[#FECDD3] text-black'
          ]"
        >
          <div class="flex items-center gap-2">
            <Check v-if="testResult.success" class="h-4 w-4 stroke-[3]" />
            <AlertCircle v-else class="h-4 w-4 stroke-[3]" />
            <span>{{ testResult.message }}</span>
          </div>
          <span v-if="testResult.latencyMs" class="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-black font-bold">
            {{ testResult.latencyMs }}ms
          </span>
        </div>

        <!-- Inputs: Base URL & API Key -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs font-black text-black uppercase">Endpoint / Base URL</label>
            <input
              v-model="settingStore.activeProvider.baseUrl"
              @change="settingStore.updateProvider(settingStore.activeProvider.id, { baseUrl: settingStore.activeProvider.baseUrl })"
              type="text"
              placeholder="http://localhost:11434 atau remote host"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3.5 py-2.5 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#000]"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-black uppercase">API Key / Token Bearer</label>
            <input
              v-model="settingStore.activeProvider.apiKey"
              @change="settingStore.updateProvider(settingStore.activeProvider.id, { apiKey: settingStore.activeProvider.apiKey })"
              type="password"
              placeholder="Masukkan API Key atau Bearer Token"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3.5 py-2.5 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#000]"
            />
          </div>
        </div>

        <!-- 3. Dynamic Models Management -->
        <div class="space-y-3 pt-3 border-t-2 border-black/10">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-black text-black">Varian Model Terdaftar</h4>
              <p class="text-[11px] font-medium text-black/60">Pilih model aktif untuk dekomposisi instruksi tim & chat</p>
            </div>

            <button
              @click="handleFetchModels"
              :disabled="isFetchingModels"
              class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw class="h-3 w-3 stroke-[2.5]" :class="{ 'animate-spin': isFetchingModels }" />
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
                'px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all border-2 border-black',
                settingStore.activeProvider.selectedModel === model
                  ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_#000]'
                  : 'bg-white hover:bg-[#FAF8F5] text-black shadow-[2px_2px_0px_#000]'
              ]"
            >
              <span>{{ model }}</span>
              <span
                v-if="settingStore.activeProvider.selectedModel === model"
                class="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-black text-white font-sans font-black"
              >
                Dipakai
              </span>
              <button
                @click.stop="handleRemoveModel(model)"
                class="hover:text-rose-600 transition-colors p-0.5 font-black text-sm"
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
              class="flex-1 bg-[#FFFDF5] border-2 border-black rounded-xl px-3.5 py-2 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white focus:shadow-[3px_3px_0px_#000]"
            />
            <button
              @click="handleAddModel"
              class="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
            >
              <Plus class="h-3.5 w-3.5 stroke-[3]" />
              <span>Tambah Model</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Network Mode Selection (Roadmap 3 Fase) -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-4 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-[#86EFAC] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Radio class="h-4.5 w-4.5 stroke-[2.5]" />
          </div>
          <div>
            <h3 class="text-xs font-black text-black">Mode Komunikasi Perangkat</h3>
            <p class="text-[11px] font-medium text-black/60">Pilih lapisan transport jaringan (Abstraksi Transport 3 Fase)</p>
          </div>
        </div>

        <div class="space-y-2">
          <label
            @click="settingStore.networkMode = 'lan_p2p'"
            :class="[
              'p-3.5 rounded-xl border-2 border-black flex items-start gap-3 cursor-pointer transition-all',
              settingStore.networkMode === 'lan_p2p'
                ? 'bg-[#FEF08A] shadow-[3px_3px_0px_#000]'
                : 'bg-[#FFFDF5] shadow-[2px_2px_0px_#000] hover:bg-white'
            ]"
          >
            <input type="radio" value="lan_p2p" v-model="settingStore.networkMode" class="mt-0.5 accent-black" />
            <div>
              <span class="text-xs font-black text-black block">Fase 1: Murni Mandiri & LAN P2P (Aktif via Rust Core)</span>
              <p class="text-[11px] font-medium text-black/70 mt-0.5">
                Koneksi direct UDP socket & mDNS via Wi-Fi lokal kantor. Nol biaya server cloud ($0/bulan). Privasi 100% lokal.
              </p>
            </div>
          </label>

          <label
            @click="settingStore.networkMode = 'cloudflare_hybrid'"
            :class="[
              'p-3.5 rounded-xl border-2 border-black flex items-start gap-3 cursor-pointer transition-all',
              settingStore.networkMode === 'cloudflare_hybrid'
                ? 'bg-[#FEF08A] shadow-[3px_3px_0px_#000]'
                : 'bg-[#FFFDF5] shadow-[2px_2px_0px_#000] hover:bg-white'
            ]"
          >
            <input type="radio" value="cloudflare_hybrid" v-model="settingStore.networkMode" class="mt-0.5 accent-black" />
            <div>
              <span class="text-xs font-black text-black flex items-center gap-2">
                Fase 2: Cloudflare Workers Hybrid (Remote P2P)
                <span class="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FFE600] text-black border border-black font-black">
                  Tersedia di Tahap 2
                </span>
              </span>
              <p class="text-[11px] font-medium text-black/70 mt-0.5">
                Signaling WebRTC lintas internet + encrypted offline mailbox gratis via Cloudflare Workers.
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- 5. Push-to-Talk Hotkey Configuration -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-4 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-[#7DD3FC] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Mic class="h-4.5 w-4.5 stroke-[2.5]" />
          </div>
          <div>
            <h3 class="text-xs font-black text-black">Global Push-to-Talk (PTT) Shortcut</h3>
            <p class="text-[11px] font-medium text-black/60">Tekan tombol ini dari aplikasi mana saja untuk langsung mendiktekan tugas ke AI</p>
          </div>
        </div>

        <div class="flex items-center justify-between p-3 rounded-xl bg-[#FFFDF5] border-2 border-black shadow-[2px_2px_0px_#000]">
          <span class="text-xs font-bold text-black">Shortcut Sistem Global</span>
          <kbd class="px-2.5 py-1 rounded-lg bg-[#FFE600] border-2 border-black text-xs font-mono text-black font-black shadow-[2px_2px_0px_#000]">
            {{ settingStore.globalHotkey }}
          </kbd>
        </div>
      </div>

      <!-- 6. Multi-User & Stakeholder Profile -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-4 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-[#C4B5FD] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Users class="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-xs font-black text-black">Profil Pengguna & Stakeholder Aktif</h3>
              <p class="text-[11px] font-medium text-black/60">Identitas yang akan dicantumkan pada setiap instruksi, chat feed, dan penugasan AI</p>
            </div>
          </div>
          <router-link
            to="/team"
            class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black border-2 border-black text-xs font-black transition-all shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000]"
          >
            Kelola Direktori Tim
          </router-link>
        </div>

        <div class="p-3.5 rounded-xl bg-[#FFFDF5] border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-[#FFE600] border-2 border-black text-black font-black text-xs flex items-center justify-center shadow-[2px_2px_0px_#000]">
              {{ stakeholderStore.currentUser.name.slice(0, 2).toUpperCase() }}
            </div>
            <div>
              <div class="text-xs font-black text-black flex items-center gap-2">
                <span>{{ stakeholderStore.currentUser.name }}</span>
                <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-[#86EFAC] text-black border border-black font-black shadow-[1px_1px_0px_#000]">
                  {{ stakeholderStore.currentUser.division }}
                </span>
              </div>
              <p class="text-[11px] font-medium text-black/60">{{ stakeholderStore.currentUser.role }} • {{ stakeholderStore.currentUser.email || 'Tanpa email' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-[11px] font-black text-black">Ganti Akun:</label>
            <select
              :value="stakeholderStore.currentUser.id"
              @change="(e) => stakeholderStore.setCurrentUser((e.target as HTMLSelectElement).value)"
              class="bg-white border-2 border-black text-xs font-bold rounded-xl px-2.5 py-1.5 text-black shadow-[2px_2px_0px_#000] focus:outline-none"
            >
              <option
                v-for="s in stakeholderStore.stakeholders"
                :key="s.id"
                :value="s.id"
              >
                {{ s.name }} ({{ s.role }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- 7. Integrasi Platform Eksternal (Ghost-Relay Hub) -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-5 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center justify-between pb-3 border-b-2 border-black">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-[#67E8F9] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Share2 class="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h3 class="text-xs font-black text-black flex items-center gap-2">
                <span>Integrasi Platform Eksternal</span>
                <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#FEF08A] text-black border border-black font-black">
                  Ghost-Relay Engine
                </span>
              </h3>
              <p class="text-[11px] font-medium text-black/60">Teruskan Daily Reports, 5W1H Intelligence, dan briefing AI ke Telegram & Slack ($0 Cloud Server)</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Telegram Integration Box -->
          <div class="p-4 rounded-xl bg-[#FFFDF5] border-2 border-black space-y-3 shadow-[3px_3px_0px_#000]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-7 w-7 rounded-lg bg-[#38BDF8] border border-black flex items-center justify-center text-black font-black text-xs shadow-[1.5px_1.5px_0px_#000]">
                  TG
                </span>
                <div>
                  <h4 class="text-xs font-black text-black">Telegram Bot</h4>
                  <p class="text-[10px] text-black/60 font-bold">Kirim ringkasan & briefing via Telegram Bot API</p>
                </div>
              </div>

              <span
                :class="[
                  'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-black font-mono',
                  platformStore.telegram.status === 'connected' ? 'bg-[#86EFAC] text-black' :
                  platformStore.telegram.status === 'error' ? 'bg-[#FECDD3] text-black' : 'bg-slate-200 text-black'
                ]"
              >
                {{ platformStore.telegram.status }}
              </span>
            </div>

            <!-- Telegram Inputs -->
            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-[10px] font-black text-black uppercase">Telegram Bot Token</label>
                <input
                  v-model="platformStore.telegram.botToken"
                  @change="platformStore.persist()"
                  type="password"
                  placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  class="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black font-mono font-bold shadow-[1.5px_1.5px_0px_#000] focus:outline-none"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black text-black uppercase">Target Chat ID (Channel/Grup/Pribadi)</label>
                <input
                  v-model="platformStore.telegram.chatId"
                  @change="platformStore.persist()"
                  type="text"
                  placeholder="Contoh: -100123456789 atau @username_channel"
                  class="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black font-mono font-bold shadow-[1.5px_1.5px_0px_#000] focus:outline-none"
                />
              </div>
            </div>

            <!-- Telegram Test Alert -->
            <div
              v-if="telegramResult"
              :class="[
                'p-2.5 rounded-lg text-[11px] font-bold border border-black flex items-center gap-2',
                telegramResult.success ? 'bg-[#BBF7D0] text-black' : 'bg-[#FECDD3] text-black'
              ]"
            >
              <Check v-if="telegramResult.success" class="h-3.5 w-3.5 stroke-[3] shrink-0" />
              <AlertCircle v-else class="h-3.5 w-3.5 stroke-[3] shrink-0" />
              <span>{{ telegramResult.message }}</span>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span v-if="platformStore.telegram.botUsername" class="text-[10px] font-mono text-black font-bold">
                @{{ platformStore.telegram.botUsername }}
              </span>
              <span v-else class="text-[10px] text-black/50 font-bold">Belum terhubung</span>

              <button
                @click="handleTestTelegram"
                :disabled="isTestingTelegram"
                class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Zap class="h-3 w-3 text-amber-500 fill-amber-500 stroke-[2.5]" />
                <span>{{ isTestingTelegram ? 'Menguji...' : 'Test Bot Telegram' }}</span>
              </button>
            </div>
          </div>

          <!-- Slack Integration Box -->
          <div class="p-4 rounded-xl bg-[#FFFDF5] border-2 border-black space-y-3 shadow-[3px_3px_0px_#000]">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-7 w-7 rounded-lg bg-[#C084FC] border border-black flex items-center justify-center text-black font-black text-xs shadow-[1.5px_1.5px_0px_#000]">
                  SL
                </span>
                <div>
                  <h4 class="text-xs font-black text-black">Slack Webhook</h4>
                  <p class="text-[10px] text-black/60 font-bold">Kirim notifikasi otomatis ke Slack Workspace channel</p>
                </div>
              </div>

              <span
                :class="[
                  'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-black font-mono',
                  platformStore.slack.status === 'connected' ? 'bg-[#86EFAC] text-black' :
                  platformStore.slack.status === 'error' ? 'bg-[#FECDD3] text-black' : 'bg-slate-200 text-black'
                ]"
              >
                {{ platformStore.slack.status }}
              </span>
            </div>

            <!-- Slack Inputs -->
            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-[10px] font-black text-black uppercase">Incoming Webhook URL</label>
                <input
                  v-model="platformStore.slack.webhookUrl"
                  @change="platformStore.persist()"
                  type="password"
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  class="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black font-mono font-bold shadow-[1.5px_1.5px_0px_#000] focus:outline-none"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black text-black uppercase">Nama Channel</label>
                <input
                  v-model="platformStore.slack.channel"
                  @change="platformStore.persist()"
                  type="text"
                  placeholder="#standup atau #general"
                  class="w-full bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black font-mono font-bold shadow-[1.5px_1.5px_0px_#000] focus:outline-none"
                />
              </div>
            </div>

            <!-- Slack Test Alert -->
            <div
              v-if="slackResult"
              :class="[
                'p-2.5 rounded-lg text-[11px] font-bold border border-black flex items-center gap-2',
                slackResult.success ? 'bg-[#BBF7D0] text-black' : 'bg-[#FECDD3] text-black'
              ]"
            >
              <Check v-if="slackResult.success" class="h-3.5 w-3.5 stroke-[3] shrink-0" />
              <AlertCircle v-else class="h-3.5 w-3.5 stroke-[3] shrink-0" />
              <span>{{ slackResult.message }}</span>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-[10px] text-black/60 font-bold">
                {{ platformStore.slack.channel || '#general' }}
              </span>

              <button
                @click="handleTestSlack"
                :disabled="isTestingSlack"
                class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Zap class="h-3 w-3 text-amber-500 fill-amber-500 stroke-[2.5]" />
                <span>{{ isTestingSlack ? 'Menguji...' : 'Test Webhook Slack' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 8. Data & Storage Management -->
      <div class="p-5 rounded-2xl bg-white border-3 border-black space-y-4 shadow-[5px_5px_0px_#000]">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-[#FDA4AF] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Database class="h-4.5 w-4.5 stroke-[2.5]" />
          </div>
          <div>
            <h3 class="text-xs font-black text-black">Manajemen Data & Cache Lokal</h3>
            <p class="text-[11px] font-medium text-black/60">Kelola atau bersihkan cache percakapan, kanban task, dan direktori stakeholder</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-xl bg-[#FFFDF5] border-2 border-black flex flex-col justify-between space-y-3 shadow-[2px_2px_0px_#000]">
            <div>
              <h4 class="text-xs font-black text-black">Universal Chat Feed</h4>
              <p class="text-[10px] font-bold text-black/60 mt-0.5">{{ chatStore.messages.length }} pesan tersimpan</p>
            </div>
            <button
              @click="chatStore.clearMessages()"
              class="px-2.5 py-1.5 rounded-lg text-[11px] font-black text-black bg-[#FECDD3] hover:bg-[#FECDD3]/80 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 class="h-3 w-3 stroke-[2.5]" />
              <span>Bersihkan Pesan Feed</span>
            </button>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFFDF5] border-2 border-black flex flex-col justify-between space-y-3 shadow-[2px_2px_0px_#000]">
            <div>
              <h4 class="text-xs font-black text-black">Kanban Tasks</h4>
              <p class="text-[10px] font-bold text-black/60 mt-0.5">{{ taskStore.tasks.length }} tugas tersimpan</p>
            </div>
            <button
              @click="taskStore.clearTasks()"
              class="px-2.5 py-1.5 rounded-lg text-[11px] font-black text-black bg-[#FECDD3] hover:bg-[#FECDD3]/80 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 class="h-3 w-3 stroke-[2.5]" />
              <span>Bersihkan Semua Task</span>
            </button>
          </div>

          <div class="p-3.5 rounded-xl bg-[#FFFDF5] border-2 border-black flex flex-col justify-between space-y-3 shadow-[2px_2px_0px_#000]">
            <div>
              <h4 class="text-xs font-black text-black">Direktori Stakeholder</h4>
              <p class="text-[10px] font-bold text-black/60 mt-0.5">{{ stakeholderStore.stakeholders.length }} personil terdaftar</p>
            </div>
            <button
              @click="stakeholderStore.resetToDefaults()"
              class="px-2.5 py-1.5 rounded-lg text-[11px] font-black text-black bg-[#FEF08A] hover:bg-[#FEF08A]/80 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw class="h-3 w-3 stroke-[2.5]" />
              <span>Reset Tim ke Default</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Provider Baru -->
    <div
      v-if="showAddProviderModal"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white border-3 border-black rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[6px_6px_0px_#000]">
        <h3 class="text-sm font-black text-black">Tambah AI Provider Baru</h3>
        <p class="text-xs font-medium text-black/70">Tambahkan provider custom seperti LocalAI, vLLM, Groq, DeepSeek, atau endpoint Ollama custom.</p>

        <div class="space-y-3 pt-2">
          <div class="space-y-1">
            <label class="text-xs font-black text-black uppercase">Nama Provider</label>
            <input
              v-model="newProviderForm.name"
              type="text"
              placeholder="Contoh: Groq Cloud, vLLM Server, DeepSeek"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-black text-black uppercase">Tipe Protokol</label>
            <select
              v-model="newProviderForm.type"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white"
            >
              <option value="ollama">Ollama (Native & OpenAI API)</option>
              <option value="openai">OpenAI Compatible (vLLM, Groq, DeepSeek, LocalAI)</option>
              <option value="gemini">Google Gemini API</option>
              <option value="qwen">Alibaba DashScope (Qwen)</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-black text-black uppercase">Base URL</label>
            <input
              v-model="newProviderForm.baseUrl"
              type="text"
              placeholder="http://localhost:8000/v1"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-black text-black uppercase">API Key / Token (Opsional)</label>
            <input
              v-model="newProviderForm.apiKey"
              type="password"
              placeholder="sk-..."
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-black text-black uppercase">Model Awal</label>
            <input
              v-model="newProviderForm.initialModel"
              type="text"
              placeholder="Contoh: llama3-70b-8192"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold shadow-[2px_2px_0px_#000] focus:outline-none focus:bg-white"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t-2 border-black">
          <button
            @click="showAddProviderModal = false"
            class="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black text-xs font-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            @click="handleCreateProvider"
            class="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FFE600]/90 text-black border-2 border-black text-xs font-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer"
          >
            Simpan Provider
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
