# Arsitektur Desktop App: MedioChat (Ghost Relay Desktop)

## 1. Pendahuluan & Filosofi Desain

MedioChat Desktop adalah sistem komunikasi dan koordinasi tim asinkron berbasis AI yang dibangun sebagai **Native Desktop Application**.

Berbeda dengan aplikasi web di dalam browser yang terisolasi (*sandboxed*), aplikasi desktop memiliki keunggulan fundamental:
1. **Akses Hardware & OS Penuh**: Global shortcut (Push-to-Talk dari mana saja tanpa membuka jendela aplikasi), mikrofon native dengan low-latency, system tray (aplikasi tetap hidup di latar belakang), dan notifikasi sistem operasi native.
2. **Offline-First & Local Memory**: Memiliki database lokal (SQLite dengan ekstensi vector) sehingga pencarian dokumen dan memori chat tetap dapat diakses meski tanpa internet.
3. **Komunikasi Antar Perangkat Mandiri**: Kemampuan membuka raw TCP/UDP socket, peer-to-peer (P2P), dan mDNS local discovery untuk bertukar data secara langsung antar perangkat di jaringan lokal tanpa bergantung 100% pada server cloud.

---

## 2. Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND UI (Vue 3)                            │
│   Vue Router · @tanstack/vue-query · Pinia · shadcn-vue · Tailwind     │
│   Chat Room · Kanban Board · Knowledge Vault · Settings · System Tray  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC (Inter-Process Communication)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      NATIVE DESKTOP CORE (Tauri v2)                    │
│                                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │     System Services     │ │           AI & Voice Core            │  │
│  │ - Global Hotkey (PTT)   │ │ - Audio Capture (PCM 16kHz)          │  │
│  │ - System Tray & Daemon  │ │ - Qwen Cloud API / Local Ollama      │  │
│  │ - Native Notifications  │ │ - Task Decomposition Engine          │  │
│  │ - File Watcher & Vault  │ │ - Semantic Embedding Pipeline        │  │
│  └─────────────────────────┘ └──────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │    Local Data Store     │ │       Device Sync Engine (P2P)       │  │
│  │ - SQLite (Local DB)     │ │ - mDNS Local Discovery (LAN)         │  │
│  │ - sqlite-vec (Vectors)  │ │ - WebRTC DataChannel (Direct P2P)    │  │
│  │ - E2EE Keyring (AES)    │ │ - WebSocket Client (Cloud Relay)     │  │
│  └─────────────────────────┘ └──────────────────────────────────────┘  │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
        LAN P2P / Direct Sockets            Cloud Relay / External APIs
                    ▼                               ▼
       ┌────────────────────────┐      ┌──────────────────────────┐
       │   Perangkat Tim Lain   │      │     Cloud & Gateway      │
       │ (PC Desktop / Laptop / │      │ - Qwen DashScope API     │
       │  Mobile via Wi-Fi)     │      │ - WhatsApp / TG / Slack  │
       │                        │      │ - Optional Relay Server  │
       └────────────────────────┘      └──────────────────────────┘
```

---

## 3. Komponen Utama Arsitektur

### 3.1. Presentation Layer (Frontend Vue 3 SPA)
* **Framework**: Vue 3 (Composition API, `<script setup lang="ts">`) + Vite.
* **UI/UX**: Tailwind CSS v4, shadcn-vue (Radix Vue), Lucide Vue Next, Motion One for Vue.
* **State Management**:
  * **Pinia**: Client state (status voice recording, active panel, filter kanban, koneksi peer P2P).
  * **@tanstack/vue-query**: Manajemen data cache lokal, sync query, dan background refetch.
* **Router**: Vue Router untuk navigasi type-safe antar modul:
  * `/chat`: Universal Inbox & percakapan real-time.
  * `/board`: Kanban board tugas yang diekstrak oleh AI.
  * `/vault`: Knowledge Vault file manager dengan semantic search.
  * `/devices`: Manajemen perangkat terhubung (LAN & Cloud).
  * `/settings`: Konfigurasi AI Provider, platform bridge, dan profil.

### 3.2. Native Core Layer (Tauri v2 - Rust)
Tauri v2 bertindak sebagai jembatan native berkinerja tinggi antara UI dan OS:
1. **Audio Capture Engine**: Merekam suara mikrofon langsung ke raw PCM 16kHz via native API (CoreAudio di macOS, WASAPI di Windows, ALSA/PulseAudio di Linux). Mengeliminasi lag browser.
2. **Global Hotkey Daemon**: Mendaftarkan shortcut sistem (misal `Ctrl + Space` atau tombol mouse macro). Saat ditekan dari game, IDE, atau browser lain, MedioChat langsung merekam audio dan memproses perintah tanpa user harus membuka window aplikasi.
3. **Local Database & Vector Search**:
   * Embedded **SQLite** di dalam user directory lokal.
   * Ekstensi **sqlite-vec**: Memungkinkan pencarian semantik (vektor) dilakukan langsung di dalam PC pengguna tanpa perlu PostgreSQL terpisah untuk mode single-desktop.
4. **Platform Gateway Sidecar**:
   * Menjalankan Baileys (WhatsApp QR Multi-device), Telegram Bot, dan Slack Bolt sebagai embedded Node.js process / Bun sidecar terkelola oleh Tauri.

### 3.3. Inter-Device Sync Engine (Komunikasi Antar Perangkat)
Lapisan ini bertanggung jawab menghubungkan MedioChat di PC satu dengan PC lainnya:
* **Local Discovery**: Mendeteksi perangkat tim dalam jaringan Wi-Fi/LAN yang sama secara otomatis via protokol mDNS/Bonjour (Zero-Configuration).
* **Direct P2P Transfer**: Mentransfer file besar dan data chat langsung antar laptop via WebRTC DataChannel atau Local TLS Socket (kecepatan maksimal Wi-Fi lokal, tanpa membebani internet).
* **Hybrid Cloud Relay**: Saat anggota tim berada di luar kantor (berbeda jaringan internet), komunikasi dialihkan secara mulus melalui WebSocket Relay Server.
