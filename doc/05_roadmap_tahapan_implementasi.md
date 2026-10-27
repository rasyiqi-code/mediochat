# Roadmap Bertahap: Tahapan Implementasi MedioChat Desktop

Dokumen ini mencatat rencana strategis dan status terkini implementasi sistem **MedioChat Desktop** (Team AI Bridge) berbasis **Tauri v2 + Vue 3 + Rust Core**.

---

## 1. Status Implementasi Terkini (Progress Tracking)

| Komponen & Fitur | Status | Detail Implementasi & Keterangan |
| :--- | :---: | :--- |
| **Tauri v2 Rust Core Backend** | ✅ **Selesai (Production)** | Terkompilasi bersih via `cargo check` & `cargo build`. Menggunakan `rustls-tls` tanpa dependensi native C OpenSSL. |
| **Multi-Provider AI Client Engine** | ✅ **Selesai (Production)** | Native Rust HTTP client (`reqwest`) mendukung **Ollama** (native `/api/chat` + `/v1`), **OpenAI-Compatible** (vLLM, Groq, DeepSeek), **Google Gemini API**, dan custom provider. |
| **Dynamic Model Discovery** | ✅ **Selesai (Production)** | Pengambilan daftar model langsung dari server AI di runtime via `/api/tags` & `/v1/models` (didukung model `beam`, `gemma4:31b`, `gpt-oss:120b`, `gpt-oss:20b`, `nemotron-3-nano:30b`, `nemotron-3-super`, `nemotron-3-ultra`). |
| **Native UDP LAN Mesh Discovery** | ✅ **Selesai (Production)** | Socket UDP native di port `42424` berjalan di thread OS mandiri (`std::thread::Builder`) menghindari konflik Tokio reactor, lengkap dengan deteksi IP LAN rute aktif. |
| **Multi-User & Stakeholder Directory** | ✅ **Selesai (Production)** | Halaman `/team`, profil operator aktif ("Saya"), penyuntikan direktori ke prompt sistem AI untuk pemetaan tugas ke personil berdasarkan keahlian teknis & divisi. |
| **Kanban Board Multi-User** | ✅ **Selesai (Production)** | Tiga kolom (Todo, In Progress, Done), filter stakeholder & divisi, badge personil penanggung jawab, serta fitur alihkan tugas (*reassign*). |
| **Universal Team Feed** | ✅ **Selesai (Production)** | Push-to-Talk (PTT), live streaming transkrip audio, kartu dekomposisi tugas AI, tombol bersihkan feed, dan penghapusan pesan per-item. |
| **Zero Mock / Clean Storage** | ✅ **Selesai (Production)** | Tidak ada data dummy hardcoded; seluruh state tersimpan persisten di `localStorage` dan storage config OS, dengan panel pembersihan cache. |
| **Network Transport Abstraction** | ✅ **Selesai (Production)** | Interface `ITransportService` siap beralih antara LAN P2P, Cloudflare Hybrid, dan Enterprise Hub. |

---

## 2. Fase 1: Standalone Desktop & Local LAN Mesh (Status: SELESAI / AKTIF)
* **Tujuan:** Aplikasi berjalan mandiri di workstation pengguna dengan biaya infrastruktur **Rp 0 / bulan**, beroperasi secara offline-first dan langsung terhubung antar rekan tim di satu jaringan LAN/Wi-Fi.
* **Fitur Utama yang Telah Aktif:**
  1. **Rust Native Backend**:
     - Handler IPC Tauri v2: `ai_decompose_task`, `ai_chat_completion`, `ai_fetch_models`, `ai_test_connection`, `get_lan_peers`, `broadcast_lan_presence`, `get_local_node_info`.
     - Socket UDP Broadcast & Listener di port 42424.
  2. **Multi-User Stakeholder Knowledge Base**:
     - Direktori personil perusahaan (`name`, `role`, `division`, `email`, `skills`, `platformHandles`, `status`).
     - AI Coordinator otomatis mengenali stakeholder dan memetakan tugas sprint ke personil yang kompeten.
     - Switcher profil operator perangkat dengan 1 klik.
  3. **Universal Feed & Kanban Board**:
     - Agregasi pesan multi-platform (Local, Telegram, WhatsApp, Slack).
     - Auto-decomposition transkrip suara atau teks sprint menjadi item tugas ber-deadline.
     - Drag/reassign tugas antar stakeholder di Kanban.
  4. **Multi-Provider AI Engine**:
     - Mendukung Ollama lokal, remote cloud Ollama (token auth), Google Gemini, Groq, dan custom endpoints.
     - Latency tester dan dynamic model puller langsung dari UI pengaturan.

---

## 3. Fase 2: Cloudflare Workers Hybrid (Remote P2P & Mailbox)
* **Status:** Arsitektur & Antarmuka Siap (Stub `CloudflareTransportService` aktif).
* **Fokus Pengembangan:**
  1. **WebRTC Signaling Serverless**:
     - Menggunakan Cloudflare Workers + Durable Objects sebagai signaling channel WebRTC gratis.
     - Menghubungkan laptop tim yang bekerja remote (Work From Anywhere / beda jaringan internet) secara P2P via STUN/TURN gratis.
  2. **Encrypted Offline Mailbox**:
     - Saat rekan tim sedang offline / laptop tertutup, pesan tugas dienkripsi E2EE (hanya penerima yang punya kunci privat) dan dititipkan sementara di KV/D1 Cloudflare (Free Tier).
     - Saat laptop online, pesan langsung disedot dan didekripsi lokal.

---

## 4. Fase 3: Enterprise Centralized Hub (Skala Perusahaan Besar)
* **Status:** Desain Arsitektur Tersedia (Stub `EnterpriseTransportService` aktif).
* **Fokus Pengembangan:**
  1. **Central Server Sync**:
     - Backend Fastify + PostgreSQL + pgvector untuk perusahaan yang mewajibkan central backup dan compliance audit trail.
  2. **Multi-Tenant & Role-Based Access Control (RBAC)**:
     - Hak akses per divisi, persetujuan sprint oleh Tech Lead, dan SSO (Single Sign-On).

---

## 5. Network Transport Abstraction (`src/services/transport/`)
Arsitektur frontend sepenuhnya decoupled dari protokol jaringan melalui antarmuka `ITransportService`:
* `LanTransportService`: Menggunakan socket UDP Rust native di port 42424 untuk LAN mesh broadcast.
* `CloudflareTransportService`: Siap dihubungkan ke WebRTC DataChannel signaling Worker.
* `EnterpriseTransportService`: Siap dihubungkan ke REST/WebSocket Central Hub.
Penggantian mode jaringan dapat dilakukan secara instan di menu Pengaturan tanpa merombak komponen UI feed maupun kanban.
