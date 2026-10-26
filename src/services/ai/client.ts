import type {
  AIProviderConfig,
  TaskDecompositionResult,
  TestConnectionResult,
} from './types';
import { invoke } from '@tauri-apps/api/core';

const SYSTEM_DECOMPOSITION_PROMPT = `Anda adalah AI Coordinator cerdas untuk sistem MedioChat (Team AI Bridge).
Tugas Anda adalah membaca pesan atau transkrip suara instruksi kerja dan memecahnya menjadi daftar tugas terstruktur untuk tim software engineering.

Pilihlah salah satu divisi yang paling tepat untuk setiap tugas:
- "backend" (API, database, server, otentikasi, logic bisnis)
- "frontend" (UI, Vue/React, CSS, komponen, form, responsive)
- "desain" (Figma, mockup, ilustrasi, asset visual, design system)
- "qa" (Testing, audit bug, end-to-end test, validasi)
- "devops" (Deployment, CI/CD, Docker, server, cloud)
- "general" (Tugas umum, koordinasi, dokumentasi, rapat)

Prioritas harus salah satu dari: "tinggi", "sedang", "rendah".

KEMBALIKAN HANYA VALID JSON MURNI TANPA KOMENTAR DAN TANPA TEXT LAIN. Format persis seperti ini:
{
  "ringkasan": "Ringkasan ringkas instruksi kerja ini dalam 1-2 kalimat",
  "tanggal_deadline": "Besok, 17:00 / Lusa / tanggal spesifik atau null",
  "daftar_tugas": [
    {
      "divisi": "backend",
      "deskripsi": "Deskripsi aksi spesifik yang perlu dikerjakan",
      "prioritas": "tinggi",
      "estimasi_jam": 4
    }
  ]
}`;

export class UniversalAIClient {
  private isTauri(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
  }

  /**
   * Helper to clean and extract JSON from model responses that might contain markdown backticks
   */
  private extractJSON<T>(rawText: string): T {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(clean);
  }

  /**
   * Universal Chat Completion across Ollama, Gemini, Qwen, and OpenAI-compatible providers
   */
  async chatCompletion(
    prompt: string,
    provider: AIProviderConfig,
    systemPrompt: string = 'You are a helpful AI assistant in MedioChat.'
  ): Promise<string> {
    // 1. If running inside Tauri native desktop, execute via Rust Core
    if (this.isTauri()) {
      try {
        return await invoke<string>('ai_chat_completion', {
          provider,
          prompt,
          systemPrompt,
        });
      } catch (err: any) {
        console.warn('Rust AI chat completion failed, falling back to TS fetch:', err);
      }
    }

    // 2. TypeScript fallback for web/standalone preview
    if (provider.type === 'ollama') {
      return this.callOllama(prompt, provider, systemPrompt, false);
    } else if (provider.type === 'gemini') {
      return this.callGemini(prompt, provider, systemPrompt, false);
    } else {
      return this.callOpenAICompatible(prompt, provider, systemPrompt, false);
    }
  }

  /**
   * Decompose an audio transcript or text instruction into structured team tasks
   */
  async decomposeTask(
    text: string,
    provider: AIProviderConfig
  ): Promise<TaskDecompositionResult> {
    // 1. If running inside Tauri native desktop, execute via Rust Core
    if (this.isTauri()) {
      try {
        return await invoke<TaskDecompositionResult>('ai_decompose_task', {
          provider,
          text,
        });
      } catch (err: any) {
        console.warn('Rust AI task decomposition failed, falling back to TS fetch:', err);
      }
    }

    // 2. TypeScript fallback
    try {
      let rawResponse = '';
      if (provider.type === 'ollama') {
        rawResponse = await this.callOllama(text, provider, SYSTEM_DECOMPOSITION_PROMPT, true);
      } else if (provider.type === 'gemini') {
        rawResponse = await this.callGemini(text, provider, SYSTEM_DECOMPOSITION_PROMPT, true);
      } else {
        rawResponse = await this.callOpenAICompatible(text, provider, SYSTEM_DECOMPOSITION_PROMPT, true);
      }

      const parsed = this.extractJSON<TaskDecompositionResult>(rawResponse);
      if (!parsed.daftar_tugas || !Array.isArray(parsed.daftar_tugas)) {
        throw new Error('Format daftar_tugas tidak valid');
      }
      return parsed;
    } catch (err: any) {
      console.warn('AI Task Decomposition fallback triggered:', err);
      return {
        ringkasan: text.slice(0, 120) + (text.length > 120 ? '...' : ''),
        tanggal_deadline: 'Besok',
        daftar_tugas: [
          {
            divisi: 'general',
            deskripsi: text,
            prioritas: 'sedang',
            estimasi_jam: 2,
          },
        ],
      };
    }
  }

  /**
   * Dynamically fetch available models from the provider's server
   */
  async fetchModels(provider: AIProviderConfig): Promise<string[]> {
    if (this.isTauri()) {
      try {
        return await invoke<string[]>('ai_fetch_models', { provider });
      } catch (err: any) {
        console.warn('Rust AI fetch models failed, falling back to TS fetch:', err);
      }
    }

    const baseUrl = (provider.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const headers: Record<string, string> = {
      ...(provider.customHeaders || {}),
    };
    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    if (provider.type === 'ollama') {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models)) {
            return data.models.map((m: any) => m.name || m.model).filter(Boolean);
          }
        }
      } catch {}

      const resV1 = await fetch(`${baseUrl}/v1/models`, { headers });
      if (resV1.ok) {
        const data = await resV1.json();
        if (Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id).filter(Boolean);
        }
      }
      throw new Error('Gagal mengambil daftar model dari endpoint Ollama');
    }

    if (provider.type === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models
            .map((m: any) => m.name.replace(/^models\//, ''))
            .filter((name: string) => name.includes('gemini'));
        }
      }
      throw new Error('Gagal mengambil daftar model dari Google Gemini');
    }

    let endpoint = `${baseUrl}/models`;
    if (!baseUrl.includes('/v1') && !baseUrl.includes('/compatible-mode/v1')) {
      endpoint = `${baseUrl}/v1/models`;
    }
    const res = await fetch(endpoint, { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id).filter(Boolean);
      }
    }
    throw new Error('Endpoint tidak mendukung auto-fetch models, tambahkan model secara manual.');
  }

  /**
   * Test connection to provider and measure latency
   */
  async testConnection(provider: AIProviderConfig): Promise<TestConnectionResult> {
    if (this.isTauri()) {
      try {
        return await invoke<TestConnectionResult>('ai_test_connection', { provider });
      } catch (err: any) {
        console.warn('Rust AI test connection failed, falling back to TS fetch:', err);
      }
    }

    const startTime = performance.now();
    try {
      const response = await this.chatCompletion('Ping! Balas dengan kata OK saja.', provider);
      const latencyMs = Math.round(performance.now() - startTime);

      let availableModels: string[] | undefined;
      try {
        availableModels = await this.fetchModels(provider);
      } catch {}

      return {
        success: true,
        message: `Terhubung sukses! Respon: "${response.slice(0, 30).trim()}" (${latencyMs}ms)`,
        latencyMs,
        availableModels,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: err.message || 'Koneksi gagal atau waktu habis.',
        latencyMs,
      };
    }
  }

  // --- TS Native HTTP Fallback Implementations ---

  private async callOllama(
    prompt: string,
    provider: AIProviderConfig,
    systemPrompt: string,
    requireJson: boolean
  ): Promise<string> {
    const baseUrl = (provider.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.customHeaders || {}),
    };

    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          stream: false,
          ...(requireJson ? { format: 'json' } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.message?.content || data.response || '';
      }
    } catch (err) {
      console.warn('Ollama native endpoint failed, trying /v1/chat/completions:', err);
    }

    const fallbackResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: provider.selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: false,
        ...(requireJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!fallbackResponse.ok) {
      const errText = await fallbackResponse.text();
      throw new Error(`Ollama Error (${fallbackResponse.status}): ${errText}`);
    }

    const data = await fallbackResponse.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callGemini(
    prompt: string,
    provider: AIProviderConfig,
    systemPrompt: string,
    requireJson: boolean
  ): Promise<string> {
    const model = provider.selectedModel || 'gemini-1.5-flash';
    const apiKey = provider.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API Key belum dikonfigurasi di Pengaturan');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\nInput:\n${prompt}` }],
        },
      ],
    };

    if (requireJson) {
      body.generationConfig = {
        responseMimeType: 'application/json',
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Gemini tidak mengembalikan teks jawaban.');
    }
    return candidate;
  }

  private async callOpenAICompatible(
    prompt: string,
    provider: AIProviderConfig,
    systemPrompt: string,
    requireJson: boolean
  ): Promise<string> {
    let baseUrl = provider.baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    baseUrl = baseUrl.replace(/\/+$/, '');

    let endpoint = `${baseUrl}/chat/completions`;
    if (baseUrl.endsWith('/chat/completions')) {
      endpoint = baseUrl;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(provider.customHeaders || {}),
    };

    if (provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const body: any = {
      model: provider.selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: false,
    };

    if (requireJson) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Provider Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export const aiClient = new UniversalAIClient();
