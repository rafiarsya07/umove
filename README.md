# UMove

Titipan kampus, tumpangan, dan pasar mahasiswa untuk mahasiswa Universiti Malaya.
Web dan API di-host sendiri di mini PC, di belakang Cloudflare Tunnel.

**https://umove.rafiarsya.com**

© UMove · Built by **Muhammad Rafi Arsya**

## Struktur folder

```
UMOVE/
├── web/                 React 19 + Vite + Tailwind v4 (the UI, 3 languages)
│   └── src/
│       ├── pages/       Home, Runner, Login, Settings, Dashboard, Profile
│       ├── components/  Header, Footer, BottomNav, icons, UI primitives
│       ├── i18n/        en.ts (schema), id.ts, ms.ts
│       └── lib/         session, formatting, site settings
├── app/                 Node + Hono API, serves the web app too, + Telegram bot
│   └── src/
│       ├── config.ts    validated settings
│       ├── http/        app, security headers, rate limit, static files
│       ├── bot/         Telegram bot (long polling)
│       ├── db.ts        Postgres pool
│       └── log.ts       JSON logs with redaction
├── db/init/             schema + least-privilege app role (run once)
├── scripts/backup.sh    database backup
├── docs/SETUP.md        mini PC setup, step by step
├── docs/SECURITY.md     what protects UMove
├── Dockerfile           builds web + app into one image
└── docker-compose.yml   app, db, tunnel (hardened)
```

## Development di laptop

Tampilan saja (tanpa login):

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Login, profil, dan admin butuh API + database, jadi paling gampang dites langsung
di mini PC (production). Tes otomatisnya ada di `app/test/`.

Dengan API juga (butuh Postgres jalan di laptop):

```bash
cd app
npm install
# bikin app/.env.local berisi DATABASE_URL dan PUBLIC_ORIGIN=http://localhost:5173
npm run dev          # http://localhost:3000, Vite meneruskan /api ke sini
```

## Deploy di mini PC

Ikuti **docs/SETUP.md** (`bash scripts/install.sh`). Setelah itu, update cukup dengan:

```bash
bash scripts/update.sh
```

## Tahapan

- [x] 1. Struktur, UI 3 bahasa, server yang diperkeras, setup mini PC
- [x] 2. Login Google, profil & peran tersimpan di database, halaman admin
- [ ] 3. Permintaan: pasang, terima, lanjut ke WhatsApp, status
- [ ] 4. Notifikasi Telegram untuk runner, persetujuan admin, rating
