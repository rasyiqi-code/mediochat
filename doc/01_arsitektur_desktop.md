# Arsitektur Desktop App: MedioChat (Ghost Relay Desktop)

## 1. Pendahuluan & Filosofi Desain

MedioChat Desktop adalah sistem komunikasi dan koordinasi tim asinkron berbasis AI yang dibangun sebagai **Native Desktop Application**.

Berbeda dengan aplikasi web di dalam browser yang terisolasi (*sandboxed*), aplikasi desktop memiliki keunggulan fundamental:
1. **Akses Hardware & OS Penuh**: Global shortcut (Push-to-Talk dari mana saja tanpa membuka jendela aplikasi), mikrofon native dengan low-latency, system tray (aplikasi tetap hidup di latar belakang), dan notifikasi sistem operasi native.
2. **Offline-First & Local Memory**: Memiliki database lokal (SQLite dengan ekstensi vector) dan storage lokal persisten sehingga pencarian dokumen, data stakeholder, dan memori chat tetap dapat diakses meski tanpa internet.
3. **Komunikasi Antar Perangkat Mandiri**: Kemampuan membuka raw TCP/UDP socket, peer-to-peer (P2P), dan direct LAN discovery untuk bertukar data secara langsung antar perangkat di jaringan lokal tanpa bergantung 100% pada server cloud.
4. **AI Berbasis Pengetahuan Stakeholder**: AI Coordinator tidak hanya memecah tugas secara generik, melainkan membaca **Direktori Stakeholder Perusahaan** (nama, peran, divisi, dan spesialisasi keahlian teknis) untuk menugaskan sprint secara otomatis ke personil yang tepat.
5. **Paradigma Komunikasi Human → AI → Human**: Komunikasi tim di MedioChat **tidak terjadi langsung mentah antar manusia (Human-to-Human)**, melainkan melalui **AI Relay Mediator**. Pengirim (Human A) menyampaikan pesan/suara ke AI, dan AI menyintesis serta berbicara kepada penerima (Human B / Tim) seolah asisten eksekutif berkata: *"Budi (PM) butuh data X dari Andi (Backend) sebelum lusa..."*, mengeliminasi tumpukan pesan bertele-tele dan menyajikan konteks aksi yang instan.

---

## 2. Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND UI (Vue 3 SPA)                        │
│   Vue Router · Pinia · Tailwind CSS v4 · Lucide Icons · TypeScript     │
│   Chat Room · Kanban Board · Team Directory · Vault · Radar · Settings │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC (Tauri v2 Invoke Bridge)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      NATIVE DESKTOP CORE (Tauri v2 - Rust)             │
│                                                                        │
│  ┌─────────────────────────┐ ┌──────────────────────────────────────┐  │
│  │     System Services     │ │      Universal AI Client Engine      │  │
│  │ - Dedicated OS Threads  │ │ - Ollama Native (/api/chat & /v1)    │  │
│  │ - Global Hotkey (PTT)   │ │ - OpenAI-Compatible (vLLM/Groq/etc)  │  │
│  │ - OS Config Storage     │ │ - Google Gemini API                  │  │
│  │ - Route IP Detector     │ │ - Dynamic Model Discovery via Tags   │  │
│  └─────────────────────────┘ └──────────────────┬───────────────────┘  │
│                                                 │                      │
│  ┌─────────────────────────┐ ┌──────────────────▼───────────────────┐  │
│  │  Local Data & Keyring   │ │   Stakeholder AI Task Decomposition  │  │
│  │ - Persistent Storage    │ │ - Stakeholder Directory Context      │  │
│  │ - Local Peer Nodes      │ │ - Skill & Department Matching        │  │
│  │ - Cache Management      │ │ - Structured JSON Output Validation  │  │
│  └─────────────────────────┘ └──────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Native UDP Mesh Discovery & Sync Engine              │  │
│  │ - Sync UDP Socket on Dedicated OS Thread (Port 42424)            │  │
│  │ - Zero Tokio-Reactor Panic Architecture                          │  │
│  │ - Real Outbound LAN IP Probe (via 8.8.8.8:80 route)              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
        LAN P2P UDP Broadcast (Port 42424)   HTTP/HTTPS (Reqwest + Rustls)
                    ▼                               ▼
       ┌────────────────────────┐      ┌──────────────────────────┐
       │   Perangkat Tim Lain   │      │    AI & Cloud Providers  │
       │ (PC Desktop / Laptop / │      │ - Ollama Server (Local)  │
       │  Workstation LAN Mesh) │      │ - Remote Cloud Ollama    │
       │                        │      │ - Google Gemini API      │
       └────────────────────────┘      └──────────────────────────┘
```

---

## 3. Komponen Utama Arsitektur

### 3.1. Presentation Layer (Frontend Vue 3 SPA)
* **Framework**: Vue 3 (Composition API, `<script setup lang="ts">`) + Vite.
* **UI/UX**: Tailwind CSS v4, Lucide Vue Next, Glassmorphism dark palette, micro-animations.
* **State Management (Pinia Stores)**:
  * `useChatStore`: Mengelola percakapan agregasi multi-platform, transkrip PTT, dan hasil dekomposisi AI.
  * `useTaskStore`: Mengelola kanban tugas, status (Todo, In Progress, Done), filter divisi, dan penugasan stakeholder (*assignee*).
  * `useStakeholderStore`: Mengelola direktori personil perusahaan, profil operator aktif ("Saya"), dan pencarian personil berdasarkan divisi/keahlian.
  * `useDeviceStore`: Menyimpan status workstation lokal dan radar peer P2P di LAN.
  * `useSettingStore`: Mengelola konfigurasi provider AI, dynamic models, network mode, dan global hotkey.
* **Router**:
  * `/chat`: Universal Team Feed & percakapan real-time.
  * `/board`: Kanban board tugas yang diekstrak oleh AI dengan fitur penugasan stakeholder.
  * `/team`: Direktori stakeholder organisasi & manajemen profil operator aktif.
  * `/vault`: Knowledge Vault file manager untuk dokumen teknis tim.
  * `/devices`: Radar perangkat peer di jaringan lokal (P2P mesh).
  * `/settings`: Konfigurasi multi-provider AI, latency test, model puller, dan pembersihan data/cache.

### 3.2. Native Core Layer (Tauri v2 - Rust)
Tauri v2 bertindak sebagai jembatan native berkinerja tinggi antara UI dan OS:
1. **Universal AI Client Engine (`src-tauri/src/ai/client.rs`)**:
   - Dibangun dengan `reqwest` dan `rustls-tls` murni (tanpa dependensi native C OpenSSL).
   - Mendukung endpoint native Ollama (`/api/chat`), OpenAI compatible (`/v1/chat/completions`), dan Google Gemini.
   - Dynamic model fetching melalui `/api/tags` dan `/v1/models`.
2. **Stakeholder Context Task Decomposition**:
   - Command `ai_decompose_task` menerima parameter opsional `stakeholders: Option<Vec<Stakeholder>>`.
   - Prompt sistem secara cerdas diinjeksi dengan nama, peran, divisi, dan keahlian seluruh anggota tim.
   - AI Coordinator memetakan setiap tugas ke personil yang paling kompeten.
3. **Dedicated OS Thread UDP Socket Mesh (`src-tauri/src/ai/discovery.rs`)**:
   - Menggunakan `std::thread::Builder` dan socket `std::net::UdpSocket` sinkron di port `42424`.
   - Menghilangkan bug "no reactor running" yang sering terjadi pada `tokio::spawn` di thread GUI Tauri v2.
   - Mendeteksi IP LAN rute aktif via probe `8.8.8.8:80` tanpa loopback issue.
4. **Local OS Storage Manager (`src-tauri/src/storage/mod.rs`)**:
   - Menyimpan konfigurasi aplikasi secara persisten di folder sistem OS (`$HOME/.config/mediochat/` atau `AppData`).

### 3.3. Inter-Device Sync Engine (Network Transport Abstraction)
* Interface `ITransportService` di frontend memisahkan logika UI dari implementasi jaringan fisik:
  * `LanTransportService`: Siap beroperasi langsung via broadcast socket UDP port 42424.
  * `CloudflareTransportService`: Siap beralih ke remote WebRTC signaling + encrypted offline mailbox.
  * `EnterpriseTransportService`: Siap terhubung ke central hub enterprise.
