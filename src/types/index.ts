export type Division = 'backend' | 'frontend' | 'desain' | 'qa' | 'devops' | 'general';
export type TaskPriority = 'tinggi' | 'sedang' | 'rendah';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  division: Division;
  email?: string;
  skills?: string[];
  platformHandles?: {
    telegram?: string;
    slack?: string;
    whatsapp?: string;
    p2pNodeId?: string;
  };
  isCurrentUser?: boolean;
  status?: 'online' | 'busy' | 'offline' | 'away';
}

export interface TaskItem {
  id: string;
  divisi: Division;
  deskripsi: string;
  prioritas: TaskPriority;
  status: TaskStatus;
  deadline?: string | null;
  senderName: string;
  timestamp: string;
  assigneeName?: string;
  assigneeRole?: string;
  assigneeId?: string;
}

export interface ChatMessage {
  id: string;
  platform: 'local' | 'whatsapp' | 'telegram' | 'slack';
  senderName: string;
  senderId: string;
  senderRole?: string;
  senderDivision?: Division;
  isSelf: boolean;
  content: string;
  messageType: 'text' | 'voice_processed';
  timestamp: string;
  transcription?: string;
  summary?: string;
  tasks?: TaskItem[];
}

export interface PeerDevice {
  id: string;
  name: string;
  deviceType: 'laptop' | 'desktop' | 'phone';
  ipAddress: string;
  port: number;
  isOnline: boolean;
  isPaired: boolean;
  lastSeen: string;
}

export interface VaultFile {
  id: string;
  name: string;
  category: 'Kontrak' | 'Desain' | 'Dokumen_Teknis' | 'Laporan' | 'Lainnya';
  sizeBytes: number;
  uploadedAt: string;
  summary?: string;
}
