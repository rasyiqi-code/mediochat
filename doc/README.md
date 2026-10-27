# Dokumentasi Perancangan MedioChat Desktop

Selamat datang di dokumentasi resmi **MedioChat Desktop**, sistem komunikasi dan koordinasi tim asinkron berbasis AI yang dibangun sebagai **Native Desktop Application** dengan **Tauri v2 + Vue 3 + Rust Core**.

---

## 🚀 Status Implementasi Terkini (Fase 1: Aktif & Terverifikasi)
* **Rust Native Core**: Client HTTP AI universal (`reqwest` + `rustls-tls`), socket discovery UDP di port 42424 pada dedicated OS thread, deteksi rute IP LAN riil.
* **Multi-User Stakeholder Architecture**: Direktori tim terintegrasi, profil operator aktif ("Saya"), dan auto-assignment tugas sprint oleh AI berdasarkan keahlian teknis personil.
* **Production-Grade Data Layer**: Bebas dari data dummy/mock; penyimpanan persisten lokal dengan panel reset cache di menu Pengaturan.

---

## 📚 Daftar Dokumen Teknis

| No | Dokumen | Ringkasan Isi |
| :---: | :--- | :--- |
| **01** | [**01_arsitektur_desktop.md**](01_arsitektur_desktop.md) | Gambaran arsitektur sistem modular desktop, diagram alur IPC Tauri, dan subsistem native core. |
| **02** | [**02_komunikasi_antar_perangkat.md**](02_komunikasi_antar_perangkat.md) | Spesifikasi teknis komunikasi antar perangkat: Local LAN UDP Mesh (Port 42424), WebRTC, Cloud Relay, dan E2EE. |
| **03** | [**03_tech_stack_desktop.md**](03_tech_stack_desktop.md) | Spesifikasi tech stack terverifikasi: **Tauri v2 (Rust) + Vue 3 + TypeScript + Tailwind CSS v4 + Pinia + Reqwest + Rustls**. |
| **04** | [**04_spesifikasi_fitur_desktop.md**](04_spesifikasi_fitur_desktop.md) | Rincian fitur: Direktori Stakeholder (`/team`), Universal Feed (`/chat`), Multi-User Kanban (`/board`), Radar P2P (`/devices`), dan AI Model Catalog. |
| **05** | [**05_roadmap_tahapan_implementasi.md**](05_roadmap_tahapan_implementasi.md) | Status progress fitur terperinci, strategi roadmap 3 fase, dan Network Transport Abstraction. |
