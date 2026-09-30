# Demo dulu, baru production

Setiap perubahan dicoba dulu di **umove-demo.rafiarsya.com** (data dan akun terpisah, ada tulisan DEMO di atas). Kalau sudah oke, satu perintah di terminal memindahkannya ke **umove.rafiarsya.com**.

```
E:\UMOVE (branch demo) ── git push ──▶ umove-demo.rafiarsya.com   (otomatis)
                                         ├─ Worker  umove-demo
                                         └─ mini PC ~/umove-demo  (port 38472, database sendiri)

bash scripts/release.sh ──────────────▶ umove.rafiarsya.com        (hanya lewat perintah ini)
                                         ├─ backup database production
                                         └─ update ~/umove
```

## Pasang sekali

### 1. Branch demo (laptop, `E:\UMOVE`)

```
git checkout -b demo
git push -u origin demo
```

Mulai sekarang kamu selalu bekerja di branch **demo**.

### 2. Tunnel kedua (Cloudflare)

1. Zero Trust → Networks → Tunnels → **Create a tunnel** → Cloudflared, nama `umove-demo`
2. Pilih Docker, salin **token**-nya
3. Public hostname: subdomain **`umove-demo-api`**, domain `rafiarsya.com`, service **HTTP**, URL **`app:3000`** → Save

### 3. Login Google untuk demo

console.cloud.google.com → Clients → client UMOVE yang sudah ada → tambahkan:

- Authorized JavaScript origins: `https://umove-demo.rafiarsya.com`
- Authorized redirect URIs: `https://umove-demo.rafiarsya.com/api/auth/google/callback`

### 4. Salinan demo di mini PC

```
ssh user@100.77.41.4
git clone -b demo https://github.com/rafiarsya07/umove.git ~/umove-demo
cd ~/umove-demo && bash scripts/install.sh
```

Isi token tunnel **umove-demo** (langkah 2), Client ID dan secret Google yang sama. Script otomatis memakai port 38472 dan alamat demo. Catat **PROXY_SECRET** yang ditampilkan di akhir.

Update otomatis tiap 5 menit (`crontab -e`, tambahkan):

```
*/5 * * * * cd /home/user/umove-demo && bash scripts/auto-update.sh >> backups/auto-update.log 2>&1
```

### 5. Worker kedua (Cloudflare)

1. Workers & Pages → Create → **Import a repository** → `rafiarsya07/umove`
2. Project name **`umove-demo`**, production branch **`demo`**
3. Root directory **`web`**, build command **`npm run build`**, deploy command **`npx wrangler deploy --env demo`**
4. Save and Deploy, lalu Worker **umove-demo** → Settings → Variables and Secrets → Secret **`PROXY_SECRET`** = nilai dari langkah 4
5. Buka https://umove-demo.rafiarsya.com dan login

### 6. Production tidak ikut ter-update dari branch demo

Worker **umove** → Settings → Build: production branch tetap **`main`**. Kalau mini PC production memakai cron auto-update, biarkan: dia hanya mengikuti `main`, dan `main` hanya berubah lewat `release.sh`.

## Alur harian

1. Perubahan masuk ke `E:\UMOVE` (branch **demo**) → `git add -A && git commit -m "…" && git push`
2. Tunggu ±5 menit, coba di **umove-demo.rafiarsya.com** (HP dan laptop)
3. Oke? Di laptop (Git Bash, folder repo): **`bash scripts/release.sh`** → ketik `yes`
4. Cek **umove.rafiarsya.com** di jendela incognito

`release.sh` menolak jalan kalau ada perubahan yang belum di-commit, demo belum di-push, atau `main` punya perubahan yang tidak ada di demo. Sebelum update API, database production di-backup dulu.

## Membatalkan rilis (darurat)

1. Admin → Maintenance → nyalakan
2. Web: Cloudflare → Workers → **umove** → Deployments → versi sebelumnya → **Rollback**
3. API: `ssh user@100.77.41.4 "cd ~/umove && git reset --hard HEAD@{1} && docker compose up -d --build"`
4. Kalau data ikut rusak: pulihkan backup yang dibuat `release.sh` (lihat playbook, bagian Server dan data)
5. Matikan Maintenance. Perbaiki di demo, tes, lalu rilis lagi.
