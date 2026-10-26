import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TaskItem, TaskStatus } from '@/types';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<TaskItem[]>([
    {
      id: 't-1',
      divisi: 'backend',
      deskripsi: 'Selesaikan endpoint migrasi database PostgreSQL ke SQLite lokal',
      prioritas: 'tinggi',
      status: 'todo',
      deadline: 'Besok, 17:00',
      senderName: 'Budi (PM)',
      timestamp: '10:15',
    },
    {
      id: 't-2',
      divisi: 'frontend',
      deskripsi: 'Sesuaikan form onboarding (padding & validasi input)',
      prioritas: 'sedang',
      status: 'in_progress',
      deadline: 'Lusa, 12:00',
      senderName: 'Budi (PM)',
      timestamp: '10:15',
    },
    {
      id: 't-3',
      divisi: 'desain',
      deskripsi: 'Buat icon mockup dan color palette dark mode untuk desktop UI',
      prioritas: 'sedang',
      status: 'done',
      deadline: 'Kemarin',
      senderName: 'Citra (Designer)',
      timestamp: '08:45',
    },
    {
      id: 't-4',
      divisi: 'qa',
      deskripsi: 'Uji koneksi audio PTT mikrofon 16kHz di OS Ubuntu dan Windows',
      prioritas: 'tinggi',
      status: 'todo',
      deadline: 'Jumat, 15:00',
      senderName: 'Andi (Lead)',
      timestamp: '11:00',
    },
  ]);

  const filterDivisi = ref<string>('all');
  const searchQuery = ref<string>('');

  const filteredTasks = computed(() => {
    return tasks.value.filter((t) => {
      const matchDivisi = filterDivisi.value === 'all' || t.divisi === filterDivisi.value;
      const matchSearch =
        !searchQuery.value ||
        t.deskripsi.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        t.senderName.toLowerCase().includes(searchQuery.value.toLowerCase());
      return matchDivisi && matchSearch;
    });
  });

  const todoTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'todo'));
  const inProgressTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'in_progress'));
  const doneTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'done'));

  function updateStatus(taskId: string, newStatus: TaskStatus) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
    }
  }

  function addTask(task: TaskItem) {
    tasks.value.unshift(task);
  }

  return {
    tasks,
    filterDivisi,
    searchQuery,
    filteredTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    updateStatus,
    addTask,
  };
});
