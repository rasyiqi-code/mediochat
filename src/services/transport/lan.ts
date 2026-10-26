import type { ITransportService, PeerMessage } from './types';
import { invoke } from '@tauri-apps/api/core';

export class LanTransportService implements ITransportService {
  name = 'LAN Direct P2P (mDNS & UDP)';
  mode: 'lan_p2p' = 'lan_p2p';
  isConnected = true;
  private messageListeners: ((msg: PeerMessage) => void)[] = [];

  async init(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        await invoke('broadcast_lan_presence');
      }
      this.isConnected = true;
    } catch (e) {
      console.warn('LAN init notice:', e);
    }
  }

  async broadcastMessage(message: PeerMessage): Promise<void> {
    // Notify local listeners
    this.messageListeners.forEach((listener) => listener(message));

    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        await invoke('broadcast_lan_presence');
      } catch (e) {
        console.warn('LAN broadcast error:', e);
      }
    }
  }

  async sendMessageToPeer(_peerId: string, message: PeerMessage): Promise<void> {
    this.messageListeners.forEach((listener) => listener(message));
  }

  onMessage(callback: (message: PeerMessage) => void): () => void {
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== callback);
    };
  }

  destroy(): void {
    this.messageListeners = [];
    this.isConnected = false;
  }
}
