import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingStore = defineStore('setting', () => {
  const qwenApiKey = ref(localStorage.getItem('mediochat_qwen_api_key') || '');
  const selectedChatModel = ref('qwen-plus');
  const selectedAudioModel = ref('qwen3-asr-flash');
  const globalHotkey = ref('Ctrl+Shift+Space');
  const networkMode = ref<'lan_p2p' | 'cloudflare_hybrid' | 'enterprise_server'>('lan_p2p');
  const voiceCommandEnabled = ref(true);
  const aiTone = ref<'casual' | 'formal' | 'concise'>('casual');

  // Platform statuses
  const whatsappConnected = ref(false);
  const telegramConnected = ref(false);

  function saveApiKey(key: string) {
    qwenApiKey.value = key;
    localStorage.setItem('mediochat_qwen_api_key', key);
  }

  return {
    qwenApiKey,
    selectedChatModel,
    selectedAudioModel,
    globalHotkey,
    networkMode,
    voiceCommandEnabled,
    aiTone,
    whatsappConnected,
    telegramConnected,
    saveApiKey,
  };
});
