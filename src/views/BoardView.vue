<script setup lang="ts">
import { ref } from 'vue';
import { 
  CheckCircle2, ArrowRight, Plus, Search, Trash2, ArrowLeft, RefreshCw, Check
} from 'lucide-vue-next';
import { useTaskStore } from '@/stores/useTaskStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import type { Division, TaskItem, TaskPriority } from '@/types';
import { getDivisionBadge, getPriorityBadge } from '@/lib/utils';

const taskStore = useTaskStore();
const stakeholderStore = useStakeholderStore();

const divisions: { id: Division | 'all'; label: string }[] = [
  { id: 'all', label: 'Semua Divisi' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'desain', label: 'Desain' },
  { id: 'qa', label: 'QA Testing' },
  { id: 'devops', label: 'DevOps' },
  { id: 'general', label: 'General' },
];

const showAddTaskModal = ref(false);
const newTaskForm = ref<{
  divisi: Division;
  deskripsi: string;
  prioritas: TaskPriority;
  deadline: string;
  assigneeName: string;
}>({
  divisi: 'backend',
  deskripsi: '',
  prioritas: 'sedang',
  deadline: 'Besok, 17:00',
  assigneeName: '',
});

function handleCreateTask() {
  if (!newTaskForm.value.deskripsi.trim()) return;

  const current = stakeholderStore.currentUser;
  const assigned = newTaskForm.value.assigneeName.trim() || current.name;
  const matched = stakeholderStore.findStakeholderByName(assigned);

  const newTask: TaskItem = {
    id: `t-${Date.now()}`,
    divisi: newTaskForm.value.divisi,
    deskripsi: newTaskForm.value.deskripsi.trim(),
    prioritas: newTaskForm.value.prioritas,
    status: 'todo',
    deadline: newTaskForm.value.deadline.trim() || 'Tidak ada',
    senderName: `${current.name} (${current.role})`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    assigneeName: assigned,
    assigneeRole: matched?.role || '',
    assigneeId: matched?.id,
  };

  taskStore.addTask(newTask);
  showAddTaskModal.value = false;
  newTaskForm.value = {
    divisi: 'backend',
    deskripsi: '',
    prioritas: 'sedang',
    deadline: 'Besok, 17:00',
    assigneeName: '',
  };
}

function deleteTask(id: string) {
  taskStore.deleteTask(id);
}

function handleReassign(task: TaskItem, newAssigneeName: string) {
  const matched = stakeholderStore.findStakeholderByName(newAssigneeName);
  taskStore.assignTask(task.id, newAssigneeName, matched?.role, matched?.id);
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
    <!-- Top Header & Filter Controls -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Kanban Tugas AI & Multi-User</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
            {{ taskStore.filteredTasks.length }} Tugas
          </span>
        </h2>
        <p class="text-xs text-slate-400">Daftar tugas terurai otomatis dan terpetakan ke stakeholder organisasi</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Assignee Filter -->
        <select
          v-model="taskStore.filterAssignee"
          class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="all">Semua Stakeholder</option>
          <option
            v-for="s in stakeholderStore.stakeholders"
            :key="s.id"
            :value="s.name"
          >
            {{ s.name }} ({{ s.division }})
          </option>
        </select>

        <!-- Search Input -->
        <div class="relative">
          <Search class="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            v-model="taskStore.searchQuery"
            type="text"
            placeholder="Cari tugas atau personil..."
            class="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-44"
          />
        </div>

        <button
          @click="showAddTaskModal = true"
          class="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Tambah Tugas</span>
        </button>
      </div>
    </header>

    <!-- Division Filter Chips -->
    <div class="px-6 py-2.5 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto">
      <button
        v-for="div in divisions"
        :key="div.id"
        @click="taskStore.filterDivisi = div.id"
        :class="[
          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0',
          taskStore.filterDivisi === div.id
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
        ]"
      >
        {{ div.label }}
      </button>
    </div>

    <!-- 3 Kanban Columns -->
    <div class="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto overflow-y-hidden">
      <!-- Column 1: TODO -->
      <div class="flex flex-col bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Siap Dikerjakan (Todo)</h3>
          </div>
          <span class="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
            {{ taskStore.todoTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="taskStore.todoTasks.length === 0" class="py-12 text-center text-slate-500 text-xs italic">
            Belum ada tugas di kolom ini.
          </div>

          <div
            v-for="task in taskStore.todoTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span :class="['text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border', getPriorityBadge(task.prioritas)]">
                  {{ task.prioritas }}
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
            </div>

            <p class="text-xs text-slate-200 font-medium leading-snug">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assignment Pill -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <div class="flex items-center gap-1.5 text-slate-400">
                <span class="h-5 w-5 rounded-md bg-violet-600/20 text-violet-300 font-bold flex items-center justify-center text-[9px]">
                  {{ (task.assigneeName || 'U').slice(0, 1).toUpperCase() }}
                </span>
                <span class="font-semibold text-emerald-400 truncate max-w-[120px]">
                  {{ task.assigneeName || 'Belum Ditugaskan' }}
                </span>
              </div>

              <!-- Reassign Dropdown -->
              <select
                :value="task.assigneeName || ''"
                @change="(e) => handleReassign(task, (e.target as HTMLSelectElement).value)"
                class="bg-slate-900 border border-slate-800 text-[9px] rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:border-violet-500"
              >
                <option value="" disabled>Alihkan...</option>
                <option
                  v-for="s in stakeholderStore.stakeholders"
                  :key="s.id"
                  :value="s.name"
                >
                  {{ s.name }}
                </option>
              </select>
            </div>

            <!-- Footer Action -->
            <div class="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span class="text-[10px] text-slate-500 truncate max-w-[140px]" :title="task.senderName">
                Dari: {{ task.senderName }}
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
          <div v-if="taskStore.inProgressTasks.length === 0" class="py-12 text-center text-slate-500 text-xs italic">
            Belum ada tugas yang sedang aktif.
          </div>

          <div
            v-for="task in taskStore.inProgressTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-500/40 transition-all space-y-2.5 shadow-sm group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span :class="['text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border', getPriorityBadge(task.prioritas)]">
                  {{ task.prioritas }}
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
            </div>

            <p class="text-xs text-slate-200 font-medium leading-snug">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assignment Pill -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <div class="flex items-center gap-1.5 text-slate-400">
                <span class="h-5 w-5 rounded-md bg-cyan-600/20 text-cyan-300 font-bold flex items-center justify-center text-[9px]">
                  {{ (task.assigneeName || 'U').slice(0, 1).toUpperCase() }}
                </span>
                <span class="font-semibold text-cyan-400 truncate max-w-[120px]">
                  {{ task.assigneeName || 'Belum Ditugaskan' }}
                </span>
              </div>

              <!-- Reassign Dropdown -->
              <select
                :value="task.assigneeName || ''"
                @change="(e) => handleReassign(task, (e.target as HTMLSelectElement).value)"
                class="bg-slate-900 border border-slate-800 text-[9px] rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="" disabled>Alihkan...</option>
                <option
                  v-for="s in stakeholderStore.stakeholders"
                  :key="s.id"
                  :value="s.name"
                >
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
              <button
                @click="taskStore.updateStatus(task.id, 'todo')"
                class="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                title="Kembalikan ke Todo"
              >
                <ArrowLeft class="h-3 w-3" />
                <span>Todo</span>
              </button>

              <button
                @click="taskStore.updateStatus(task.id, 'done')"
                class="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
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
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Selesai (Done)</h3>
          </div>
          <span class="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
            {{ taskStore.doneTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="taskStore.doneTasks.length === 0" class="py-12 text-center text-slate-500 text-xs italic">
            Belum ada tugas selesai.
          </div>

          <div
            v-for="task in taskStore.doneTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-2.5 shadow-sm group opacity-85 hover:opacity-100"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Selesai
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3 w-3" />
                </button>
              </div>
            </div>

            <p class="text-xs text-slate-300 font-medium leading-snug line-through opacity-80">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assigned -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
              <span class="text-emerald-400 font-medium flex items-center gap-1">
                <Check class="h-3 w-3" />
                Diselesaikan oleh: {{ task.assigneeName || 'Tim' }}
              </span>
              <button
                @click="taskStore.updateStatus(task.id, 'todo')"
                class="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Buka kembali ke Todo"
              >
                <RefreshCw class="h-2.5 w-2.5" />
                <span>Buka Kembali</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Tugas Manual -->
    <div
      v-if="showAddTaskModal"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <h3 class="text-sm font-bold text-white">Tambah Tugas Baru ke Kanban</h3>
        <p class="text-xs text-slate-400">Buat tugas dan tugaskan ke stakeholder organisasi</p>

        <div class="space-y-3 pt-2">
          <div class="space-y-1">
            <label class="text-xs font-medium text-slate-300">Deskripsi Tugas</label>
            <textarea
              v-model="newTaskForm.deskripsi"
              rows="3"
              placeholder="Jelaskan aksi spesifik yang perlu dikerjakan..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Divisi</label>
              <select
                v-model="newTaskForm.divisi"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 capitalize"
              >
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="desain">Desain</option>
                <option value="qa">QA Testing</option>
                <option value="devops">DevOps</option>
                <option value="general">General</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Prioritas</label>
              <select
                v-model="newTaskForm.prioritas"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 capitalize"
              >
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Tugaskan ke Stakeholder</label>
              <select
                v-model="newTaskForm.assigneeName"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">Pilih Stakeholder...</option>
                <option
                  v-for="s in stakeholderStore.stakeholders"
                  :key="s.id"
                  :value="s.name"
                >
                  {{ s.name }} ({{ s.role }})
                </option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-slate-300">Target Deadline</label>
              <input
                v-model="newTaskForm.deadline"
                type="text"
                placeholder="Besok, 17:00"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            @click="showAddTaskModal = false"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-all"
          >
            Batal
          </button>
          <button
            @click="handleCreateTask"
            class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/30"
          >
            Simpan ke Board
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
