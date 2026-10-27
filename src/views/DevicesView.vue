<script setup lang="ts">
import { 
  RefreshCw, Laptop, Monitor, Smartphone, 
  ShieldCheck, Info, Wifi
} from 'lucide-vue-next';
import { useDeviceStore } from '@/stores/useDeviceStore';

const deviceStore = useDeviceStore();

function getDeviceIcon(type: string) {
  switch (type) {
    case 'desktop': return Monitor;
    case 'phone': return Smartphone;
    default: return Laptop;
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Radar Perangkat LAN P2P</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            mDNS Zeroconf
          </span>
        </h2>
        <p class="text-xs text-slate-400">Deteksi otomatis laptop dan perangkat rekan kerja di jaringan Wi-Fi yang sama</p>
      </div>

      <button
        @click="deviceStore.triggerScan"
        :class="[
          'px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all border border-slate-700',
          { 'opacity-70': deviceStore.isScanning }
        ]"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': deviceStore.isScanning }" />
        <span>{{ deviceStore.isScanning ? 'Memindai Wi-Fi...' : 'Pindai Ulang' }}</span>
      </button>
    </header>

    <!-- Content Area -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6">
      <!-- Local Device Info Card -->
      <div class="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-slate-900/40 border border-violet-500/30 flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class="h-11 w-11 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
            <Monitor class="h-6 w-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-bold text-white">{{ deviceStore.localDevice.name }}</h3>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Perangkat Ini
              </span>
            </div>
            <p class="text-[11px] font-mono text-slate-400 mt-0.5">
              IP: {{ deviceStore.localDevice.ipAddress }}:{{ deviceStore.localDevice.port }} (Service: _mediochat._udp.local)
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <ShieldCheck class="h-4 w-4" />
            E2EE Siap
          </span>
        </div>
      </div>

      <!-- Discovered Peers Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Perangkat Terdeteksi di Wi-Fi Ini ({{ deviceStore.devices.length }})
          </h3>
          <span class="text-[11px] text-slate-500">Koneksi P2P Direct Socket (Tanpa Cloud Server)</span>
        </div>

        <!-- Empty State for Peers -->
        <div
          v-if="deviceStore.devices.length === 0"
          class="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-slate-800/60"
        >
          <div class="h-11 w-11 rounded-2xl bg-violet-600/10 text-violet-400 flex items-center justify-center">
            <Wifi class="h-5 w-5" />
          </div>
          <h4 class="text-xs font-bold text-slate-300">Belum Ada Rekan Tim Terdeteksi di Wi-Fi</h4>
          <p class="text-[11px] text-slate-500 max-w-sm">
            Pastikan komputer rekan tim Anda membuka MedioChat di jaringan Wi-Fi/LAN yang sama. Klik tombol 'Pindai Ulang' di atas untuk menyiarkan sinyal.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            v-for="device in deviceStore.devices"
            :key="device.id"
            class="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                <component :is="getDeviceIcon(device.deviceType)" class="h-5 w-5" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-semibold text-slate-200">{{ device.name }}</h4>
                  <span
                    :class="[
                      'h-2 w-2 rounded-full',
                      device.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    ]"
                  ></span>
                </div>
                <p class="text-[11px] font-mono text-slate-500">
                  {{ device.ipAddress }} • {{ device.lastSeen }}
                </p>
              </div>
            </div>

            <div>
              <button
                @click="deviceStore.togglePair(device.id)"
                :class="[
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  device.isPaired
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm'
                ]"
              >
                {{ device.isPaired ? 'Terhubung' : 'Pairing' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- LAN Zero-Cloud Info Note -->
      <div class="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/60 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
        <Info class="h-5 w-5 text-violet-400 flex-shrink-0 mt-0.5" />
        <p>
          Dalam mode **LAN P2P (Fase 1)**, pengiriman teks dan transfer file berukuran besar berjalan langsung melalui kartu jaringan Wi-Fi lokal antar perangkat tanpa pernah mengunggah data ke server cloud publik.
        </p>
      </div>
    </div>
  </div>
</template>
