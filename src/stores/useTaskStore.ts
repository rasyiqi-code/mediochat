import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TaskItem, TaskStatus } from '@/types';

const STORAGE_TASK_KEY = 'mediochat_tasks_v1';

export const useTaskStore = defineStore('task', () => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_TASK_KEY);
      if (!raw) return [];
      const parsed: TaskItem[] = JSON.parse(raw);
      // Auto-purge legacy dummy tasks and fake non-task name mentions
      const cleaned = parsed
        .filter(
          (t) =>
            !['t-1', 't-2', 't-3', 't-4'].includes(t.id) &&
            t.senderName !== 'Budi (PM)' &&
            t.senderName !== 'Andi (Lead)' &&
            t.senderName !== 'Citra (Designer)' &&
            // Purge tasks that are merely a person's name without any action verb
            t.deskripsi.trim().toLowerCase() !== 'dimas wicaksono'
        )
        .map((t) => {
          // Remap misassigned task from previous fallback
          if (
            t.deskripsi.toLowerCase().includes('dimaswicaksono') &&
            t.deskripsi.toLowerCase().includes('desain')
          ) {
            return {
              ...t,
              divisi: 'desain' as const,
              deskripsi: 'Siapkan desain UI',
              assigneeName: 'Dimas Wicaksono',
              assigneeRole: 'Lead UI/UX & Product Designer',
            };
          }
          return t;
        });
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_TASK_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  })();

  const tasks = ref<TaskItem[]>(saved);

  const filterDivisi = ref<string>('all');
  const filterAssignee = ref<string>('all');
  const searchQuery = ref<string>('');

  function persist() {
    try {
      localStorage.setItem(STORAGE_TASK_KEY, JSON.stringify(tasks.value));
    } catch (e) {
      console.warn('Gagal menyimpan task ke storage:', e);
    }
  }

  const filteredTasks = computed(() => {
    return tasks.value.filter((t) => {
      const matchDivisi = filterDivisi.value === 'all' || t.divisi === filterDivisi.value;
      const matchAssignee = filterAssignee.value === 'all' || t.assigneeName === filterAssignee.value;
      const matchSearch =
        !searchQuery.value ||
        t.deskripsi.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        t.senderName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(searchQuery.value.toLowerCase()));
      return matchDivisi && matchAssignee && matchSearch;
    });
  });

  const todoTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'todo'));
  const inProgressTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'in_progress'));
  const doneTasks = computed(() => filteredTasks.value.filter((t) => t.status === 'done'));

  function updateStatus(taskId: string, newStatus: TaskStatus) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
      persist();
    }
  }

  function assignTask(taskId: string, assigneeName: string, assigneeRole?: string, assigneeId?: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      task.assigneeName = assigneeName;
      task.assigneeRole = assigneeRole;
      task.assigneeId = assigneeId;
      persist();
    }
  }

  function addTask(task: TaskItem) {
    tasks.value.unshift(task);
    persist();
  }

  function deleteTask(taskId: string) {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    persist();
  }

  function clearTasks() {
    tasks.value = [];
    persist();
  }

  return {
    tasks,
    filterDivisi,
    filterAssignee,
    searchQuery,
    filteredTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    updateStatus,
    assignTask,
    addTask,
    deleteTask,
    clearTasks,
  };
});
