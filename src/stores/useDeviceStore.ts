import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PeerDevice } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<PeerDevice[]>([
    {
      id: 'dev-1',
      name: 'Laptop Budi (MacBook Air)',
      deviceType: 'laptop',
      ipAddress: '192.168.1.104',
      port: 42424,
      isOnline: true,
      isPaired: true,
      lastSeen: 'Baru saja',
    },
    {
      id: 'dev-2',
      name: 'PC Desktop Andi (Ubuntu 24.04)',
      deviceType: 'desktop',
      ipAddress: '192.168.1.112',
      port: 42424,
      isOnline: true,
      isPaired: true,
      lastSeen: '1 menit lalu',
    },
    {
      id: 'dev-3',
      name: 'HP Citra (Android Phone)',
      deviceType: 'phone',
      ipAddress: '192.168.1.125',
      port: 42424,
      isOnline: false,
      isPaired: false,
      lastSeen: '1 jam lalu',
    },
  ]);

  const localDevice = ref({
    name: 'Workstation Utama (Linux)',
    ipAddress: '192.168.1.108',
    port: 42424,
    status: 'online',
    lanDiscoveryEnabled: true,
  });

  const isScanning = ref(false);

  async function triggerScan() {
    isScanning.value = true;
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        await invoke('broadcast_lan_presence');
        const rustPeers = await invoke<any[]>('get_lan_peers');
        if (rustPeers && rustPeers.length > 0) {
          for (const rp of rustPeers) {
            const exists = devices.value.find((d) => d.id === rp.id);
            if (exists) {
              exists.isOnline = true;
              exists.lastSeen = 'Baru saja';
            } else {
              devices.value.push({
                id: rp.id,
                name: rp.name,
                deviceType: 'desktop',
                ipAddress: rp.ip,
                port: rp.port,
                isOnline: true,
                isPaired: false,
                lastSeen: 'Baru saja',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Native LAN scan notice:', e);
    } finally {
      setTimeout(() => {
        isScanning.value = false;
      }, 800);
    }
  }

  function togglePair(deviceId: string) {
    const dev = devices.value.find((d) => d.id === deviceId);
    if (dev) {
      dev.isPaired = !dev.isPaired;
    }
  }

  return {
    devices,
    localDevice,
    isScanning,
    triggerScan,
    togglePair,
  };
});
