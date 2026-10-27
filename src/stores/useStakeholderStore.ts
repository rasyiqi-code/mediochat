import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Stakeholder, Division } from '@/types';

const STORAGE_STAKEHOLDERS_KEY = 'mediochat_stakeholders_v1';

export const DEFAULT_STAKEHOLDERS: Stakeholder[] = [
  {
    id: 'sh-1',
    name: 'Budi Santoso',
    role: 'Engineering Manager & Tech Lead',
    division: 'general',
    email: 'budi.santoso@perusahaan.co.id',
    skills: ['Architecture', 'Sprint Planning', 'Code Review', 'Risk Management'],
    platformHandles: {
      telegram: '@budisantoso_pm',
      slack: 'budi.santoso',
    },
    isCurrentUser: true,
    status: 'online',
  },
  {
    id: 'sh-2',
    name: 'Andi Pratama',
    role: 'Principal Backend Engineer',
    division: 'backend',
    email: 'andi.pratama@perusahaan.co.id',
    skills: ['Rust', 'PostgreSQL', 'Golang', 'gRPC', 'Distributed Systems'],
    platformHandles: {
      telegram: '@andipratama_backend',
      slack: 'andi.pratama',
    },
    isCurrentUser: false,
    status: 'online',
  },
  {
    id: 'sh-3',
    name: 'Citra Dewi',
    role: 'Senior Frontend Engineer',
    division: 'frontend',
    email: 'citra.dewi@perusahaan.co.id',
    skills: ['Vue 3', 'TypeScript', 'Tailwind CSS', 'Vite', 'State Management'],
    platformHandles: {
      telegram: '@citradewi_fe',
      slack: 'citra.dewi',
    },
    isCurrentUser: false,
    status: 'online',
  },
  {
    id: 'sh-4',
    name: 'Dimas Wicaksono',
    role: 'Lead UI/UX & Product Designer',
    division: 'desain',
    email: 'dimas.w@perusahaan.co.id',
    skills: ['Figma', 'Design System', 'User Journey', 'Interactive Prototyping'],
    platformHandles: {
      telegram: '@dimas_ux',
      slack: 'dimas.w',
    },
    isCurrentUser: false,
    status: 'away',
  },
  {
    id: 'sh-5',
    name: 'Eko Prasetyo',
    role: 'Site Reliability & DevOps Engineer',
    division: 'devops',
    email: 'eko.prasetyo@perusahaan.co.id',
    skills: ['Kubernetes', 'Docker', 'CI/CD Pipelines', 'AWS / Cloudflare', 'Security'],
    platformHandles: {
      telegram: '@eko_devops',
      slack: 'eko.prasetyo',
    },
    isCurrentUser: false,
    status: 'online',
  },
  {
    id: 'sh-6',
    name: 'Fani Lestari',
    role: 'QA & Test Automation Specialist',
    division: 'qa',
    email: 'fani.lestari@perusahaan.co.id',
    skills: ['End-to-End Testing', 'Playwright', 'API Testing', 'Bug Audit'],
    platformHandles: {
      telegram: '@fani_qa',
      slack: 'fani.lestari',
    },
    isCurrentUser: false,
    status: 'offline',
  },
];

export const useStakeholderStore = defineStore('stakeholder', () => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_STAKEHOLDERS_KEY);
      if (!raw) return DEFAULT_STAKEHOLDERS;
      const parsed: Stakeholder[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_STAKEHOLDERS;
    } catch {
      return DEFAULT_STAKEHOLDERS;
    }
  })();

  const stakeholders = ref<Stakeholder[]>(saved);

  const currentUser = computed<Stakeholder>(() => {
    const active = stakeholders.value.find((s) => s.isCurrentUser);
    return active || stakeholders.value[0] || DEFAULT_STAKEHOLDERS[0];
  });

  function persist() {
    try {
      localStorage.setItem(STORAGE_STAKEHOLDERS_KEY, JSON.stringify(stakeholders.value));
    } catch (e) {
      console.warn('Gagal menyimpan stakeholder ke localStorage:', e);
    }
  }

  function addStakeholder(member: Omit<Stakeholder, 'id'>) {
    const newStakeholder: Stakeholder = {
      ...member,
      id: `sh-${Date.now()}`,
    };
    if (newStakeholder.isCurrentUser) {
      stakeholders.value.forEach((s) => (s.isCurrentUser = false));
    }
    stakeholders.value.push(newStakeholder);
    persist();
    return newStakeholder;
  }

  function updateStakeholder(id: string, updates: Partial<Stakeholder>) {
    const index = stakeholders.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      if (updates.isCurrentUser) {
        stakeholders.value.forEach((s) => (s.isCurrentUser = false));
      }
      stakeholders.value[index] = { ...stakeholders.value[index], ...updates };
      persist();
    }
  }

  function deleteStakeholder(id: string) {
    const target = stakeholders.value.find((s) => s.id === id);
    stakeholders.value = stakeholders.value.filter((s) => s.id !== id);
    if (target?.isCurrentUser && stakeholders.value.length > 0) {
      stakeholders.value[0].isCurrentUser = true;
    }
    persist();
  }

  function setCurrentUser(id: string) {
    let found = false;
    stakeholders.value.forEach((s) => {
      if (s.id === id) {
        s.isCurrentUser = true;
        found = true;
      } else {
        s.isCurrentUser = false;
      }
    });
    if (found) persist();
  }

  function findStakeholderByName(name: string): Stakeholder | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return stakeholders.value.find(
      (s) => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
    );
  }

  function findStakeholdersByDivision(division: Division): Stakeholder[] {
    return stakeholders.value.filter((s) => s.division === division);
  }

  function resetToDefaults() {
    stakeholders.value = JSON.parse(JSON.stringify(DEFAULT_STAKEHOLDERS));
    persist();
  }

  return {
    stakeholders,
    currentUser,
    addStakeholder,
    updateStakeholder,
    deleteStakeholder,
    setCurrentUser,
    findStakeholderByName,
    findStakeholdersByDivision,
    resetToDefaults,
  };
});
