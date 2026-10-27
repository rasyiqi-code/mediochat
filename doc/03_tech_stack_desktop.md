# Pilihan & Rekomendasi Tech Stack: MedioChat Desktop

## 1. Perbandingan Framework Aplikasi Desktop

| Kriteria | Tauri v2 (Pilihan Utama) 🏆 | Electron | Wails |
| :--- | :--- | :--- | :--- |
| **Bahasa Inti (Backend)** | **Rust** | Node.js (V8) | Go |
| **Bahasa Antarmuka (UI)** | **Vue 3 / TypeScript** | HTML / React / Vue | HTML / React / Vue |
| **Ukuran Installer (Bundle)** | **~10 – 18 MB** | ~90 – 160 MB | ~15 – 25 MB |
| **Konsumsi RAM (Idle)** | **~35 – 70 MB** | ~350 – 800 MB | ~50 – 90 MB |
| **Mesin Render Web** | WebView Native OS (WebKit / WebView2) | Bundled Chromium Penuh | WebView Native OS |
| **Akses Jaringan Native & P2P** | **Sangat Luas** (Raw Socket, UDP Mesh, QUIC via Rust) | Luas (via Node.js C++ bindings) | Sangat Luas (via Go stdlib) |
| **Dukungan Mobile (Cross)** | **Ada (iOS & Android di Tauri v2)** | Tidak Ada (Hanya Desktop) | Tidak Ada |

### Mengapa Tauri v2 + Vue 3 Dipilih?
1. **Sangat Ringan**: Ukuran binary hemat (~15MB) dan konsumsi memori idle hanya ~40MB tanpa Chromium bloatware.
2. **Reaktivitas Cepat & Elegan (Vue 3)**: Vue 3 Composition API (`<script setup lang="ts">`) menawarkan sintaks bersih, reaktivitas Proxy instan tanpa kerumitan hooks.
3. **Estetika Premium & Modern**: Tailwind CSS v4 + Glassmorphism dark mode dan Lucide Vue Next icons.
4. **State Management Ringkas dengan Pinia**: Pinia stores modular yang type-safe dan persisten.
5. **Ekosistem Rust untuk Kinerja Tinggi**:
   - `reqwest` dengan `rustls-tls` murni (tanpa ketergantungan library C OpenSSL eksternal).
   - Dedicated OS thread socket UDP untuk discovery mesh tanpa risiko runtime panic.

---

## 2. Struktur Spesifikasi Tech Stack Terverifikasi

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SPESIFIKASI TECH STACK MEDIOCHAT                    │
├──────────────────────────┬─────────────────────────────────────────────┤
│ LAPISAN                  │ PILIHAN TEKNOLOGI                           │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 1. Antarmuka (Frontend)  │ Vue 3 + TypeScript + Bun / Vite             │
│    Styling & Desain      │ Tailwind CSS v4 + Lucide Vue Next           │
│    Routing               │ Vue Router 4 (/chat, /board, /team, dsb.)   │
│    State & Multi-User    │ Pinia (useChatStore, useTaskStore,          │
│                          │ useStakeholderStore, useSettingStore)       │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. Desktop Shell & Core  │ Tauri v2 (Rust 1.80+)                       │
│    AI Client Engine      │ reqwest (JSON + rustls-tls)                 │
│    IPC Command Invocation│ Tauri generate_handler! macro               │
│    Local Config Storage  │ OS-level JSON config persistence            │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Komunikasi Perangkat  │                                             │
│    Local LAN Mesh        │ Dedicated OS Thread UDP Socket (Port 42424) │
│    Local Route Probe     │ UDP Outbound Probe (8.8.8.8:80)             │
│    Transport Layer       │ ITransportService Abstraction               │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 4. AI & Voice Engine     │                                             │
│    Ollama Engine         │ Native /api/chat + /v1/chat/completions     │
│    Cloud & Custom AI     │ Google Gemini API, OpenAI-compatible, Qwen  │
│    Dynamic Model Catalog │ Runtime /api/tags & /v1/models detection    │
│    Task Decomposition    │ Stakeholder Knowledge Graph Context Prompt  │
└──────────────────────────┴─────────────────────────────────────────────┘
```
