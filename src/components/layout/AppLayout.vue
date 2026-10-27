<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { 
  MessageSquare, Kanban, Users, FolderKey, Wifi, Settings, 
  Mic, Radio, ShieldCheck, BarChart3, Flame
} from 'lucide-vue-next';
import { useChatStore } from '@/stores/useChatStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingStore } from '@/stores/useSettingStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { productionAudioRecorder } from '@/services/audio/recorder';
import { useAICoordinator } from '@/composables/useAICoordinator';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const deviceStore = useDeviceStore();
const settingStore = useSettingStore();
const stakeholderStore = useStakeholderStore();
const { processTaskDecomposition } = useAICoordinator();

const navItems = [
  { path: '/chat', label: 'Chat Universal', icon: MessageSquare, badge: null },
  { path: '/board', label: 'Kanban Tugas', icon: Kanban, badge: 'AI' },
  { path: '/team', label: 'Tim & Stakeholder', icon: Users, badge: `${stakeholderStore.stakeholders.length}` },
  { path: '/reports', label: 'Daily Reports', icon: BarChart3, badge: 'NEW' },
  { path: '/things-matter', label: 'Things That Matter', icon: Flame, badge: '5W1H' },
  { path: '/vault', label: 'Knowledge Vault', icon: FolderKey, badge: null },
  { path: '/devices', label: 'Radar P2P', icon: Wifi, badge: `${deviceStore.devices.filter(d => d.isOnline).length}` },
  { path: '/settings', label: 'Pengaturan', icon: Settings, badge: null },
];

async function togglePtt() {
  if (chatStore.isRecording) {
    chatStore.stopRecording();
    try {
      const res = await productionAudioRecorder.stop();
      if (res.transcript) {
        await processTaskDecomposition(res.transcript, stakeholderStore.currentUser.name, true);
      }
    } catch (e) {
      console.warn('Voice PTT error:', e);
    }
  } else {
    chatStore.startRecording();
    try {
      await productionAudioRecorder.start();
    } catch (e) {
      console.warn('Mic start error:', e);
    }
  }
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#FAF8F5] text-black font-sans">
    <!-- Desktop Sidebar (Neobrutalism) -->
    <aside class="w-64 flex-shrink-0 flex flex-col justify-between border-r-3 border-black bg-[#FFFDF5] select-none">
      <!-- Top Branding: exactly h-16 border-b-3 border-black to align with content header -->
      <div class="h-16 px-4 border-b-3 border-black flex items-center justify-between bg-white shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
            <Radio class="h-4.5 w-4.5 text-black stroke-[2.5]" />
          </div>
          <div>
            <h1 class="font-black text-xs tracking-tight text-black flex items-center gap-1.5 leading-none">
              <span>MedioChat</span>
              <span class="text-[9px] font-black uppercase px-1 py-0.2 bg-[#C4B5FD] text-black rounded border border-black shadow-[1px_1px_0px_#000]">
                P2P
              </span>
            </h1>
            <p class="text-[10px] font-bold text-black/60 leading-none mt-1">Team AI Bridge</p>
          </div>
        </div>
      </div>

      <!-- Connection Badge Widget (Inside sidebar content, below the aligned header line) -->
      <div class="px-3 pt-3">
        <router-link
          to="/devices"
          class="p-2.5 rounded-xl bg-white hover:bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-between text-xs cursor-pointer block transition-all"
          title="Klik untuk membuka Radar LAN P2P"
        >
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E] border border-black"></span>
            </span>
            <span class="text-black font-black text-[11px]">LAN Mesh: Aktif</span>
          </div>
          <span class="text-[10px] font-mono font-black text-black bg-[#86EFAC] border-1.5 border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#000]">
            {{ deviceStore.devices.filter(d => d.isOnline).length }} peers
          </span>
        </router-link>
      </div>

      <!-- Nav Items -->
      <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path)"
          :class="[
            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group font-black',
            route.path === item.path
              ? 'bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_#000] -translate-y-0.5'
              : 'text-black border-2 border-transparent hover:border-black hover:bg-black/5 hover:shadow-[2px_2px_0px_#000]'
          ]"
        >
          <div class="flex items-center gap-3">
            <component :is="item.icon" class="h-4 w-4 stroke-[2.5]" />
            <span>{{ item.label }}</span>
          </div>
          <span
            v-if="item.badge"
            :class="[
              'text-[10px] px-1.5 py-0.5 rounded font-black border-1.5 border-black shadow-[1px_1px_0px_#000]',
              route.path === item.path
                ? 'bg-black text-white'
                : 'bg-[#FF6B6B] text-black'
            ]"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>

      <!-- Active Profile Mini Widget -->
      <div class="p-3 border-t-3 border-black bg-[#FAF8F5]">
        <div
          @click="router.push('/team')"
          class="p-2.5 rounded-xl bg-white hover:bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] flex items-center justify-between cursor-pointer transition-all group"
          title="Klik untuk membuka direktori tim & ganti profil aktif"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="h-8 w-8 rounded-lg bg-[#C4B5FD] text-black font-black text-xs flex items-center justify-center flex-shrink-0 border-2 border-black shadow-[1px_1px_0px_#000]">
              {{ stakeholderStore.currentUser.name.slice(0, 2).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="text-[11px] font-black text-black truncate">
                {{ stakeholderStore.currentUser.name }}
              </div>
              <div class="text-[9px] font-bold text-black/60 truncate leading-tight">
                {{ stakeholderStore.currentUser.role }}
              </div>
            </div>
          </div>
          <span class="text-[10px] font-black text-black bg-[#FFE600] px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] opacity-0 group-hover:opacity-100 transition-opacity">
            Ganti
          </span>
        </div>
      </div>

      <!-- Bottom PTT Quick Action -->
      <div class="p-4 border-t-3 border-black space-y-3 bg-[#FFFDF5]">
        <div class="flex items-center justify-between text-[11px] font-bold text-black">
          <span class="flex items-center gap-1.5">
            <ShieldCheck class="h-3.5 w-3.5 stroke-[2.5]" />
            E2EE Enkripsi
          </span>
          <kbd class="px-1.5 py-0.5 bg-white text-[10px] rounded border-2 border-black font-mono font-black shadow-[1px_1px_0px_#000]">
            {{ settingStore.globalHotkey }}
          </kbd>
        </div>

        <!-- Push to Talk Mic Button (Neobrutalism) -->
        <button
          @click="togglePtt"
          :class="[
            'w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all border-2 border-black neo-btn',
            chatStore.isRecording
              ? 'bg-[#FF4D4D] text-white shadow-[3px_3px_0px_#000] animate-pulse'
              : 'bg-[#FFE600] hover:bg-[#FACC15] text-black shadow-[3px_3px_0px_#000]'
          ]"
        >
          <Mic class="h-4 w-4 stroke-[2.5]" :class="{ 'animate-bounce': chatStore.isRecording }" />
          <span>{{ chatStore.isRecording ? `Merekam (${chatStore.recordingDuration}s)...` : 'Bicara (Push-to-Talk)' }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full overflow-hidden bg-[#FAF8F5]">
      <router-view />
    </main>
  </div>
</template>
