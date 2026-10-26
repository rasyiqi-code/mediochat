export type AIProviderType = 'ollama' | 'gemini' | 'qwen' | 'openai' | 'custom';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  availableModels: string[];
  audioModel?: string;
  customHeaders?: Record<string, string>;
  isDefault?: boolean;
  status?: 'unknown' | 'connected' | 'error';
  latencyMs?: number;
  lastChecked?: string;
  errorMessage?: string;
}

export interface TaskDecompositionItem {
  divisi: 'backend' | 'frontend' | 'desain' | 'qa' | 'devops' | 'general';
  deskripsi: string;
  prioritas: 'tinggi' | 'sedang' | 'rendah';
  estimasi_jam?: number;
}

export interface TaskDecompositionResult {
  ringkasan: string;
  tanggal_deadline: string | null;
  daftar_tugas: TaskDecompositionItem[];
}

export interface IntentExtractionResult {
  platform: 'local' | 'whatsapp' | 'telegram' | 'slack' | 'all';
  receiver: string;
  message: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
  availableModels?: string[];
}
