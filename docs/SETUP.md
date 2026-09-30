# Setup UMove di mini PC (production)

Semuanya jalan di mini PC lu: web, API, database, login Google, dan bot
Telegram. Cloudflare cuma jadi jalur masuk (HTTPS + perlindungan) lewat
Tunnel. Tidak ada layanan pihak ketiga yang membatasi jumlah request.

```
Pengunjung ──HTTPS──▶ Cloudflare ──Tunnel──▶ mini PC
                                              ├─ tunnel  (cloudflared)
                                              ├─ app     (web + /api + bot)
                                              └─ db      (Postgres, internal saja)
```

Hasil akhir: **https://umove.rafiarsya.com** jalan, dan kamu bisa login pakai Google.

Butuh sekitar 30 menit. Kerjakan urut; kalau ada error, berhenti dan kirim pesan error-nya.

---

## 1. Siapkan 3 hal di browser (dari laptop)

### a. Cloudflare Tunnel

1. dash.cloudflare.com → **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**, nama `umove`
2. Pilih **Docker**. Salin **token**-nya saja (teks panjang setelah `--token`). Simpan dulu di Notepad.
3. **Public hostname**: subdomain `umove`, domain `rafiarsya.com`, service **HTTP**, URL **`app:3000`** → Save

Kalau `umove.rafiarsya.com` sebelumnya diarahkan ke tempat lain (Pages/Vercel), hapus dulu record DNS lamanya.

### b. Login Google (OAuth)

1. Buka **console.cloud.google.com** → buat project baru `UMove`
2. **Google Auth Platform → Branding**: App name `UMove`, support email = email lu,
   Authorized domain = `rafiarsya.com`
3. **Audience**: External → **Publish app** (status *In production*). Untuk scope
   dasar (nama + email) tidak perlu verifikasi Google.
4. **Clients → Create client → Web application**, nama `UMove web`
   - Authorized JavaScript origins: `https://umove.rafiarsya.com`
   - Authorized redirect URIs: `https://umove.rafiarsya.com/api/auth/google/callback`
5. Salin **Client ID** dan **Client secret** ke Notepad.

### c. Kode di GitHub

Di laptop, folder `E:\UMOVE` (buat repo **private** `umove` di GitHub dulu):

```bash
git init
git add .
git commit -m "UMove"
git branch -M main
git remote add origin https://github.com/USERNAME-LU/umove.git
git push -u origin main
```

`.env` (rahasia) tidak pernah ikut ter-upload.

## 2. Siapkan mini PC (sekali saja)

Login ke mini PC (langsung atau SSH), lalu:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # update keamanan otomatis

# Firewall: tidak ada yang boleh masuk kecuali SSH dari jaringan rumah
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp
sudo ufw enable
```

> Tunnel membuat koneksi **keluar**, jadi jangan port-forward apa pun di router.

## 3. Install UMove

```bash
git clone https://github.com/USERNAME-LU/umove.git
cd umove
bash scripts/install.sh
```

Script ini akan:

- menginstall Docker kalau belum ada (lalu minta kamu logout/login dan jalankan lagi),
- menanyakan token Tunnel, Google Client ID & secret, email admin, dan token bot (opsional),
- membuat password database acak dan menyimpan semuanya di `.env` (hanya bisa dibaca kamu),
- build dan menyalakan UMove, lalu menunggu sampai sehat.

Setelah muncul **"UMove is running."**, buka **https://umove.rafiarsya.com** dari HP dan coba login.
Email yang kamu isi sebagai admin akan melihat menu **Admin** untuk menyetujui runner.

## 4. Pengaturan keamanan Cloudflare (sekali saja)

Untuk domain `rafiarsya.com`:

| Menu | Pengaturan |
|---|---|
| SSL/TLS → Overview | **Full (strict)** |
| SSL/TLS → Edge Certificates | Always Use HTTPS **on**, Minimum TLS **1.2**, TLS 1.3 **on** |
| Security → Settings | Security level **Medium**, Browser Integrity Check **on** |
| Security → WAF → Rate limiting rules | `/api/*`: 100 request / 10 detik per IP → Block 1 menit |
| Security → Bots | Bot Fight Mode **on** |

## 5. Backup otomatis

```bash
crontab -e
```

Tambahkan (ganti `USER`):

```
0 4 * * * cd /home/USER/umove && bash scripts/backup.sh >> backups/backup.log 2>&1
```

Sesekali salin folder `backups/` ke perangkat lain.

---

## Update setelah ada perubahan kode

Di laptop: `git add . && git commit -m "update" && git push`. Lalu di mini PC:

```bash
cd ~/umove && bash scripts/update.sh
```

## Perintah berguna

```bash
docker compose ps                 # status
docker compose logs -f app        # log aplikasi
docker compose restart app        # restart app
nano .env && docker compose up -d # ubah setting (mis. tambah admin atau token bot)
```

## Masalah yang sering muncul

| Masalah | Solusi |
|---|---|
| Login Google: `redirect_uri_mismatch` | Redirect URI di Google harus persis `https://umove.rafiarsya.com/api/auth/google/callback` |
| Login Google: "access blocked" | Di Google Auth Platform → Audience, klik **Publish app** |
| Cloudflare error 1033 | Tunnel tidak jalan: `docker compose logs tunnel` |
| Error 502 | Public hostname harus `app:3000`, bukan `localhost:3000` |
| `app` unhealthy | `docker compose logs app` (error config menyebut nama variabelnya) |
| `db` tidak mau start | Hapus baris `read_only`, `tmpfs`, dan `cap_add` di bagian `db` pada `docker-compose.yml`, lalu `docker compose up -d` |
| Ganti password DB setelah start pertama | Password hanya dibaca saat database dibuat. Mulai ulang: `docker compose down -v` (**semua data terhapus**) |
