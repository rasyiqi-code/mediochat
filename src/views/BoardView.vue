<script setup lang="ts">
import { 
  CheckCircle2, Clock, ArrowRight, User
} from 'lucide-vue-next';
import { useTaskStore } from '@/stores/useTaskStore';
import type { Division } from '@/types';

const taskStore = useTaskStore();

const divisions: { id: Division | 'all'; label: string }[] = [
  { id: 'all', label: 'Semua Divisi' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'desain', label: 'Desain' },
  { id: 'qa', label: 'QA Testing' },
  { id: 'devops', label: 'DevOps' },
];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'tinggi': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'sedang': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
}

function getDivisionBadge(divisi: Division) {
  switch (divisi) {
    case 'backend': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'frontend': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'desain': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
    case 'qa': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'devops': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Top Header & Filter Controls -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Kanban Tugas AI</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
            Auto-Decomposed
          </span>
        </h2>
        <p class="text-xs text-slate-400">Daftar tugas otomatis terurai dari voice note rapat dan percakapan tim</p>
      </div>

      <!-- Division Pill Filter -->
      <div class="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          v-for="div in divisions"
          :key="div.id"
          @click="taskStore.filterDivisi = div.id"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
            taskStore.filterDivisi === div.id
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          {{ div.label }}
        </button>
      </div>
    </header>

    <!-- 3 Kanban Columns -->
    <div class="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto overflow-y-hidden">
      <!-- Column 1: TODO -->
      <div class="flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Siap Dikerjakan</h3>
          </div>
          <span class="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
            {{ taskStore.todoTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div
            v-for="task in taskStore.todoTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <span :class="['text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border', getPriorityBadge(task.prioritas)]">
                {{ task.prioritas }}
              </span>
            </div>

            <p class="text-xs text-slate-200 font-medium leading-snug">
              {{ task.deskripsi }}
            </p>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
              <span class="flex items-center gap-1">
                <User class="h-3 w-3 text-slate-500" />
                {{ task.senderName }}
              </span>
              <button
                @click="taskStore.updateStatus(task.id, 'in_progress')"
                class="text-[10px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
              >
                <span>Mulai</span>
                <ArrowRight class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: IN PROGRESS -->
      <div class="flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-cyan-400"></span>
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Sedang Dikerjakan</h3>
          </div>
          <span class="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
            {{ taskStore.inProgressTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div
            v-for="task in taskStore.inProgressTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all space-y-2.5 shadow-sm group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <span :class="['text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border', getPriorityBadge(task.prioritas)]">
                {{ task.prioritas }}
              </span>
            </div>

            <p class="text-xs text-slate-200 font-medium leading-snug">
              {{ task.deskripsi }}
            </p>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3 text-cyan-400" />
                {{ task.deadline || 'Hari ini' }}
              </span>
              <button
                @click="taskStore.updateStatus(task.id, 'done')"
                class="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-opacity"
              >
                <span>Selesai</span>
                <CheckCircle2 class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: DONE -->
      <div class="flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Selesai</h3>
          </div>
          <span class="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
            {{ taskStore.doneTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div
            v-for="task in taskStore.doneTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <span class="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 class="h-3 w-3" />
                Selesai
              </span>
            </div>

            <p class="text-xs text-slate-400 line-through leading-snug">
              {{ task.deskripsi }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
