# Spesifikasi Fitur: MedioChat Desktop

## 1. Fitur Native Desktop (OS-Level Integration)

### 1.1. Global Push-to-Talk (PTT) Hotkey
* Pengguna dapat berbicara dan mengirim instruksi kapan saja tanpa perlu membuka jendela aplikasi.
* Pengguna menekan kombinasi tombol global (default: `Ctrl + Shift + Space`).
* Overlay visualizer mengambang muncul di layar.
* Begitu tombol dilepas, audio langsung dikirim ke AI untuk transkripsi dan ekstraksi perintah.

### 1.2. System Tray & Background Daemon
* Aplikasi diminimalkan ke System Tray saat tombol close diklik.
* Menampilkan status online rekan tim di sekitar, toggle status, dan akses menu cepat.

### 1.3. Native Interactive Notifications
* Notifikasi tugas baru atau pesan masuk dikirimkan melalui sistem notifikasi OS dengan tombol aksi interaktif (`[Kerjakan]`, `[Selesai]`, `[Buka]`).

---

## 2. Fitur AI & Voice Processing

### 2.1. Voice Note Auto-Decomposition
* AI mentranskripsi suara, membuat ringkasan 1-2 kalimat, dan memecah instruksi ke dalam daftar tugas per divisi (`backend`, `frontend`, `desain`, `qa`, `devops`, `general`).

### 2.2. Interactive Kanban Board (`/board`)
* Menampilkan seluruh tugas yang diekstrak oleh AI dari percakapan tim.
* Kolom: **Todo**, **In Progress**, dan **Done** dengan drag-and-drop.

### 2.3. RAG Auto-Reply & Knowledge Vault Lokal (`/vault`)
* Dokumen dan chat diindeks ke vector embedding via `text-embedding-v3` di SQLite lokal (`sqlite-vec`).
* AI menjawab otomatis pertanyaan berulang dengan mengutip sumber pembahasan lama.

---

## 3. Fitur Komunikasi Antar Perangkat

### 3.1. Radar Perangkat Sekitar (Local LAN Mesh)
* Mendeteksi perangkat tim yang sedang online di Wi-Fi lokal via mDNS.
* P2P Fast Drop: transfer file besar langsung antar laptop di jaringan lokal tanpa kuota internet.
