# Setup UMOVE (production)

UMOVE dibagi dua, supaya cepat, murah, dan tidak ada batas request:

```
Pengunjung ──▶ umove.rafiarsya.com  (Cloudflare Worker)
                 ├─ tampilan web   → langsung dari Cloudflare (cepat, gratis, tanpa batas)
                 └─ /api/*         → diteruskan ke mini PC lewat Tunnel
                                         │
                          umove-api.rafiarsya.com (Cloudflare Tunnel)
                                         │
                                      mini PC
                                         ├─ app  (API, login Google, realtime, bot)
                                         └─ db   (Postgres, tidak bisa diakses dari luar)
```

- **Web** ter-deploy **otomatis** setiap `git push` (Cloudflare Workers Builds + Wrangler).
- **API** di mini PC ter-update **otomatis** tiap 5 menit kalau ada kode baru (cron).
- Login Google, cookie, dan keamanan tetap satu domain: `umove.rafiarsya.com`.

Kerjakan urut. Kalau ada error, berhenti dan kirim pesan error-nya.

---

## 1. Kode di GitHub

Repo: `github.com/rafiarsya07/umove` (disarankan **Private**: Settings → Change visibility).

Di laptop (`E:\UMOVE`):

```bash
git add .
git commit -m "UMOVE"
git push
```

(Kalau belum pernah push, lihat perintah `git init … git push -u origin main` di README.)

## 2. Login Google (OAuth)

1. **console.cloud.google.com** → project baru `UMOVE`
2. **Google Auth Platform → Branding**: nama `UMOVE`, support email, authorized domain `rafiarsya.com`
3. **Audience**: External → **Publish app**
4. **Clients → Create client → Web application**
   - Authorized JavaScript origins: `https://umove.rafiarsya.com`
   - Authorized redirect URIs: `https://umove.rafiarsya.com/api/auth/google/callback`
5. Simpan **Client ID** dan **Client secret**.

## 3. Cloudflare Tunnel (untuk API)

1. dash.cloudflare.com → **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**, nama `umove`
2. Pilih **Docker**, salin **token**-nya saja
3. **Public hostname**: subdomain **`umove-api`**, domain `rafiarsya.com`, service **HTTP**, URL **`app:3000`** → Save

> Jangan buat record DNS untuk `umove` sendiri: itu dibuat otomatis oleh Worker di langkah 5.
> Kalau sudah ada record `umove` lama (Pages/Vercel/tunnel), hapus dulu.

## 4. Mini PC

Sekali saja:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/16 to any port 22 proto tcp && sudo ufw enable
```

Install UMOVE:

```bash
git clone https://github.com/rafiarsya07/umove.git
cd umove
bash scripts/install.sh
```

Script menanyakan token Tunnel, Google Client ID & secret, email admin, dan token bot (opsional),
lalu menyalakan semuanya. Email admin default: `rafiarsya.work@gmail.com` (tekan Enter). Di akhir dia menampilkan **PROXY_SECRET**. Salin, dipakai di langkah 5.

Login pakai email admin → langsung masuk **panel admin** (`/admin`): ringkasan, persetujuan Runner & Driver, pengguna (suspend/pulihkan), semua permintaan (batalkan yang melanggar), dan audit log. Akun lain masuk ke dashboard pengguna biasa.

Update otomatis (API ikut update setiap kali kamu push):

```bash
crontab -e
```

Tambahkan (ganti `USER`):

```
*/5 * * * * cd /home/USER/umove && bash scripts/auto-update.sh >> backups/auto-update.log 2>&1
0 4 * * * cd /home/USER/umove && bash scripts/backup.sh >> backups/backup.log 2>&1
```

### Pendaftaran Runner & Driver

- **Runner**: isi nama sesuai kartu matrik, nomor matrik, fakultas/kolej + foto kartu matrik.
- **Driver** (lebih ketat): data di atas + SIM (kelas cocok dengan kendaraan, masih berlaku ≥ 30 hari),
  kendaraan (model, warna, plat, kursi), road tax masih berlaku, asuransi, dan 4 foto:
  kartu matrik, SIM, kendaraan (plat terlihat), selfie memegang kartu matrik.
- Admin meninjau di **/admin/applications** (target 24 jam; lewat 24 jam ditandai merah "Over 24h").
  Tolak wajib dengan alasan → pendaftar melihat alasannya dan baru bisa daftar lagi setelah 24 jam
  (maks. 5 kali per 30 hari).
- Foto dokumen hanya bisa dibuka admin dan **otomatis dihapus 30 hari** setelah diputuskan.
- Perubahan database dijalankan otomatis oleh `scripts/update.sh` (via `scripts/migrate.sh`).

Email notifikasi (opsional, disarankan): admin dapat email tiap ada pendaftar baru, pendaftar dapat
email hasilnya. Pakai Gmail:

1. myaccount.google.com → Security → aktifkan **2-Step Verification**
2. myaccount.google.com/apppasswords → buat App Password (16 huruf)
3. Di mini PC, tambahkan ke `.env` (tanda `@` ditulis `%40`, spasi App Password dihapus):

```
SMTP_URL=smtps://emailkamu%40gmail.com:abcdabcdabcdabcd@smtp.gmail.com:465
```

lalu `docker compose up -d app`.

## 5. Web di Cloudflare (Wrangler, auto deploy)

1. dash.cloudflare.com → **Workers & Pages → Create → Import a repository**
2. Hubungkan GitHub, pilih **rafiarsya07/umove**
3. Pengaturan build:
   - Project name: **`umove`** (harus sama dengan `name` di `web/wrangler.jsonc`)
   - Root directory: **`web`**
   - Build command: **`npm run build`**
   - Deploy command: **`npx wrangler deploy`**
4. **Save and Deploy**. Domain `umove.rafiarsya.com` dipasang otomatis (sudah diatur di `web/wrangler.jsonc`).
5. Setelah deploy pertama: Worker **umove → Settings → Variables and Secrets → Add**
   - Type **Secret**, name **`PROXY_SECRET`**, value = yang ditampilkan `install.sh`
6. Buka **https://umove.rafiarsya.com**, lalu coba login.

Mulai sekarang: **`git push` = web otomatis ter-deploy dalam ±1 menit**, dan API di mini PC ikut update dalam ≤5 menit.

## 6. Keamanan Cloudflare (sekali saja)

| Menu | Pengaturan |
|---|---|
| SSL/TLS → Overview | **Full (strict)** |
| SSL/TLS → Edge Certificates | Always Use HTTPS **on**, Minimum TLS **1.2** |
| Security → WAF → Rate limiting rules | `/api/*`: 100 request / 10 detik per IP → Block 1 menit |
| Security → Bots | Bot Fight Mode **on** |

---

## Notifikasi admin lewat Telegram

1. Di Telegram, chat **@BotFather** → `/newbot` → nama `UMOVE` → username misalnya `umove_um_bot`. Salin **token**-nya.
2. Di mini PC: `nano ~/umove/.env`, tambahkan (atau isi) baris `TELEGRAM_BOT_TOKEN=token-tadi`, simpan (Ctrl+O, Enter, Ctrl+X).
3. `cd ~/umove && bash scripts/update.sh`
4. Buka UMOVE → Admin → Overview → **Connect Telegram** → **Open Telegram and tap Start**.

Yang dikirim: permintaan baru, help chat baru (pesan chat maksimal 1 notifikasi per member per 10 menit), pendaftar runner, foto runner baru, permintaan yang 15 menit belum diambil, dan saat maintenance dibuka otomatis.

## Maintenance terjadwal

Admin → Maintenance → isi **Open again automatically at** → UMOVE dibuka sendiri pada jam itu (maksimal ±30 detik). Opsional isi **Message when it opens again**: tampil sebagai broadcast selama 24 jam.

## Rilis perubahan (satu perintah)

Setelah commit di `E:\UMOVE` (branch `main`), jalankan di Git Bash:

```
bash scripts/release.sh
```

Script menampilkan daftar perubahan, minta konfirmasi `yes`, lalu push (web ter-deploy otomatis), backup database di mini PC, dan update API termasuk migrasi baru.

## Tempat pickup (Places)

Admin → Places: daftar kantin/toko/tempat print di dalam UM. Saat membuat permintaan, member mencari dan memilih dari daftar ini (dikelompokkan per area, misalnya KK12). Kalau tempatnya belum ada, member tetap bisa mengetik sendiri; permintaan dari daftar diberi tanda centang supaya runner tahu itu tempat resmi. Isi awal: "Kafeteria" di KK1–KK13, silakan ganti/tambah sesuai nama asli. Jangan hapus, cukup "Hide". Tabelnya dibuat oleh `db/migrations/007-places.sql` lewat `scripts/update.sh`.

## Maintenance & Broadcast

**Broadcast** (Admin → Broadcasts): pengumuman di bawah header. Pilih gaya (info/peringatan/sukses), siapa yang lihat (semua / member login / runner), link opsional (path di UMOVE, misalnya `/runner`), dan jadwal mulai–selesai. "End now" menghentikan langsung. Maksimal 3 tampil sekaligus; user bisa menutupnya.

**Maintenance** (Admin → Maintenance): nyalakan, isi pesan dan perkiraan selesai. Semua orang selain admin melihat layar maintenance (update realtime), admin tetap bisa pakai semuanya. Matikan dengan "Turn off, go live".

Kalau mini PC-nya sendiri mau dimatikan / dibongkar, saklar di atas ikut mati. Pakai saklar di Cloudflare: Workers & Pages → umove → Settings → Variables and Secrets → tambah `MAINTENANCE` = `on` (opsional `MAINTENANCE_MESSAGE`) → Deploy. Hapus lagi untuk live. Kalau mini PC mati tiba-tiba, web otomatis menampilkan layar "kami segera kembali".

Tabel untuk fitur ini ada di `db/migrations/006-broadcasts-maintenance.sql`, dijalankan otomatis oleh `scripts/update.sh`.

## Soal batas request

- Tampilan web (HTML, JS, CSS, font) dilayani Cloudflare sebagai file statis: **gratis dan tanpa batas**.
- Hanya panggilan `/api/*` yang lewat Worker. Paket gratis Workers memberi 100.000 panggilan per hari,
  jauh di atas kebutuhan kampus. Kalau suatu saat terlewati, paket Workers Paid ($5/bulan) memberi 10 juta.
- Database dan semua data tetap di mini PC kamu.

## Masalah yang sering muncul

| Masalah | Solusi |
|---|---|
| Build Cloudflare "sukses" tapi web kosong/aneh | Worker → **Settings → Build**: Root directory harus `web`, Build command `npm run build`, Deploy command `npx wrangler deploy`. Lalu **Retry build** |
| Web menampilkan `api_not_configured` | `PROXY_SECRET` belum diisi di Worker (langkah 5.5) |
| Semua `/api` jawab `forbidden` | `PROXY_SECRET` di Worker berbeda dengan yang di `.env` mini PC |
| `api_unreachable` / error 1033 | Tunnel mati: `docker compose logs tunnel` di mini PC |
| Deploy Worker gagal "domain already has a record" | Hapus record DNS `umove` lama di Cloudflare, lalu deploy ulang |
| Login: `redirect_uri_mismatch` | Redirect URI Google harus persis `https://umove.rafiarsya.com/api/auth/google/callback` |
| `app` unhealthy | `docker compose logs app` |
| `db` tidak mau start | Hapus baris `read_only`, `tmpfs`, `cap_add` di bagian `db` pada `docker-compose.yml` |
