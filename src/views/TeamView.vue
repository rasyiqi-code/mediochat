<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Users, UserPlus, Mail, Edit2, Trash2, X, Kanban
} from 'lucide-vue-next';
import { useStakeholderStore } from '@/stores/useStakeholderStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { getDivisionBadge } from '@/lib/utils';
import type { Stakeholder, Division } from '@/types';

const stakeholderStore = useStakeholderStore();
const taskStore = useTaskStore();

const activeDivision = ref<string>('all');
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  name: '',
  role: '',
  division: 'backend' as Division,
  email: '',
  skillsText: '',
  telegram: '',
  slack: '',
  isCurrentUser: false,
});

const divisionTabs = [
  { id: 'all', label: 'Semua Tim' },
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'desain', label: 'UI/UX Desain' },
  { id: 'devops', label: 'DevOps & SRE' },
  { id: 'qa', label: 'QA & Test' },
  { id: 'general', label: 'Management' },
];

const filteredStakeholders = computed(() => {
  if (activeDivision.value === 'all') return stakeholderStore.stakeholders;
  return stakeholderStore.stakeholders.filter((s) => s.division === activeDivision.value);
});

function getAssignedTasksCount(stakeholderName: string) {
  return taskStore.tasks.filter((t) => t.assigneeName === stakeholderName).length;
}

function openAddModal() {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    name: '',
    role: '',
    division: 'backend',
    email: '',
    skillsText: '',
    telegram: '',
    slack: '',
    isCurrentUser: false,
  };
  showModal.value = true;
}

function openEditModal(s: Stakeholder) {
  isEditing.value = true;
  editingId.value = s.id;
  form.value = {
    name: s.name,
    role: s.role,
    division: s.division,
    email: s.email || '',
    skillsText: s.skills ? s.skills.join(', ') : '',
    telegram: s.platformHandles?.telegram || '',
    slack: s.platformHandles?.slack || '',
    isCurrentUser: !!s.isCurrentUser,
  };
  showModal.value = true;
}

function saveStakeholder() {
  if (!form.value.name.trim() || !form.value.role.trim()) {
    alert('Nama dan Role wajib diisi');
    return;
  }

  const skills = form.value.skillsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    name: form.value.name.trim(),
    role: form.value.role.trim(),
    division: form.value.division,
    email: form.value.email.trim() || undefined,
    skills,
    platformHandles: {
      telegram: form.value.telegram.trim() || undefined,
      slack: form.value.slack.trim() || undefined,
    },
    isCurrentUser: form.value.isCurrentUser,
    status: 'online' as const,
  };

  if (isEditing.value && editingId.value) {
    stakeholderStore.updateStakeholder(editingId.value, payload);
  } else {
    stakeholderStore.addStakeholder(payload);
  }

  showModal.value = false;
}

function deleteStakeholder(id: string) {
  if (confirm('Hapus stakeholder ini dari direktori tim?')) {
    stakeholderStore.deleteStakeholder(id);
  }
}

function makeCurrentUser(id: string) {
  stakeholderStore.setCurrentUser(id);
}
</script>

<template>
  <div class="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
    <!-- Header -->
    <header class="h-16 px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
      <div>
        <h2 class="text-sm font-semibold text-white flex items-center gap-2">
          <span>Direktori Tim & Stakeholder Perusahaan</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
            AI Multi-User Context
          </span>
        </h2>
        <p class="text-xs text-slate-400">
          Daftar anggota organisasi yang dikenali oleh AI Coordinator untuk pemetaan dan penugasan otomatis
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="openAddModal"
          class="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30"
        >
          <UserPlus class="h-3.5 w-3.5" />
          <span>Tambah Stakeholder</span>
        </button>
      </div>
    </header>

    <!-- Main Content Body -->
    <div class="p-6 space-y-6 max-w-7xl mx-auto w-full">
      <!-- Active User Profile Banner -->
      <div class="p-5 rounded-2xl bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/40 border border-violet-500/30 shadow-xl shadow-violet-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-600/40">
            {{ stakeholderStore.currentUser.name.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Profil Aktif Anda di Perangkat Ini
              </span>
              <span :class="['text-[10px] font-bold uppercase px-2 py-0.5 rounded border', getDivisionBadge(stakeholderStore.currentUser.division)]">
                {{ stakeholderStore.currentUser.division }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-white mt-1">{{ stakeholderStore.currentUser.name }}</h3>
            <p class="text-xs text-slate-300">{{ stakeholderStore.currentUser.role }} • {{ stakeholderStore.currentUser.email || 'tanpa email' }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            @click="openEditModal(stakeholderStore.currentUser)"
            class="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Edit2 class="h-3.5 w-3.5" />
            <span>Edit Profil Saya</span>
          </button>
        </div>
      </div>

      <!-- Division Tabs & Filter -->
      <div class="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <div class="flex items-center gap-1.5">
          <button
            v-for="tab in divisionTabs"
            :key="tab.id"
            @click="activeDivision = tab.id"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              activeDivision === tab.id
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>

        <span class="text-xs text-slate-400 font-mono flex-shrink-0">
          {{ filteredStakeholders.length }} stakeholder terdaftar
        </span>
      </div>

      <!-- Stakeholders Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="s in filteredStakeholders"
          :key="s.id"
          :class="[
            'p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative group',
            s.isCurrentUser
              ? 'bg-violet-950/20 border-violet-500/40 shadow-lg shadow-violet-950/20'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          ]"
        >
          <!-- Card Header -->
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-sm border border-slate-700">
                  {{ s.name.slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <h4 class="text-xs font-bold text-white tracking-tight">{{ s.name }}</h4>
                    <span v-if="s.isCurrentUser" class="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Anda
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 leading-tight">{{ s.role }}</p>
                </div>
              </div>

              <span :class="['text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border', getDivisionBadge(s.division)]">
                {{ s.division }}
              </span>
            </div>

            <!-- Skills Chips -->
            <div v-if="s.skills && s.skills.length" class="flex flex-wrap gap-1 pt-1">
              <span
                v-for="skill in s.skills"
                :key="skill"
                class="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60 font-mono"
              >
                {{ skill }}
              </span>
            </div>

            <!-- Contacts & Handles -->
            <div class="space-y-1 text-[11px] text-slate-400 pt-1">
              <div v-if="s.email" class="flex items-center gap-1.5 truncate">
                <Mail class="h-3 w-3 text-slate-500" />
                <span class="truncate">{{ s.email }}</span>
              </div>
              <div v-if="s.platformHandles?.telegram" class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono text-sky-400">TG:</span>
                <span>{{ s.platformHandles.telegram }}</span>
              </div>
            </div>
          </div>

          <!-- Card Footer & Actions -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <!-- Assigned Tasks Stat -->
            <div class="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Kanban class="h-3.5 w-3.5 text-slate-500" />
              <span>{{ getAssignedTasksCount(s.name) }} tugas aktif</span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1">
              <button
                v-if="!s.isCurrentUser"
                @click="makeCurrentUser(s.id)"
                class="px-2 py-1 rounded-lg text-[10px] font-semibold text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 transition-all"
                title="Alihkan profil operator saat ini ke stakeholder ini"
              >
                Jadikan Saya
              </button>

              <button
                @click="openEditModal(s)"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Edit data stakeholder"
              >
                <Edit2 class="h-3 w-3" />
              </button>

              <button
                v-if="!s.isCurrentUser"
                @click="deleteStakeholder(s.id)"
                class="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Hapus stakeholder"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit Stakeholder) -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <Users class="h-4 w-4 text-violet-400" />
            <span>{{ isEditing ? 'Edit Stakeholder' : 'Tambah Stakeholder Baru' }}</span>
          </h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-white">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveStakeholder" class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Rasyiqi Akbar"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Role / Posisi Jabatan</label>
              <input
                v-model="form.role"
                type="text"
                placeholder="Contoh: Senior Backend Engineer"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label class="block text-slate-300 font-semibold mb-1">Divisi Organisasi</label>
              <select
                v-model="form.division"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="desain">UI/UX Desain</option>
                <option value="devops">DevOps & Cloud</option>
                <option value="qa">QA Testing</option>
                <option value="general">Management / Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Email Perusahaan</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="nama@perusahaan.co.id"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label class="block text-slate-300 font-semibold mb-1">Keahlian & Domain (pisahkan dengan koma)</label>
            <input
              v-model="form.skillsText"
              type="text"
              placeholder="Rust, PostgreSQL, Redis, Docker, Microservices"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <p class="text-[10px] text-slate-500 mt-1">AI Coordinator akan membaca keahlian ini untuk menugaskan sprint secara akurat.</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Username Telegram</label>
              <input
                v-model="form.telegram"
                type="text"
                placeholder="@username"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Akun Slack</label>
              <input
                v-model="form.slack"
                type="text"
                placeholder="nama.user"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="isCurrentUser"
              v-model="form.isCurrentUser"
              type="checkbox"
              class="rounded bg-slate-950 border-slate-800 text-violet-600 focus:ring-0"
            />
            <label for="isCurrentUser" class="text-slate-300 cursor-pointer">
              Tetapkan profil ini sebagai operator aktif perangkat ini ("Saya")
            </label>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-md shadow-violet-600/30 transition-all"
            >
              {{ isEditing ? 'Simpan Perubahan' : 'Tambahkan ke Tim' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
