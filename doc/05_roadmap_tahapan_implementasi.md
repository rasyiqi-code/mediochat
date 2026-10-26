# Roadmap Bertahap: 3 Opsi Implementasi MedioChat

## 1. Fase 1: Standalone Desktop & Local LAN (Zero-Deploy)
* **Status:** Fokus Mulai Pertama.
* **Fitur:** Tauri v2 + Vue 3, SQLite + `sqlite-vec`, PTT Global Hotkey, Qwen AI DashScope, mDNS LAN Discovery, Biaya Rp 0/bulan.

## 2. Fase 2: Cloudflare Workers Hybrid (Remote P2P & Mailbox)
* **Status:** Pengembangan Lanjutan.
* **Fitur:** WebRTC Signaling Serverless via Cloudflare Worker, Encrypted Offline Mailbox untuk tim WFA, Biaya Gratis (Free Tier).

## 3. Fase 3: Enterprise Centralized Hub (Full Deployment)
* **Status:** Skala Perusahaan Besar.
* **Fitur:** Dedicated Fastify + PostgreSQL Server, Multi-Tenant Workspace, Central Audit Trail.

## 4. Network Transport Abstraction
Menggunakan interface `ITransportService` agar frontend Vue 3 tidak perlu ditulis ulang saat naik fase:
* `LanTransport` (Fase 1)
* `CloudflareWebRtcTransport` (Fase 2)
* `EnterpriseServerTransport` (Fase 3)
