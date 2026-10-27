<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { 
  MessageSquare, Kanban, Users, FolderKey, Wifi, Settings, 
  Mic, Radio, ShieldCheck
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
        await processTaskDecomposition(res.transcript, `${stakeholderStore.currentUser.name} (Voice PTT)`, true);
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
  <div class="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
    <!-- Desktop Sidebar -->
    <aside class="w-64 flex-shrink-0 flex flex-col justify-between border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl select-none">
      <!-- Top Branding -->
      <div class="p-5 border-b border-slate-800/60">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio class="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 class="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              MedioChat
              <span class="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
                P2P
              </span>
            </h1>
            <p class="text-[11px] text-slate-400">Team AI Bridge</p>
          </div>
        </div>

        <!-- Connection Badge -->
        <div class="mt-4 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-slate-300 font-medium text-[11px]">LAN Mesh: Aktif</span>
          </div>
          <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {{ deviceStore.devices.filter(d => d.isOnline).length }} peers
          </span>
        </div>
      </div>

      <!-- Nav Items -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="router.push(item.path)"
          :class="[
            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group',
            route.path === item.path
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          ]"
        >
          <div class="flex items-center gap-3">
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </div>
          <span
            v-if="item.badge"
            :class="[
              'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
              route.path === item.path
                ? 'bg-white/20 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-700/60'
            ]"
          >
            {{ item.badge }}
          </span>
        </button>
      </nav>

      <!-- Active Profile Mini Widget -->
      <div class="px-4 py-2 border-t border-slate-800/60 bg-slate-900/30">
        <div
          @click="router.push('/team')"
          class="p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-violet-500/40 flex items-center justify-between cursor-pointer transition-all group"
          title="Klik untuk membuka direktori tim & ganti profil aktif"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="h-7 w-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
              {{ stakeholderStore.currentUser.name.slice(0, 2).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="text-[11px] font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                {{ stakeholderStore.currentUser.name }}
              </div>
              <div class="text-[9px] text-slate-400 truncate leading-tight">
                {{ stakeholderStore.currentUser.role }}
              </div>
            </div>
          </div>
          <span class="text-[9px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Ganti
          </span>
        </div>
      </div>

      <!-- Bottom PTT Quick Action -->
      <div class="p-4 border-t border-slate-800/60 space-y-3">
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5">
            <ShieldCheck class="h-3.5 w-3.5 text-violet-400" />
            E2EE Enkripsi
          </span>
          <kbd class="px-1.5 py-0.5 bg-slate-800 text-[10px] rounded border border-slate-700 font-mono text-slate-300">
            {{ settingStore.globalHotkey }}
          </kbd>
        </div>

        <!-- Push to Talk Mic Button -->
        <button
          @click="togglePtt"
          :class="[
            'w-full py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-lg',
            chatStore.isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/40'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750 hover:border-violet-500/50'
          ]"
        >
          <Mic class="h-4 w-4" :class="{ 'animate-bounce': chatStore.isRecording }" />
          <span>{{ chatStore.isRecording ? `Merekam (${chatStore.recordingDuration}s)...` : 'Bicara (Push-to-Talk)' }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      <router-view />
    </main>
  </div>
</template>
