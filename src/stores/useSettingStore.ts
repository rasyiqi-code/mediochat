import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AIProviderConfig } from '@/services/ai/types';
import { invoke } from '@tauri-apps/api/core';

const STORAGE_KEY = 'mediochat_ai_settings_v2';

const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama Engine',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    apiKey: '0fbadaf516114ced81aba262b34df612.wIKBT6e3QDPcSGXhaGzrq7S8',
    selectedModel: 'nemotron-3-nano:30b',
    availableModels: [
      'beam',
      'gemma4:31b',
      'gpt-oss:120b',
      'gpt-oss:20b',
      'nemotron-3-nano:30b',
      'nemotron-3-super',
      'nemotron-3-ultra',
    ],
    status: 'unknown',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    selectedModel: 'gemini-1.5-flash',
    availableModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    status: 'unknown',
  },
  {
    id: 'qwen',
    name: 'Alibaba Qwen (DashScope)',
    type: 'qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    selectedModel: 'qwen-plus',
    availableModels: ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-flash'],
    audioModel: 'qwen3-asr-flash',
    status: 'unknown',
  },
];

export const useSettingStore = defineStore('setting', () => {
  // Load saved providers or default
  const savedData = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const providers = ref<AIProviderConfig[]>(savedData?.providers || DEFAULT_PROVIDERS);
  const activeProviderId = ref<string>(savedData?.activeProviderId || 'ollama');

  const globalHotkey = ref(savedData?.globalHotkey || 'Ctrl+Shift+Space');
  const networkMode = ref<'lan_p2p' | 'cloudflare_hybrid' | 'enterprise_server'>(
    savedData?.networkMode || 'lan_p2p'
  );
  const voiceCommandEnabled = ref(true);
  const aiTone = ref<'casual' | 'formal' | 'concise'>('casual');

  // Platform integration statuses
  const whatsappConnected = ref(false);
  const telegramConnected = ref(false);

  // Computed active provider
  const activeProvider = computed<AIProviderConfig>(() => {
    return (
      providers.value.find((p) => p.id === activeProviderId.value) ||
      providers.value[0] ||
      DEFAULT_PROVIDERS[0]
    );
  });

  function persist() {
    try {
      const payload = {
        providers: providers.value,
        activeProviderId: activeProviderId.value,
        globalHotkey: globalHotkey.value,
        networkMode: networkMode.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // Also persist to Rust backend if running inside Tauri
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        invoke('save_app_config', { config: payload }).catch((err) => {
          console.warn('Gagal menyimpan config ke Rust:', err);
        });
      }
    } catch (e) {
      console.warn('Gagal menyimpan pengaturan:', e);
    }
  }

  function setActiveProvider(id: string) {
    if (providers.value.some((p) => p.id === id)) {
      activeProviderId.value = id;
      persist();
    }
  }

  function updateProvider(id: string, updates: Partial<AIProviderConfig>) {
    const idx = providers.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      providers.value[idx] = { ...providers.value[idx], ...updates };
      persist();
    }
  }

  function addModelToProvider(providerId: string, modelName: string) {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    const provider = providers.value.find((p) => p.id === providerId);
    if (provider && !provider.availableModels.includes(trimmed)) {
      provider.availableModels.push(trimmed);
      persist();
    }
  }

  function removeModelFromProvider(providerId: string, modelName: string) {
    const provider = providers.value.find((p) => p.id === providerId);
    if (provider) {
      provider.availableModels = provider.availableModels.filter((m) => m !== modelName);
      if (provider.selectedModel === modelName && provider.availableModels.length > 0) {
        provider.selectedModel = provider.availableModels[0];
      }
      persist();
    }
  }

  function setSelectedModel(providerId: string, modelName: string) {
    const provider = providers.value.find((p) => p.id === providerId);
    if (provider) {
      provider.selectedModel = modelName;
      persist();
    }
  }

  function addProvider(newProvider: AIProviderConfig) {
    if (!providers.value.some((p) => p.id === newProvider.id)) {
      providers.value.push(newProvider);
      persist();
    }
  }

  function deleteProvider(providerId: string) {
    if (providers.value.length <= 1) return; // Keep at least one
    providers.value = providers.value.filter((p) => p.id !== providerId);
    if (activeProviderId.value === providerId) {
      activeProviderId.value = providers.value[0].id;
    }
    persist();
  }

  function resetToDefaults() {
    providers.value = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));
    activeProviderId.value = 'ollama';
    persist();
  }

  return {
    providers,
    activeProviderId,
    activeProvider,
    globalHotkey,
    networkMode,
    voiceCommandEnabled,
    aiTone,
    whatsappConnected,
    telegramConnected,
    setActiveProvider,
    updateProvider,
    addModelToProvider,
    removeModelFromProvider,
    setSelectedModel,
    addProvider,
    deleteProvider,
    resetToDefaults,
  };
});
