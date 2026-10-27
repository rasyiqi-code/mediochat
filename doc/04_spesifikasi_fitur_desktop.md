# Spesifikasi Fitur: MedioChat Desktop

Dokumen ini merinci seluruh kapabilitas fungsional yang telah diimplementasikan pada aplikasi desktop **MedioChat** (Team AI Bridge).

---

## 1. Fitur Multi-User & Direktori Stakeholder (`/team`)

Sistem multi-user didesain agar AI Coordinator mengenali personil di dalam organisasi secara lengkap, sehingga pembagian tugas sprint dapat dilakukan secara otomatis dan tepat sasaran.

### 1.1. Direktori Personil Organisasi
* Menyimpan entitas stakeholder lengkap dengan:
  - **Identitas**: Nama lengkap, peran/posisi jabatan, dan divisi organisasi (`backend`, `frontend`, `desain`, `devops`, `qa`, `general`).
  - **Spesialisasi & Keahlian**: Daftar keahlian teknis (contoh: *Rust, PostgreSQL, Vue 3, Docker, Kubernetes, Figma, Playwright*).
  - **Kanal Komunikasi**: Username Telegram, akun Slack, dan alamat email perusahaan.
  - **Status Kehadiran**: Indikator status kehadiran (*online*, *away*, *busy*, *offline*).

### 1.2. Profil Operator Aktif ("Saya") & Profile Switcher
* Setiap workstation desktop memiliki satu profil yang ditandai sebagai operator aktif (`isCurrentUser = true`).
* Semua pesan yang dikirim ke Universal Feed dan tugas yang dibuat otomatis mencantumkan identitas profil aktif ini.
* Switcher profil instan tersedia di halaman `/team`, mini widget sidebar, dan menu pengaturan, memungkinkan pengguna menguji alur kerja berbagai personil.

### 1.3. AI Stakeholder Task Mapping & Auto-Assignment
* Saat instruksi didekomposisi, AI Coordinator menerima daftar seluruh personil tim.
* Model AI mencocokkan lingkup tugas dengan divisi dan keahlian masing-masing personil, lalu menetapkan `assignee_name` dan `assignee_role`.
* Tugas yang dihasilkan langsung memiliki penanggung jawab yang sah di dalam perusahaan.

---

## 2. Fitur AI & Voice Processing

### 2.1. Push-to-Talk (PTT) & Voice Note Auto-Decomposition
* **Push-to-Talk Native**: Pengguna dapat menekan tombol mikrofon di antarmuka atau tombol global untuk mendiktekan perintah suara secara langsung.
* **Live Streaming Transcript**: Menampilkan transkrip suara secara real-time saat pengguna berbicara.
* **Auto-Decomposition**: AI menganalisis transkrip audio atau teks pesan, menghasilkan:
  1. Ringkasan eksekutif 1-2 kalimat.
  2. Tanggal target deadline tugas.
  3. Rincian tugas terstruktur (deskripsi aksi, divisi, prioritas, estimasi jam, dan stakeholder penanggung jawab).

### 2.2. Multi-Provider AI Engine & Dynamic Model Catalog
* **Dukungan Provider Universal**:
  - **Ollama**: Endpoint native `/api/chat` dan `/v1/chat/completions` (mendukung autentikasi token bearer).
  - **OpenAI Compatible**: Kompatibel dengan vLLM, Groq, DeepSeek, LocalAI, dan LM Studio.
  - **Google Gemini**: Menggunakan REST API Google Gemini via API Key.
  - **Custom Endpoints**: Pengguna dapat menambahkan endpoint AI khusus di menu Pengaturan.
* **Dynamic Model Discovery**: Tombol "Ambil Model dari Server" yang langsung memanggil endpoint `/api/tags` atau `/v1/models` dari server AI di runtime.
* **Latency & Connection Tester**: Mengukur latensi koneksi (dalam milidetik) dan memverifikasi integritas endpoint sebelum digunakan dalam sprint.

---

## 3. Fitur Universal Team Feed & Kanban Board

### 3.1. Universal Team Feed: Telegram-Style AI Assistant Bubbles (`/chat`)
* **Paradigma Komunikasi Human ➔ AI ➔ Human (Setiap Stakeholder Punya Asisten Pribadi)**:
  - Komunikasi di MedioChat tidak langsung mentah antar manusia, melainkan diperantarai oleh Asisten AI pribadi masing-masing stakeholder.
* **Tata Letak Geometri Bubble Chat Telegram (Kanan & Kiri)**:
  - **Bubble Kanan (Outgoing / Pengguna Aktif)**:
    - Pesan yang diketik atau diucapkan oleh pengguna aktif (*"tolong @dimas siapkan UI-nya"*) langsung tampil di sisi kanan dengan gaya *outgoing bubble* Telegram (gradien violet-indigo, sudut rounded-2xl rounded-br-xs).
    - Dilengkapi penanda waktu dan ikon centang ganda (*double tick* `✓✓`) khas Telegram.
  - **Bubble Kiri (Incoming / MedioAI Asisten)**:
    - Asisten AI berbicara di sisi kiri feed dengan avatar bot dan lencana kecerdasan buatan.
    - Nada bicara alami seolah asisten pribadi yang sedang menyampaikan kebutuhan rekan tim:
      - *Kebutuhan data/bantuan*: `"@Dimas Wicaksono, si Andi butuh aset desain login dari kamu nih sebelum besok."`
      - *Penugasan/instruksi*: `"@Dimas Wicaksono, si Andi minta kamu siapkan UI-nya nih sebelum besok."`
      - *Update/kabar*: `"Halo tim! Si Andi bilang gini: Server staging sudah siap diuji ya."`
      - *Sapaan casual*: `"Halo Mas Andi! Ada tugas atau koordinasi yang mau disampaikan ke tim hari ini?"`
    - Tampilan bubble chat bersih dan fokus pada percakapan (tanpa kartu tugas yang mengaburkan pesan), sementara seluruh aksi tugas langsung terpusat rapi di halaman Kanban Board (`/board`).
* **Manajemen Feed Bersih**:
  - Tombol hapus satuan pada setiap bubble pesan (muncul saat *hover*).
  - Tombol **Bersihkan Feed** di header untuk mereset seluruh riwayat obrolan kapan saja.

### 3.2. Interactive Multi-User Kanban Board (`/board`)
* **Tiga Kolom Status**:
  1. **Siap Dikerjakan (Todo)**: Tugas yang baru diekstrak atau dibuat secara manual.
  2. **Sedang Dikerjakan (In Progress)**: Tugas aktif dengan tombol alih status (*Mulai / Selesai*).
  3. **Selesai (Done)**: Tugas rampung dengan opsi buka kembali (*Reopen*).
* **Fitur Penugasan & Reassign**: Setiap kartu menampilkan stakeholder yang ditugaskan beserta dropdown untuk mengalihkan tugas ke personil lain.
* **Filter Ganda**: Memfilter papan Kanban berdasarkan **Divisi** dan **Stakeholder**.
* **Modal Tambah Tugas Manual**: Memungkinkan pembuatan tugas langsung dengan memilih stakeholder penanggung jawab.

---

## 4. Fitur Jaringan & Radar P2P Mesh (`/devices`)

### 4.1. Radar Perangkat LAN Mesh
* **Socket UDP Native (Port 42424)**: Berjalan di thread OS mandiri tanpa overhead Tokio reactor, mendeteksi laptop dan workstation rekan tim di jaringan Wi-Fi/LAN yang sama secara zero-config.
* **Deteksi Identitas Node Lokal**: Mendeteksi IP LAN aktif workstation melalui probe rute keluar (`8.8.8.8:80`) dan nama hostname OS.
* **P2P Direct Broadcast**: Menyiarkan pembaruan tugas dan pesan feed ke rekan tim di subnet lokal.

---

## 5. Fitur Manajemen Data & Cache Lokal (`/settings`)

* **Zero Dummy Data**: Seluruh data mock telah dihapus; aplikasi hanya menampilkan data riil pengguna.
* **Local Storage Persistence**: Semua perubahan pada pesan feed, kanban task, dan stakeholder tersimpan persisten.
* **Panel Manajemen Data**:
  - Tombol **Bersihkan Pesan Feed**: Menghapus seluruh riwayat feed chat.
  - Tombol **Bersihkan Semua Task**: Menghapus seluruh kartu di papan Kanban.
  - Tombol **Reset Tim ke Default**: Mengembalikan direktori stakeholder ke susunan tim standar.
