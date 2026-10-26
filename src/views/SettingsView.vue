<script setup lang="ts">
import { ref } from 'vue';
import { 
  Key, Mic, Check, Save, Radio
} from 'lucide-vue-next';
import { useSettingStore } from '@/stores/useSettingStore';

const settingStore = useSettingStore();
const tempApiKey = ref(settingStore.qwenApiKey);
const isSaved = ref(false);

function handleSaveApiKey() {
  settingStore.saveApiKey(tempApiKey.value);
  isSaved.value = true;
  setTimeout(() => {
    isSaved.value = false;
  }, 2000);
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white">Pengaturan Sistem Desktop</h2>
        <p class="text-xs text-slate-400">Konfigurasi Qwen AI, mode jaringan komunikasi, dan shortcut keyboard</p>
      </div>
    </header>

    <!-- Settings Content -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6 max-w-3xl">
      <!-- 1. Qwen Cloud API Configuration -->
      <div class="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Key class="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-white">Alibaba Cloud DashScope (Qwen AI Key)</h3>
            <p class="text-[11px] text-slate-400">Digunakan untuk STT Audio, Dekomposisi Tugas, dan RAG Memory</p>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-slate-300">API Key DashScope</label>
          <div class="flex gap-2">
            <input
              v-model="tempApiKey"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 font-mono"
            />
            <button
              @click="handleSaveApiKey"
              class="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
            >
              <Check v-if="isSaved" class="h-4 w-4" />
              <Save v-else class="h-4 w-4" />
              <span>{{ isSaved ? 'Tersimpan!' : 'Simpan' }}</span>
            </button>
          </div>
        </div>

        <!-- Model Selection Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-slate-300">Model LLM / Dekomposisi</label>
            <select
              v-model="settingStore.selectedChatModel"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="qwen-plus">Qwen-Plus (Cepat & Akurat - Rekomendasi)</option>
              <option value="qwen-max">Qwen-Max (Kapasitas Penalaran Tertinggi)</option>
              <option value="qwen-flash">Qwen-Flash (Super Ringan & Ekonomis)</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-slate-300">Model Audio Transkripsi</label>
            <select
              v-model="settingStore.selectedAudioModel"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="qwen3-asr-flash">qwen3-asr-flash (Dedicated ASR Model)</option>
              <option value="qwen-omni-turbo">qwen-omni-turbo (Multimodal Audio)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 2. Network Mode Selection (Roadmap 3 Fase) -->
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
              <span class="text-xs font-bold text-white block">Fase 1: Murni Mandiri & LAN P2P (Aktif)</span>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Koneksi direct socket via Wi-Fi lokal kantor. Nol biaya server cloud ($0/bulan). Privasi 100% lokal.
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

      <!-- 3. Push-to-Talk Hotkey Configuration -->
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
  </div>
</template>
