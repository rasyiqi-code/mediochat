import type { ITransportService, PeerMessage } from './types';

export class EnterpriseServerTransportService implements ITransportService {
  name = 'Enterprise Centralized Hub (Fastify + PostgreSQL)';
  mode: 'enterprise_server' = 'enterprise_server';
  isConnected = false;
  private messageListeners: ((msg: PeerMessage) => void)[] = [];

  async init(): Promise<void> {
    console.info('Enterprise Server Transport initialized (Phase 3 Mode)');
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
