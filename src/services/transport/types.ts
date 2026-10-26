export interface PeerMessage {
  id: string;
  senderId: string;
  senderName: string;
  type: 'chat' | 'task_update' | 'file_transfer' | 'voice_packet';
  payload: any;
  timestamp: string;
}

export interface ITransportService {
  name: string;
  mode: 'lan_p2p' | 'cloudflare_hybrid' | 'enterprise_server';
  isConnected: boolean;
  init(): Promise<void>;
  broadcastMessage(message: PeerMessage): Promise<void>;
  sendMessageToPeer(peerId: string, message: PeerMessage): Promise<void>;
  onMessage(callback: (message: PeerMessage) => void): () => void;
  destroy(): void;
}
