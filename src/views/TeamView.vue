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

const divisionTabs = computed<{ id: string; label: string }[]>(() => [
  { id: 'all', label: 'Semua Tim' },
  ...stakeholderStore.divisions,
]);

const isCustomDivision = ref(false);

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
  isCustomDivision.value = false;
  form.value = {
    name: '',
    role: '',
    division: stakeholderStore.divisions[0]?.id || 'backend',
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
  isCustomDivision.value = !stakeholderStore.divisions.some((d) => d.id === s.division);
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

  // Register division if custom
  if (form.value.division) {
    stakeholderStore.addDivision(form.value.division);
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
  isCustomDivision.value = false;
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
  <div class="flex-1 flex flex-col h-full bg-[#FAF8F5] text-black font-sans overflow-y-auto">
    <!-- Header (Neobrutalism) -->
    <header class="h-16 px-6 border-b-3 border-black flex items-center justify-between bg-white sticky top-0 z-10 flex-shrink-0 select-none">
      <div>
        <h2 class="text-sm font-black text-black flex items-center gap-2">
          <span>Direktori Tim & Stakeholder Perusahaan</span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-[#FFE600] text-black border-2 border-black font-black shadow-[1.5px_1.5px_0px_#000]">
            AI Multi-User Context
          </span>
        </h2>
        <p class="text-[11px] font-bold text-black/60">
          Daftar anggota organisasi yang dikenali oleh AI Coordinator untuk pemetaan dan penugasan otomatis
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="openAddModal"
          class="px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black font-black text-xs flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <UserPlus class="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Tambah Stakeholder</span>
        </button>
      </div>
    </header>

    <!-- Main Content Body -->
    <div class="p-6 space-y-6 max-w-7xl mx-auto w-full">
      <!-- Active User Profile Banner -->
      <div class="p-5 rounded-2xl bg-[#FFFDF5] border-3 border-black shadow-[5px_5px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 rounded-2xl bg-[#C4B5FD] border-2 border-black flex items-center justify-center text-black text-xl font-black shadow-[3px_3px_0px_#000]">
            {{ stakeholderStore.currentUser.name.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-[#86EFAC] text-black border-1.5 border-black shadow-[1px_1px_0px_#000] flex items-center gap-1">
                <span class="h-2 w-2 rounded-full bg-[#16A34A] border border-black animate-pulse"></span>
                Profil Aktif Anda di Perangkat Ini
              </span>
              <span :class="['text-[10px] font-black uppercase px-2 py-0.5 rounded', getDivisionBadge(stakeholderStore.currentUser.division)]">
                {{ stakeholderStore.currentUser.division }}
              </span>
            </div>
            <h3 class="text-lg font-black text-black mt-1">{{ stakeholderStore.currentUser.name }}</h3>
            <p class="text-xs font-bold text-black/70">{{ stakeholderStore.currentUser.role }} • {{ stakeholderStore.currentUser.email || 'tanpa email' }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <button
            @click="openEditModal(stakeholderStore.currentUser)"
            class="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <Edit2 class="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Edit Profil Saya</span>
          </button>
        </div>
      </div>

      <!-- Division Tabs & Filter -->
      <div class="flex items-center justify-between gap-4 border-b-3 border-black pb-3 overflow-x-auto select-none">
        <div class="flex items-center gap-2">
          <button
            v-for="tab in divisionTabs"
            :key="tab.id"
            @click="activeDivision = tab.id"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-black flex-shrink-0',
              activeDivision === tab.id
                ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
                : 'bg-white text-black hover:bg-[#FEF08A] shadow-[1.5px_1.5px_0px_#000]'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>

        <span class="text-xs text-black font-mono font-black flex-shrink-0 bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000]">
          {{ filteredStakeholders.length }} stakeholder terdaftar
        </span>
      </div>

      <!-- Stakeholders Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="s in filteredStakeholders"
          :key="s.id"
          :class="[
            'p-4 rounded-2xl border-2 border-black transition-all flex flex-col justify-between space-y-4 relative group shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1',
            s.isCurrentUser
              ? 'bg-[#FEF08A]/30 border-black'
              : 'bg-white'
          ]"
        >
          <!-- Card Header -->
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="h-11 w-11 rounded-xl bg-[#FEF08A] text-black border-2 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#000]">
                  {{ s.name.slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <h4 class="text-xs font-black text-black tracking-tight">{{ s.name }}</h4>
                    <span v-if="s.isCurrentUser" class="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_#000]">
                      Anda
                    </span>
                  </div>
                  <p class="text-[11px] font-bold text-black/60 leading-tight">{{ s.role }}</p>
                </div>
              </div>

              <span :class="['text-[9px] uppercase px-2 py-0.5 rounded', getDivisionBadge(s.division)]">
                {{ s.division }}
              </span>
            </div>

            <!-- Skills Chips -->
            <div v-if="s.skills && s.skills.length" class="flex flex-wrap gap-1 pt-1">
              <span
                v-for="skill in s.skills"
                :key="skill"
                class="text-[9px] px-2 py-0.5 rounded bg-[#FFFDF5] text-black border border-black font-mono font-bold shadow-[1px_1px_0px_#000]"
              >
                {{ skill }}
              </span>
            </div>

            <!-- Contacts & Handles -->
            <div class="space-y-1 text-[11px] font-semibold text-black/70 pt-1">
              <div v-if="s.email" class="flex items-center gap-1.5 truncate">
                <Mail class="h-3.5 w-3.5 text-black stroke-[2.5]" />
                <span class="truncate">{{ s.email }}</span>
              </div>
              <div v-if="s.platformHandles?.telegram" class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono text-black font-black bg-[#7DD3FC] px-1 rounded border border-black">TG:</span>
                <span class="font-bold">{{ s.platformHandles.telegram }}</span>
              </div>
            </div>
          </div>

          <!-- Card Footer & Actions -->
          <div class="pt-3 border-t-2 border-black/10 flex items-center justify-between text-xs">
            <!-- Assigned Tasks Stat -->
            <div class="flex items-center gap-1.5 text-black font-bold text-[11px]">
              <Kanban class="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{{ getAssignedTasksCount(s.name) }} tugas aktif</span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1.5">
              <button
                v-if="!s.isCurrentUser"
                @click="makeCurrentUser(s.id)"
                class="px-2.5 py-1 rounded-lg text-[10px] font-black text-black bg-[#FFE600] hover:bg-[#FACC15] border border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                title="Alihkan profil operator saat ini ke stakeholder ini"
              >
                Jadikan Saya
              </button>

              <button
                @click="openEditModal(s)"
                class="p-1 rounded-lg bg-white hover:bg-neutral-100 text-black border border-black shadow-[1px_1px_0px_#000] transition-colors"
                title="Edit data stakeholder"
              >
                <Edit2 class="h-3 w-3 stroke-[2.5]" />
              </button>

              <button
                v-if="!s.isCurrentUser"
                @click="deleteStakeholder(s.id)"
                class="p-1 rounded-lg bg-white hover:bg-[#FDA4AF] text-black border border-black shadow-[1px_1px_0px_#000] transition-colors"
                title="Hapus stakeholder"
              >
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit Stakeholder) (Neobrutalism) -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="w-full max-w-lg bg-white border-3 border-black rounded-2xl shadow-[6px_6px_0px_#000] p-6 space-y-5">
        <div class="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <h3 class="text-base font-black text-black flex items-center gap-2">
            <Users class="h-4.5 w-4.5 stroke-[2.5]" />
            <span>{{ isEditing ? 'Edit Stakeholder' : 'Tambah Stakeholder Baru' }}</span>
          </h3>
          <button @click="showModal = false" class="text-black hover:bg-neutral-100 p-1 rounded-lg border border-black">
            <X class="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        <form @submit.prevent="saveStakeholder" class="space-y-4 text-xs">
          <div>
            <label class="block text-black font-black mb-1">Nama Lengkap</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Contoh: Rasyiqi Akbar"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-black font-black mb-1">Role / Posisi Jabatan</label>
              <input
                v-model="form.role"
                type="text"
                placeholder="Contoh: Senior Backend Engineer"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
                required
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-black font-black">Divisi Organisasi</label>
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
                v-model="form.division"
                type="text"
                placeholder="Ketik divisi baru (Marketing, Legal, dll)..."
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
                required
              />
              <select
                v-else
                v-model="form.division"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold shadow-[2px_2px_0px_#000] focus:outline-none capitalize"
              >
                <option v-for="d in stakeholderStore.divisions" :key="d.id" :value="d.id">
                  {{ d.label }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-black font-black mb-1">Email Perusahaan</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="nama@perusahaan.co.id"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-black font-black mb-1">Keahlian & Domain (pisahkan dengan koma)</label>
            <input
              v-model="form.skillsText"
              type="text"
              placeholder="Rust, PostgreSQL, Redis, Docker, Microservices"
              class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
            />
            <p class="text-[10px] text-black/60 font-semibold mt-1">AI Coordinator akan membaca keahlian ini untuk menugaskan sprint secara akurat.</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-black font-black mb-1">Username Telegram</label>
              <input
                v-model="form.telegram"
                type="text"
                placeholder="@username"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-black font-black mb-1">Akun Slack</label>
              <input
                v-model="form.slack"
                type="text"
                placeholder="nama.user"
                class="w-full bg-[#FFFDF5] border-2 border-black rounded-xl px-3 py-2 text-black font-bold placeholder:text-black/40 shadow-[2px_2px_0px_#000] focus:outline-none"
              />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="isCurrentUser"
              v-model="form.isCurrentUser"
              type="checkbox"
              class="h-4 w-4 rounded border-2 border-black text-black focus:ring-0"
            />
            <label for="isCurrentUser" class="text-black font-bold cursor-pointer">
              Tetapkan profil ini sebagai operator aktif perangkat ini ("Saya")
            </label>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-black/10">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-[#FACC15] text-black font-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              {{ isEditing ? 'Simpan Perubahan' : 'Tambahkan ke Tim' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
