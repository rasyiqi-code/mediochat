import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PeerDevice } from '@/types';

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<PeerDevice[]>([
    {
      id: 'dev-1',
      name: 'Laptop Budi (MacBook Air)',
      deviceType: 'laptop',
      ipAddress: '192.168.1.104',
      port: 5288,
      isOnline: true,
      isPaired: true,
      lastSeen: 'Baru saja',
    },
    {
      id: 'dev-2',
      name: 'PC Desktop Andi (Ubuntu 24.04)',
      deviceType: 'desktop',
      ipAddress: '192.168.1.112',
      port: 5288,
      isOnline: true,
      isPaired: true,
      lastSeen: '1 menit lalu',
    },
    {
      id: 'dev-3',
      name: 'HP Citra (Android Phone)',
      deviceType: 'phone',
      ipAddress: '192.168.1.125',
      port: 5288,
      isOnline: false,
      isPaired: false,
      lastSeen: '1 jam lalu',
    },
  ]);

  const localDevice = ref({
    name: 'My Workstation (Linux)',
    ipAddress: '192.168.1.108',
    port: 5288,
    status: 'online',
    lanDiscoveryEnabled: true,
  });

  const isScanning = ref(false);

  function triggerScan() {
    isScanning.value = true;
    setTimeout(() => {
      isScanning.value = false;
    }, 1500);
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
