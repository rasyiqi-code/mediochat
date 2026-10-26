import type { ITransportService, PeerMessage } from './types';

export class CloudflareWebRtcTransportService implements ITransportService {
  name = 'Cloudflare Workers Hybrid (WebRTC P2P)';
  mode: 'cloudflare_hybrid' = 'cloudflare_hybrid';
  isConnected = false;
  private messageListeners: ((msg: PeerMessage) => void)[] = [];

  async init(): Promise<void> {
    console.info('Cloudflare WebRTC Hybrid Transport initialized (Phase 2 Mode)');
    this.isConnected = true;
  }

  async broadcastMessage(message: PeerMessage): Promise<void> {
    this.messageListeners.forEach((listener) => listener(message));
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
