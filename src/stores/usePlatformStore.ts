import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  botUsername?: string;
  lastTested?: string;
  status: 'idle' | 'connected' | 'error';
}

export interface SlackConfig {
  webhookUrl: string;
  botToken: string;
  channel: string;
  enabled: boolean;
  lastTested?: string;
  status: 'idle' | 'connected' | 'error';
}

export interface WhatsAppConfig {
  phoneNumber: string;
  enabled: boolean;
  status: 'disconnected' | 'connected' | 'idle';
}

const STORAGE_PLATFORMS_KEY = 'mediochat_platforms_v1';

export const usePlatformStore = defineStore('platform', () => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_PLATFORMS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();

  const telegram = ref<TelegramConfig>(saved?.telegram || {
    botToken: '',
    chatId: '',
    enabled: false,
    status: 'idle',
  });

  const slack = ref<SlackConfig>(saved?.slack || {
    webhookUrl: '',
    botToken: '',
    channel: '#general',
    enabled: false,
    status: 'idle',
  });

  const whatsapp = ref<WhatsAppConfig>(saved?.whatsapp || {
    phoneNumber: '',
    enabled: false,
    status: 'disconnected',
  });

  function persist() {
    try {
      localStorage.setItem(STORAGE_PLATFORMS_KEY, JSON.stringify({
        telegram: telegram.value,
        slack: slack.value,
        whatsapp: whatsapp.value,
      }));
    } catch (e) {
      console.warn('Gagal menyimpan config platform ke localStorage:', e);
    }
  }

  async function testTelegram(): Promise<{ success: boolean; message: string }> {
    if (!telegram.value.botToken.trim()) {
      telegram.value.status = 'error';
      return { success: false, message: 'Bot Token Telegram belum diisi.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegram.value.botToken.trim()}/getMe`);
      const data = await res.json();
      if (data.ok) {
        telegram.value.botUsername = data.result.username;
        telegram.value.status = 'connected';
        telegram.value.lastTested = new Date().toLocaleTimeString();
        persist();
        return { success: true, message: `Koneksi berhasil! Bot @${data.result.username} siap digunakan.` };
      } else {
        telegram.value.status = 'error';
        persist();
        return { success: false, message: data.description || 'Gagal memverifikasi token bot.' };
      }
    } catch (err: any) {
      telegram.value.status = 'error';
      persist();
      return { success: false, message: `Gagal terhubung ke server Telegram: ${err.message}` };
    }
  }

  async function sendTelegramMessage(text: string): Promise<{ success: boolean; message: string }> {
    if (!telegram.value.botToken.trim() || !telegram.value.chatId.trim()) {
      return { success: false, message: 'Bot Token atau Chat ID Telegram belum diatur.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegram.value.botToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram.value.chatId.trim(),
          text,
          parse_mode: 'Markdown',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        return { success: true, message: 'Pesan berhasil diteruskan ke Telegram!' };
      } else {
        return { success: false, message: data.description || 'Gagal mengirim pesan ke Telegram.' };
      }
    } catch (err: any) {
      return { success: false, message: `Gagal mengirim ke Telegram: ${err.message}` };
    }
  }

  async function testSlack(): Promise<{ success: boolean; message: string }> {
    if (!slack.value.webhookUrl.trim()) {
      slack.value.status = 'error';
      return { success: false, message: 'Webhook URL Slack belum diisi.' };
    }

    try {
      const res = await fetch(slack.value.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '⚡ Test integrasi MedioChat Desktop ke Slack berhasil!',
        }),
      });
      if (res.ok) {
        slack.value.status = 'connected';
        slack.value.lastTested = new Date().toLocaleTimeString();
        persist();
        return { success: true, message: 'Koneksi Webhook Slack berhasil diverifikasi!' };
      } else {
        slack.value.status = 'error';
        persist();
        return { success: false, message: `Slack Webhook merespons status ${res.status}` };
      }
    } catch (err: any) {
      slack.value.status = 'error';
      persist();
      return { success: false, message: `Gagal terhubung ke Slack: ${err.message}` };
    }
  }

  async function sendSlackMessage(text: string): Promise<{ success: boolean; message: string }> {
    if (!slack.value.webhookUrl.trim()) {
      return { success: false, message: 'Webhook URL Slack belum diatur.' };
    }

    try {
      const res = await fetch(slack.value.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        return { success: true, message: 'Pesan berhasil diteruskan ke Slack!' };
      }
      return { success: false, message: `Gagal mengirim ke Slack (Status: ${res.status})` };
    } catch (err: any) {
      return { success: false, message: `Gagal mengirim ke Slack: ${err.message}` };
    }
  }

  return {
    telegram,
    slack,
    whatsapp,
    persist,
    testTelegram,
    sendTelegramMessage,
    testSlack,
    sendSlackMessage,
  };
});
