import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PeerDevice } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export const useDeviceStore = defineStore('device', () => {
  // Real discovered peers start empty
  const devices = ref<PeerDevice[]>([]);

  const localDevice = ref({
    name: 'Workstation (Mendeteksi...)',
    ipAddress: '127.0.0.1',
    port: 42424,
    status: 'online',
    lanDiscoveryEnabled: true,
  });

  const isScanning = ref(false);

  async function fetchLocalInfo() {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const info = await invoke<any>('get_local_node_info');
        if (info) {
          localDevice.value = {
            name: info.name,
            ipAddress: info.ipAddress || '127.0.0.1',
            port: info.port || 42424,
            status: info.status || 'online',
            lanDiscoveryEnabled: true,
          };
        }
      }
    } catch (e) {
      console.warn('Gagal mengambil info node lokal:', e);
    }
  }

  async function triggerScan() {
    isScanning.value = true;
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        await invoke('broadcast_lan_presence');
        const rustPeers = await invoke<any[]>('get_lan_peers');
        if (rustPeers && Array.isArray(rustPeers)) {
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

  // Initialize real local node info
  fetchLocalInfo();

  return {
    devices,
    localDevice,
    isScanning,
    fetchLocalInfo,
    triggerScan,
    togglePair,
  };
});
