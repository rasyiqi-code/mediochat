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
  divisi: 'backend' | 'frontend' | 'desain' | 'qa' | 'devops' | 'general' | (string & {});
  deskripsi: string;
  prioritas: 'tinggi' | 'sedang' | 'rendah';
  estimasi_jam?: number;
  assignee_name?: string;
  assignee_role?: string;
}

export interface TaskDecompositionResult {
  ringkasan: string;
  tanggal_deadline: string | null;
  daftar_tugas: TaskDecompositionItem[];
  ai_relay_briefing?: string;
  intent_type?: 'request_data' | 'task_instruction' | 'status_update' | 'confirmation_needed' | 'general_info';
  target_stakeholders?: string[];
  urgency?: 'segera' | 'normal' | 'santai';
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
