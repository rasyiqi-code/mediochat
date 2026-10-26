# Komunikasi Antar Perangkat (Inter-Device Communication)

## 1. Analisis: Apakah Desktop App Bisa Berkomunikasi Antar Perangkat?

**Jawabannya: SANGAT BISA, dan jauh lebih fleksibel daripada Web App.**

Pada web app biasa (di browser), aplikasi dibatasi oleh keamanan sandbox browser: browser tidak diizinkan membuka port TCP server lokal, tidak bisa mendengarkan paket UDP mDNS secara native, dan selalu membutuhkan server perantara di internet untuk menghubungkan dua perangkat.

Sebaliknya, **Desktop Application** memiliki akses penuh ke jaringan sistem operasi. Aplikasi desktop dapat bertindak sebagai **klien sekaligus server (peer-to-peer)** secara mandiri.

---

## 2. Tiga Mode Komunikasi Antar Perangkat

MedioChat Desktop mengimplementasikan arsitektur komunikasi hibrida 3 lapis:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIGA MODE KOMUNIKASI                           │
│                                                                        │
│  [MODE 1: LAN P2P]         [MODE 2: INTERNET P2P]   [MODE 3: RELAY]    │
│  Satu Wi-Fi / Kantor       Beda Jaringan (Remote)   Fallback Jaringan  │
│  ───────────────────       ──────────────────────   ─────────────────  │
│  • mDNS Auto-Discovery     • WebRTC DataChannel     • WebSocket Relay  │
│  • Zero-Cloud / Offline    • STUN/TURN NAT Traversal• Push Notification│
│  • Direct TLS Socket       • End-to-End Encrypted   • Offline Queue    │
│  • Kecepatan Gbps Wi-Fi    • Direct Tunnel          • Multi-Tenant Sync│
└────────────────────────────────────────────────────────────────────────┘
```

---

### Mode 1: Komunikasi Lokal Tanpa Internet (LAN Peer-to-Peer)
*Skenario: Tim sedang bekerja di kantor, kafe, atau ruangan yang sama dengan Wi-Fi bersama.*

1. **Auto-Discovery via mDNS (Multicast DNS / Bonjour):**
   * Saat MedioChat dibuka di Laptop Andi, aplikasi membroadcast layanan lokal:
     `_mediochat._tcp.local` port `5288` dengan metadata identitas (nama, avatar hash, device ID).
   * Laptop Budi yang berada di jaringan Wi-Fi yang sama langsung mendeteksi keberadaan Laptop Andi **dalam hitungan milidetik tanpa perlu mengetik alamat IP**.
2. **Koneksi Direct TLS Socket:**
   * Laptop Andi dan Laptop Budi membuat koneksi TLS langsung antar perangkat (Local Peer-to-Peer).
   * **Keuntungan:**
     * **100% Berfungsi Tanpa Internet:** Jika koneksi internet mati atau dibatasi firewall perusahaan, koordinasi tim dan transfer file tetap berjalan lancar.
     * **Kecepatan Maksimal:** Pengiriman video, file desain GB, atau voice note berjalan secepat bandwidth Wi-Fi lokal (100–500 Mbps), bukan bandwidth internet upload.
     * **Privasi Mutlak:** Data tidak pernah meninggalkan router lokal.

---

### Mode 2: Komunikasi Antar Jaringan Langsung (Direct Internet P2P via WebRTC)
*Skenario: Andi di rumah (Jakarta), Budi di kantor (Bandung), keduanya berada di balik router/NAT berbeda.*

1. **Signaling Awal:**
   * Kedua perangkat bertukar metadata koneksi (SDP Offer/Answer & ICE Candidates) melalui server perantara sinyal ringan (Signaling Server / Cloudflare Worker).
2. **NAT Hole Punching:**
   * Menggunakan protokol **STUN** (Session Traversal Utilities for NAT) untuk menembus firewall rumah/kantor.
3. **WebRTC DataChannel:**
   * Saluran komunikasi data langsung terbentuk antara PC Andi dan PC Budi.
   * Paket data, chat, voice note, dan task mengalir langsung dari PC ke PC tanpa transit di server cloud.

---

### Mode 3: Cloud Relay & Offline Sync (Fallback / Asynchronous)
*Skenario: Budi sedang mematikan laptopnya atau jaringan NAT bertipe Symmetric (sulit ditembus P2P murni).*

1. **Relay Server (Cloudflare Worker / Fastify):**
   * Meneruskan paket terenkripsi (Zero-Knowledge Relay).
2. **Offline Message Queue:**
   * Jika laptop target sedang offline, pesan disimpan di antrean terenkripsi server hingga perangkat target online kembali.
