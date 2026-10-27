import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TaskItem, TaskStatus } from '@/types';

const STORAGE_TASK_KEY = 'mediochat_tasks_v1';

export const useTaskStore = defineStore('task', () => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_TASK_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const tasks = ref<TaskItem[]>(saved || []);

  const filterDivisi = ref<string>('all');
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
    searchQuery,
    filteredTasks,
    todoTasks,
    inProgressTasks,
    doneTasks,
    updateStatus,
    addTask,
    deleteTask,
    clearTasks,
  };
});
