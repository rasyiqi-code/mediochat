<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  CheckCircle2, ArrowRight, Plus, Search, Trash2, ArrowLeft, RefreshCw, Check
} from 'lucide-vue-next';
import { useTaskStore } from '@/stores/useTaskStore';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import type { Division, TaskItem, TaskPriority } from '@/types';
import { getDivisionBadge, getPriorityBadge } from '@/lib/utils';

const taskStore = useTaskStore();
const stakeholderStore = useStakeholderStore();

const divisions = computed<{ id: Division | 'all'; label: string }[]>(() => [
  { id: 'all', label: 'Semua Divisi' },
  ...stakeholderStore.divisions,
]);

const showAddTaskModal = ref(false);
const isCustomDivision = ref(false);
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

  // If user entered a custom division name, register it in stakeholderStore
  if (newTaskForm.value.divisi) {
    stakeholderStore.addDivision(newTaskForm.value.divisi);
  }

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
  isCustomDivision.value = false;
  newTaskForm.value = {
    divisi: stakeholderStore.divisions[0]?.id || 'backend',
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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] text-black font-sans overflow-hidden">
    <!-- Top Header & Filter Controls (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white select-none">
      <div>
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Kanban Tugas AI & Multi-User</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#FFE600] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            {{ taskStore.filteredTasks.length }} Tugas
          </span>
        </h2>
        <p class="text-[11px] font-bold text-black/60">Daftar tugas terurai otomatis dan terpetakan ke stakeholder organisasi</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Assignee Filter -->
        <select
          v-model="taskStore.filterAssignee"
          class="bg-white border-2 border-black rounded-xl px-3 py-1.5 text-xs text-black font-black focus:outline-none shadow-[2px_2px_0px_#000]"
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
          <Search class="h-3.5 w-3.5 text-black absolute left-3 top-2.5 stroke-[2.5]" />
          <input
            v-model="taskStore.searchQuery"
            type="text"
            placeholder="Cari tugas atau personil..."
            class="bg-white border-2 border-black rounded-xl pl-8 pr-3 py-1.5 text-xs text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none w-44"
          />
        </div>

        <button
          @click="showAddTaskModal = true"
          class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black font-black text-xs flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Tambah Tugas</span>
        </button>
      </div>
    </header>

    <!-- Division Filter Chips -->
    <div class="px-6 py-2.5 border-b-3 border-black bg-[#FFFDF5] flex items-center gap-2 overflow-x-auto select-none">
      <button
        v-for="div in divisions"
        :key="div.id"
        @click="taskStore.filterDivisi = div.id"
        :class="[
          'px-3 py-1 rounded-lg text-xs font-black transition-all flex-shrink-0 border-2 border-black',
          taskStore.filterDivisi === div.id
            ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
            : 'bg-white text-black hover:bg-[#FEF08A] shadow-[1.5px_1.5px_0px_#000]'
        ]"
      >
        {{ div.label }}
      </button>
    </div>

    <!-- 3 Kanban Columns (Neobrutalism) -->
    <div class="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto overflow-y-hidden">
      <!-- Column 1: TODO -->
      <div class="flex flex-col bg-[#FFFDF5] border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_#000]">
        <div class="p-3.5 border-b-3 border-black bg-[#FEF08A] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-[#EAB308] border-1.5 border-black"></span>
            <h3 class="text-xs font-black text-black uppercase tracking-wider">Siap Dikerjakan (Todo)</h3>
          </div>
          <span class="text-xs font-mono font-black px-2 py-0.5 bg-white border-2 border-black text-black rounded-md shadow-[1px_1px_0px_#000]">
            {{ taskStore.todoTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="taskStore.todoTasks.length === 0" class="py-12 text-center text-black/50 text-xs font-bold italic">
            Belum ada tugas di kolom ini.
          </div>

          <div
            v-for="task in taskStore.todoTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-white border-2 border-black hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 transition-all space-y-2.5 shadow-[3px_3px_0px_#000] group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] uppercase px-2 py-0.5 rounded', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span :class="['text-[9px] uppercase px-1.5 py-0.5 rounded', getPriorityBadge(task.prioritas)]">
                  {{ task.prioritas }}
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-black/60 hover:text-[#E11D48] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p class="text-xs text-black font-black leading-snug">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assignment Pill -->
            <div class="flex items-center justify-between pt-2 border-t-2 border-black/10 text-[10px]">
              <div class="flex items-center gap-1.5 text-black">
                <span class="h-5 w-5 rounded bg-[#C4B5FD] text-black font-black border border-black flex items-center justify-center text-[9px]">
                  {{ (task.assigneeName || 'U').slice(0, 1).toUpperCase() }}
                </span>
                <span class="font-black text-black truncate max-w-[120px]">
                  {{ task.assigneeName || 'Belum Ditugaskan' }}
                </span>
              </div>

              <!-- Reassign Dropdown -->
              <select
                :value="task.assigneeName || ''"
                @change="(e) => handleReassign(task, (e.target as HTMLSelectElement).value)"
                class="bg-white border-1.5 border-black text-[9px] font-bold rounded px-1.5 py-0.5 text-black focus:outline-none shadow-[1px_1px_0px_#000]"
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
            <div class="flex items-center justify-between pt-1 text-[11px] font-bold text-black/70">
              <span class="text-[10px] text-black/60 truncate max-w-[140px]" :title="task.senderName">
                Dari: {{ task.senderName }}
              </span>
              <button
                @click="taskStore.updateStatus(task.id, 'in_progress')"
                class="text-[10px] font-black text-black bg-[#C4B5FD] hover:bg-[#A78BFA] px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span>Mulai</span>
                <ArrowRight class="h-3 w-3 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: IN PROGRESS -->
      <div class="flex flex-col bg-[#FFFDF5] border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_#000]">
        <div class="p-3.5 border-b-3 border-black bg-[#BAE6FD] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-[#0284C7] border-1.5 border-black"></span>
            <h3 class="text-xs font-black text-black uppercase tracking-wider">Sedang Dikerjakan</h3>
          </div>
          <span class="text-xs font-mono font-black px-2 py-0.5 bg-white border-2 border-black text-black rounded-md shadow-[1px_1px_0px_#000]">
            {{ taskStore.inProgressTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="taskStore.inProgressTasks.length === 0" class="py-12 text-center text-black/50 text-xs font-bold italic">
            Belum ada tugas yang sedang aktif.
          </div>

          <div
            v-for="task in taskStore.inProgressTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-white border-2 border-black hover:shadow-[5px_5px_0px_#000] hover:-translate-y-0.5 transition-all space-y-2.5 shadow-[3px_3px_0px_#000] group"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] uppercase px-2 py-0.5 rounded', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span :class="['text-[9px] uppercase px-1.5 py-0.5 rounded', getPriorityBadge(task.prioritas)]">
                  {{ task.prioritas }}
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-black/60 hover:text-[#E11D48] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p class="text-xs text-black font-black leading-snug">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assignment Pill -->
            <div class="flex items-center justify-between pt-2 border-t-2 border-black/10 text-[10px]">
              <div class="flex items-center gap-1.5 text-black">
                <span class="h-5 w-5 rounded bg-[#BAE6FD] text-black font-black border border-black flex items-center justify-center text-[9px]">
                  {{ (task.assigneeName || 'U').slice(0, 1).toUpperCase() }}
                </span>
                <span class="font-black text-black truncate max-w-[120px]">
                  {{ task.assigneeName || 'Belum Ditugaskan' }}
                </span>
              </div>

              <!-- Reassign Dropdown -->
              <select
                :value="task.assigneeName || ''"
                @change="(e) => handleReassign(task, (e.target as HTMLSelectElement).value)"
                class="bg-white border-1.5 border-black text-[9px] font-bold rounded px-1.5 py-0.5 text-black focus:outline-none shadow-[1px_1px_0px_#000]"
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

            <div class="flex items-center justify-between pt-1 border-t-2 border-black/10 text-[11px] font-bold">
              <button
                @click="taskStore.updateStatus(task.id, 'todo')"
                class="text-[10px] text-black bg-white hover:bg-neutral-100 px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5"
                title="Kembalikan ke Todo"
              >
                <ArrowLeft class="h-3 w-3 stroke-[2.5]" />
                <span>Todo</span>
              </button>

              <button
                @click="taskStore.updateStatus(task.id, 'done')"
                class="text-[10px] font-black text-black bg-[#86EFAC] hover:bg-[#4ADE80] px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5"
              >
                <span>Selesai</span>
                <CheckCircle2 class="h-3 w-3 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: DONE -->
      <div class="flex flex-col bg-[#FFFDF5] border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_#000]">
        <div class="p-3.5 border-b-3 border-black bg-[#BBF7D0] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-[#16A34A] border-1.5 border-black"></span>
            <h3 class="text-xs font-black text-black uppercase tracking-wider">Selesai (Done)</h3>
          </div>
          <span class="text-xs font-mono font-black px-2 py-0.5 bg-white border-2 border-black text-black rounded-md shadow-[1px_1px_0px_#000]">
            {{ taskStore.doneTasks.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <div v-if="taskStore.doneTasks.length === 0" class="py-12 text-center text-black/50 text-xs font-bold italic">
            Belum ada tugas selesai.
          </div>

          <div
            v-for="task in taskStore.doneTasks"
            :key="task.id"
            class="p-3.5 rounded-xl bg-white border-2 border-black hover:shadow-[5px_5px_0px_#000] transition-all space-y-2.5 shadow-[3px_3px_0px_#000] group opacity-90 hover:opacity-100"
          >
            <div class="flex items-center justify-between">
              <span :class="['text-[9px] uppercase px-2 py-0.5 rounded', getDivisionBadge(task.divisi)]">
                {{ task.divisi }}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black bg-[#86EFAC] text-black shadow-[1px_1px_0px_#000]">
                  Selesai
                </span>
                <button
                  @click="deleteTask(task.id)"
                  class="text-black/60 hover:text-[#E11D48] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="Hapus Tugas"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <p class="text-xs text-black/60 font-bold leading-snug line-through">
              {{ task.deskripsi }}
            </p>

            <!-- Stakeholder Assigned -->
            <div class="flex items-center justify-between pt-2 border-t-2 border-black/10 text-[10px]">
              <span class="text-black font-black flex items-center gap-1">
                <Check class="h-3.5 w-3.5 stroke-[3] text-[#16A34A]" />
                Oleh: {{ task.assigneeName || 'Tim' }}
              </span>
              <button
                @click="taskStore.updateStatus(task.id, 'todo')"
                class="text-[10px] text-black bg-white hover:bg-neutral-100 px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 font-bold"
                title="Buka kembali ke Todo"
              >
                <RefreshCw class="h-3 w-3" />
                <span>Buka Kembali</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Tugas Manual (Neobrutalism) -->
    <div
      v-if="showAddTaskModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white border-3 border-black rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[6px_6px_0px_#000]">
        <h3 class="text-base font-black text-black">Tambah Tugas Baru ke Kanban</h3>
        <p class="text-xs font-bold text-black/60">Buat tugas dan tugaskan ke stakeholder organisasi</p>

        <div class="space-y-3 pt-2">
          <div class="space-y-1">
            <label class="text-xs font-black text-black">Deskripsi Tugas</label>
            <textarea
              v-model="newTaskForm.deskripsi"
              rows="3"
              placeholder="Jelaskan aksi spesifik yang perlu dikerjakan..."
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl p-3 text-xs text-black font-bold focus:outline-none focus:shadow-[3px_3px_0px_#000] shadow-[2px_2px_0px_#000]"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-black text-black">Divisi</label>
                <button
                  type="button"
                  @click="isCustomDivision = !isCustomDivision"
                  class="text-[10px] font-black text-black underline hover:text-amber-600 cursor-pointer"
                >
                  {{ isCustomDivision ? 'Pilih dari List' : '+ Divisi Baru' }}
                </button>
              </div>

              <input
                v-if="isCustomDivision"
                v-model="newTaskForm.divisi"
                type="text"
                placeholder="Ketik divisi baru (Marketing, dll)..."
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
              />
              <select
                v-else
                v-model="newTaskForm.divisi"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none capitalize shadow-[2px_2px_0px_#000]"
              >
                <option v-for="d in stakeholderStore.divisions" :key="d.id" :value="d.id">
                  {{ d.label }}
                </option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-black text-black">Prioritas</label>
              <select
                v-model="newTaskForm.prioritas"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none capitalize shadow-[2px_2px_0px_#000]"
              >
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs font-black text-black">Tugaskan ke Stakeholder</label>
              <select
                v-model="newTaskForm.assigneeName"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
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
              <label class="text-xs font-black text-black">Target Deadline</label>
              <input
                v-model="newTaskForm.deadline"
                type="text"
                placeholder="Besok, 17:00"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-black/10">
          <button
            @click="showAddTaskModal = false"
            class="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black text-xs font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Batal
          </button>
          <button
            @click="handleCreateTask"
            class="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            Simpan ke Board
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
