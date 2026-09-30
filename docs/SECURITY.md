# Keamanan UMove

Apa yang melindungi UMove sekarang, dan aturan untuk tahap berikutnya.

## Jaringan

- **Cuma satu pintu masuk:** Cloudflare Tunnel. Mini PC tidak membuka port
  apa pun; app hanya mendengarkan di `127.0.0.1`; router tidak meneruskan apa pun.
- **Database internal:** `db` ada di jaringan Docker tanpa akses internet dan
  tanpa port yang dibuka.
- **Cloudflare di depan:** HTTPS (Full strict, TLS ≥ 1.2), perlindungan DDoS,
  rate limit WAF, dan filter bot (lihat SETUP.md langkah 6).
- **Firewall mini PC:** `ufw` menolak semua koneksi masuk kecuali SSH dari jaringan rumah.

## Container

Setiap container jalan dengan filesystem read-only, semua Linux capability
dicabut (kecuali beberapa yang dibutuhkan Postgres saat start),
`no-new-privileges`, batas memori dan proses, serta log yang dirotasi. App
jalan sebagai user `node` tanpa hak istimewa dan tidak bisa mengubah kodenya sendiri.

## HTTP (app/src/http)

| Perlindungan | Detail |
|---|---|
| Content Security Policy | Hanya script, style, font, dan gambar milik UMove sendiri. Tanpa inline script, tidak bisa di-iframe (`frame-ancestors 'none'`), tanpa plugin, `base-uri 'none'` |
| HSTS | 2 tahun, termasuk subdomain |
| Header lain | `X-Frame-Options: DENY`, `nosniff`, referrer ketat, COOP/CORP same-origin, Permissions-Policy menolak kamera, mikrofon, lokasi, pembayaran, USB |
| Rate limit | Per IP pengunjung (dari Cloudflare): 600/menit untuk situs, 120/menit untuk `/api`, dijawab 429 + `Retry-After` |
| CSRF | Request `/api` yang mengubah data harus berasal dari `https://umove.rafiarsya.com` (Origin + Sec-Fetch-Site) |
| Batas request | Body maks 32 KB, timeout 10 detik, method HTTP aneh ditolak |
| Error | Browser hanya menerima request id; detailnya tetap di log server |
| Satu origin | Web dan API di domain yang sama: tidak ada CORS yang bisa salah setting |

## Aplikasi

- **Config divalidasi saat start** (zod). Setting yang hilang atau salah
  menghentikan app; nilainya tidak pernah dicetak.
- **Log menyensor** apa pun yang mirip password, token, cookie, session,
  email, atau nomor HP.
- **SQL** hanya lewat query berparameter (tagged template `postgres`).
- **Bot Telegram** pakai long polling (tidak ada webhook publik), membatasi
  kecepatan pesan keluar, membuang spam per user, hanya menjawab chat pribadi.

## Database

- App terhubung sebagai **`umove_app`**: hanya bisa baca/tulis baris. Tidak
  bisa membuat, mengubah, atau menghapus tabel, dan tidak bisa mengedit atau
  menghapus audit log.
- **Aturan di skema**: format dan panjang (email, username, nomor WhatsApp,
  teks), status yang diizinkan, tidak bisa me-rating atau me-report diri sendiri.
- Query dibatalkan setelah 5 detik; transaksi menggantung setelah 10 detik.
- **Backup** hanya bisa dibaca pemiliknya (`umask 077`) dan dirotasi.

## Login & session (sudah diterapkan, dites di `app/test/`)

1. **Login Google** dengan authorization-code flow, **PKCE**, `state`, dan
   `nonce`; ID token diverifikasi (issuer, audience, kedaluwarsa). Tanpa password.
2. **Session**: 32 byte acak di cookie `HttpOnly`, `Secure`, `SameSite=Lax`,
   berawalan `__Host-`. Yang disimpan hanya hash SHA-256-nya (tabel `sessions`).
   Diganti setiap login; kedaluwarsa 30 hari; logout menghapus barisnya.
3. **Setiap penulisan data** mengecek kepemilikan di klausa SQL `WHERE`
   memakai user id dari session, bukan id yang dikirim browser.
4. **Setiap input** di-parse dengan skema zod yang ketat sebelum dipakai.
5. **Nomor WhatsApp** hanya dikirim ke pasangan order yang cocok, tidak
   pernah di respons publik.
6. **Admin** ditentukan dari setting `ADMIN_EMAILS`, tidak pernah dari UI;
   setiap aksi admin dicatat di `audit_log`.
7. Rate limit lebih ketat: login 20/menit, semua penulisan data 30/menit per IP.
8. Pengguna baru mendapat username otomatis dari email; username bisa diganti, unik, dan divalidasi di database.
9. Pendaftaran runner butuh nomor WhatsApp; admin menyetujui/menolak dari halaman /admin, dan setiap keputusan dicatat.

## Rutinitas

- Jalankan `npm run audit` di `app/` dan `web/` sebelum deploy.
- `apt upgrade` sudah otomatis (unattended-upgrades); rebuild image tiap
  bulan untuk base image terbaru: `docker compose build --pull && docker compose up -d`.
