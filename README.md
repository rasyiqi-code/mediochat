# MedioChat ⚡ Team AI Bridge

> **Desktop AI Communication & Project Coordination Bridge**  
> Paradigma *Human ➔ AI ➔ Human* berkecepatan tinggi dengan estetika **Neobrutalisme**, privasi 100% lokal (*$0/month cloud infrastructure*), dan fitur intelijen eksekutif.

---

## 🌟 Fitur Utama

- **Human ➔ AI ➔ Human Relay**: Komunikasi alami di mana setiap stakeholder didampingi asisten pribadi cerdas. AI mendekonstruksi pesan santai/suara menjadi tugas teknis, intent terarah, dan briefing personal.
- **Tampilan Chat Telegram (Neobrutalisme)**: Bubble chat kanan/kiri bernuansa Neobrutalisme modern (border tebal 2–3px, bayangan keras *zero-blur*, kontras tajam, warna pastel berani).
- **Daily Standup Reports (`/reports`)**: Sintesis otomatis aktivitas tim harian, status sprint Kanban, dan voice notes yang dapat diekspor atau diteruskan ke platform eksternal.
- **Things That Matter (`/things-matter`)**: Framework intelijen eksekutif **5W1H** (*What, Who, Where, When, Why, How*) untuk menyaring keputusan kunci, blocker kritis, dan tindak lanjut konkret.
- **Contextual Knowledge Vault Citation (RAG)**: AI Coordinator otomatis mencari dokumen relevan di Knowledge Vault lokal dan menyematkan badge sitasi interaktif di bubble percakapan tim.
- **Multi-Provider AI Terbuka**: Dukungan fleksibel untuk model lokal via **Ollama** (Llama 3, DeepSeek, Qwen), Google Gemini API, OpenAI, maupun custom endpoints. Dilengkapi **Local Synthesis Fallback** saat server AI offline.
- **Integrasi Platform Eksternal (Ghost-Relay Engine)**: Teruskan laporan harian dan intelijen 5W1H langsung ke **Telegram Bot API** dan **Slack Incoming Webhooks** tanpa perlu server perantara.
- **Push-to-Talk (PTT)**: Rekam instruksi suara langsung dari mikrofon dengan transkripsi AI dan dekomposisi otomatis ke papan Kanban.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri v2](https://v2.tauri.app/) (Rust Core)
- **Frontend**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: Vanilla CSS + TailwindCSS (Custom Neobrutalism Design System)
- **Icons**: [Lucide Icons](https://lucide.dev/)

---

## 🚀 Memulai (Development)

### Prasyarat
- [Node.js](https://nodejs.org/) & [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/) & Cargo
- Paket sistem Tauri (Linux): `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Menjalankan Aplikasi
```bash
# Clone repository
git clone https://github.com/rasyiqi-code/mediochat.git
cd mediochat

# Install dependencies
bun install

# Jalankan dalam mode desktop development
bun tauri dev
```

### Build Produksi
```bash
bun tauri build
```

---

## 📄 Lisensi
MIT License © 2026 rasyiqi-code
