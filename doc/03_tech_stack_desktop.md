# Pilihan & Rekomendasi Tech Stack: MedioChat Desktop

## 1. Perbandingan Framework Aplikasi Desktop

| Kriteria | Tauri v2 (Rekomendasi Utama) 🏆 | Electron | Wails |
| :--- | :--- | :--- | :--- |
| **Bahasa Inti (Backend)** | **Rust** | Node.js (V8) | Go |
| **Bahasa Antarmuka (UI)** | **Vue 3 / TypeScript** | HTML / React / Vue | HTML / React / Vue |
| **Ukuran Installer (Bundle)** | **~10 – 18 MB** | ~90 – 160 MB | ~15 – 25 MB |
| **Konsumsi RAM (Idle)** | **~35 – 70 MB** | ~350 – 800 MB | ~50 – 90 MB |
| **Mesin Render Web** | WebView Native OS (WebKit / WebView2) | Bundled Chromium Penuh | WebView Native OS |
| **Akses Jaringan Native & P2P** | **Sangat Luas** (Raw Socket, mDNS, QUIC via Rust) | Luas (via Node.js C++ bindings) | Sangat Luas (via Go stdlib) |
| **Dukungan Mobile (Cross)** | **Ada (iOS & Android di Tauri v2)** | Tidak Ada (Hanya Desktop) | Tidak Ada |

### Mengapa Tauri v2 + Vue 3 Dipilih?
1. **Sangat Ringan**: Installer ~15MB dan konsumsi RAM idle hanya ~40MB.
2. **Reaktivitas Cepat & Elegan (Vue 3)**: Vue 3 Composition API (`<script setup lang="ts">`) menawarkan sintaks bersih, reaktivitas Proxy instan tanpa rerender hook ribet.
3. **Ekosistem UI shadcn-vue**: Berbasis Radix Vue + Tailwind CSS v4, menghadirkan estetika premium, minimalis, dan komponen yang dapat dikustomisasi penuh.
4. **State Management Ringkas dengan Pinia**: Pinia memberikan modular store yang type-safe dan ringan.
5. **Ekosistem Rust untuk P2P & Audio**: Library native `cpal` untuk audio low-latency, `mdns-sd` untuk discovery, dan enkripsi E2EE.

---

## 2. Struktur Spesifikasi Tech Stack Lengkap

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SPESIFIKASI TECH STACK MEDIOCHAT                  │
├──────────────────────────┬───────────────────────────────────────────┤
│ LAPISAN                  │ PILIHAN TEKNOLOGI                         │
├──────────────────────────┼───────────────────────────────────────────┤
│ 1. Antarmuka (Frontend)  │ Vue 3 + TypeScript (Vite)                 │
│    Styling & Komponen    │ Tailwind CSS v4 + shadcn-vue + Lucide Vue │
│    Routing               │ Vue Router 4 (Type-safe routes)           │
│    State & Cache         │ Pinia + @tanstack/vue-query v5            │
├──────────────────────────┼───────────────────────────────────────────┤
│ 2. Desktop Shell & Core  │ Tauri v2 (Rust 1.80+)                     │
│    Audio Capture         │ cpal / rodio (Native Low-Latency Audio)   │
│    Global Shortcut       │ tauri-plugin-global-shortcut (PTT)        │
│    System Tray           │ tauri-plugin-tray                         │
│    OS Notifications      │ tauri-plugin-notification                 │
├──────────────────────────┼───────────────────────────────────────────┤
│ 3. Komunikasi Perangkat  │                                           │
│    Local Discovery (LAN) │ mdns-sd / zeroconf (mDNS broadcast)       │
│    Direct P2P Sockets    │ tokio / WebRTC DataChannel (Data stream)  │
│    Kriptografi E2EE      │ x25519-dalek + chacha20poly1305           │
│    Cloud Relay Fallback  │ Cloudflare Workers / Fastify (Optional)   │
├──────────────────────────┼───────────────────────────────────────────┤
│ 4. Penyimpanan Lokal     │ SQLite 3 (Embedded di PC pengguna)        │
│    Vector Search Offline │ sqlite-vec (Ekstensi Vektor Native C/Rust)│
├──────────────────────────┼───────────────────────────────────────────┤
│ 5. AI & Voice Engine     │                                           │
│    Cloud AI (Prioritas)  │ Qwen Cloud DashScope (qwen-plus, ASR)     │
│    Dekomposisi Tugas     │ Vercel AI SDK / Qwen Structured JSON      │
└──────────────────────────┴───────────────────────────────────────────┘
```
