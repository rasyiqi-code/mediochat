import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Stakeholder, Division, DivisionItem } from '@/types';

const STORAGE_STAKEHOLDERS_KEY = 'mediochat_stakeholders_v1';
const STORAGE_DIVISIONS_KEY = 'mediochat_divisions_v1';

export const DEFAULT_DIVISIONS: DivisionItem[] = [
  { id: 'backend', label: 'Backend' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'desain', label: 'Desain' },
  { id: 'qa', label: 'QA Testing' },
  { id: 'devops', label: 'DevOps' },
  { id: 'general', label: 'General / Manajemen' },
];

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
  const savedStakeholders = (() => {
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

  const savedDivisions = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_DIVISIONS_KEY);
      if (!raw) return DEFAULT_DIVISIONS;
      const parsed: DivisionItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return DEFAULT_DIVISIONS;
    } catch {
      return DEFAULT_DIVISIONS;
    }
  })();

  const stakeholders = ref<Stakeholder[]>(savedStakeholders);
  const divisions = ref<DivisionItem[]>(savedDivisions);

  // Auto-sync any division that might exist on stakeholders but missing in divisions list
  for (const s of stakeholders.value) {
    if (s.division && !divisions.value.some((d) => d.id === s.division)) {
      const label = s.division.charAt(0).toUpperCase() + s.division.slice(1);
      divisions.value.push({ id: s.division, label });
    }
  }

  const currentUser = computed<Stakeholder>(() => {
    const active = stakeholders.value.find((s) => s.isCurrentUser);
    return active || stakeholders.value[0] || DEFAULT_STAKEHOLDERS[0];
  });

  function persistStakeholders() {
    try {
      localStorage.setItem(STORAGE_STAKEHOLDERS_KEY, JSON.stringify(stakeholders.value));
    } catch (e) {
      console.warn('Gagal menyimpan stakeholder ke localStorage:', e);
    }
  }

  function persistDivisions() {
    try {
      localStorage.setItem(STORAGE_DIVISIONS_KEY, JSON.stringify(divisions.value));
    } catch (e) {
      console.warn('Gagal menyimpan divisi ke localStorage:', e);
    }
  }

  function addDivision(label: string): DivisionItem {
    const trimmed = label.trim();
    if (!trimmed) {
      return divisions.value[0] || { id: 'general', label: 'General' };
    }
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const existing = divisions.value.find((d) => d.id === id || d.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }
    const newDiv: DivisionItem = {
      id,
      label: trimmed,
    };
    divisions.value.push(newDiv);
    persistDivisions();
    return newDiv;
  }

  function deleteDivision(id: string) {
    divisions.value = divisions.value.filter((d) => d.id !== id);
    persistDivisions();
  }

  function addStakeholder(member: Omit<Stakeholder, 'id'>) {
    // If division is new, ensure it is added to divisions list
    if (member.division) {
      addDivision(member.division);
    }

    const newStakeholder: Stakeholder = {
      ...member,
      id: `sh-${Date.now()}`,
    };
    if (newStakeholder.isCurrentUser) {
      stakeholders.value.forEach((s) => (s.isCurrentUser = false));
    }
    stakeholders.value.push(newStakeholder);
    persistStakeholders();
    return newStakeholder;
  }

  function updateStakeholder(id: string, updates: Partial<Stakeholder>) {
    const index = stakeholders.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      if (updates.division) {
        addDivision(updates.division);
      }
      if (updates.isCurrentUser) {
        stakeholders.value.forEach((s) => (s.isCurrentUser = false));
      }
      stakeholders.value[index] = { ...stakeholders.value[index], ...updates };
      persistStakeholders();
    }
  }

  function deleteStakeholder(id: string) {
    const target = stakeholders.value.find((s) => s.id === id);
    stakeholders.value = stakeholders.value.filter((s) => s.id !== id);
    if (target?.isCurrentUser && stakeholders.value.length > 0) {
      stakeholders.value[0].isCurrentUser = true;
    }
    persistStakeholders();
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
    if (found) persistStakeholders();
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
    divisions.value = JSON.parse(JSON.stringify(DEFAULT_DIVISIONS));
    persistStakeholders();
    persistDivisions();
  }

  return {
    stakeholders,
    divisions,
    currentUser,
    addDivision,
    deleteDivision,
    addStakeholder,
    updateStakeholder,
    deleteStakeholder,
    setCurrentUser,
    findStakeholderByName,
    findStakeholdersByDivision,
    resetToDefaults,
  };
});
