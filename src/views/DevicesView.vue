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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] text-black font-sans overflow-hidden">
    <!-- Header (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white select-none">
      <div>
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Radar Perangkat LAN P2P</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#86EFAC] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            mDNS Zeroconf
          </span>
        </h2>
        <p class="text-[11px] font-bold text-black/60">Deteksi otomatis laptop dan perangkat rekan kerja di jaringan Wi-Fi yang sama</p>
      </div>

      <button
        @click="deviceStore.triggerScan"
        :class="[
          'px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black text-xs font-black flex items-center gap-2 transition-all border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5',
          { 'opacity-70': deviceStore.isScanning }
        ]"
      >
        <RefreshCw class="h-3.5 w-3.5 stroke-[2.5]" :class="{ 'animate-spin': deviceStore.isScanning }" />
        <span>{{ deviceStore.isScanning ? 'Memindai Wi-Fi...' : 'Pindai Ulang' }}</span>
      </button>
    </header>

    <!-- Content Area -->
    <div class="flex-1 p-6 overflow-y-auto space-y-6">
      <!-- Local Device Info Card -->
      <div class="p-5 rounded-2xl bg-[#FFFDF5] border-3 border-black shadow-[5px_5px_0px_#000] flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="h-12 w-12 rounded-2xl bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Monitor class="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-black text-black">{{ deviceStore.localDevice.name }}</h3>
              <span class="text-[9px] px-2 py-0.5 rounded bg-[#86EFAC] text-black border border-black font-black shadow-[1px_1px_0px_#000]">
                Perangkat Ini
              </span>
            </div>
            <p class="text-[11px] font-mono font-bold text-black/70 mt-0.5">
              IP: {{ deviceStore.localDevice.ipAddress }}:{{ deviceStore.localDevice.port }} (Service: _mediochat._udp.local)
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-black font-black flex items-center gap-1.5 bg-[#86EFAC] px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000]">
            <ShieldCheck class="h-4 w-4 stroke-[2.5]" />
            E2EE Siap
          </span>
        </div>
      </div>

      <!-- Discovered Peers Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between select-none">
          <h3 class="text-xs font-black text-black uppercase tracking-wider">
            Perangkat Terdeteksi di Wi-Fi Ini ({{ deviceStore.devices.length }})
          </h3>
          <span class="text-[11px] font-bold text-black/60">Koneksi P2P Direct Socket (Tanpa Cloud Server)</span>
        </div>

        <!-- Empty State for Peers -->
        <div
          v-if="deviceStore.devices.length === 0"
          class="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-white rounded-2xl border-3 border-black shadow-[5px_5px_0px_#000] max-w-lg mx-auto"
        >
          <div class="h-14 w-14 rounded-2xl bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Wifi class="h-7 w-7 stroke-[2.5]" />
          </div>
          <h4 class="text-sm font-black text-black">Belum Ada Rekan Tim Terdeteksi di Wi-Fi</h4>
          <p class="text-xs font-semibold text-black/70 max-w-sm">
            Pastikan komputer rekan tim Anda membuka MedioChat di jaringan Wi-Fi/LAN yang sama. Klik tombol 'Pindai Ulang' di atas untuk menyiarkan sinyal.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="device in deviceStore.devices"
            :key="device.id"
            class="p-4 rounded-2xl bg-white border-2 border-black hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5 shadow-[4px_4px_0px_#000] transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-3.5">
              <div class="h-11 w-11 rounded-xl bg-[#FEF08A] text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                <component :is="getDeviceIcon(device.deviceType)" class="h-5 w-5 stroke-[2.5]" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-black text-black">{{ device.name }}</h4>
                  <span
                    :class="[
                      'h-2.5 w-2.5 rounded-full border border-black',
                      device.isOnline ? 'bg-[#22C55E] animate-pulse' : 'bg-neutral-300'
                    ]"
                  ></span>
                </div>
                <p class="text-[11px] font-mono font-bold text-black/60">
                  {{ device.ipAddress }} • {{ device.lastSeen }}
                </p>
              </div>
            </div>

            <div>
              <button
                @click="deviceStore.togglePair(device.id)"
                :class="[
                  'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black active:translate-x-0.5 active:translate-y-0.5',
                  device.isPaired
                    ? 'bg-[#86EFAC] text-black shadow-[2px_2px_0px_#000]'
                    : 'bg-[#FFE600] hover:bg-[#FACC15] text-black shadow-[2px_2px_0px_#000]'
                ]"
              >
                {{ device.isPaired ? 'Terhubung' : 'Pairing' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- LAN Zero-Cloud Info Note -->
      <div class="p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3 text-xs text-black font-semibold leading-relaxed">
        <Info class="h-5 w-5 text-black flex-shrink-0 mt-0.5 stroke-[2.5]" />
        <p>
          Dalam mode <strong class="bg-[#FEF08A] px-1 rounded border border-black">LAN P2P (Fase 1)</strong>, pengiriman teks dan transfer file berukuran besar berjalan langsung melalui kartu jaringan Wi-Fi lokal antar perangkat tanpa pernah mengunggah data ke server cloud publik.
        </p>
      </div>
    </div>
  </div>
</template>
