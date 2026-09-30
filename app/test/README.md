# Integration tests (sign-in, profile, roles, admin, CSRF)

Runs the real app against a real Postgres and a fake Google (local keys).

1. Start a Postgres, run `db/init/01-schema.sql` and `db/init/02-app-role.sh` (APP_DB_PASSWORD=pw123).
2. `npm run build`, then in `app/`:

```bash
mkdir -p public && echo '<!doctype html>' > public/index.html
node test/fake-google.mjs &
NODE_ENV=test PORT=3222 PUBLIC_ORIGIN=http://localhost:3222 WEB_DIST=./public \
DATABASE_URL=postgres://umove_app:pw123@localhost:5432/umove \
GOOGLE_CLIENT_ID=test-client.apps.googleusercontent.com GOOGLE_CLIENT_SECRET=test-secret-1234 \
GOOGLE_AUTH_URL=http://localhost:9900/auth GOOGLE_TOKEN_URL=http://localhost:9900/token \
GOOGLE_JWKS_URL=http://localhost:9900/certs GOOGLE_ISSUER=http://localhost:9900 \
ADMIN_EMAILS=rafi.admin@gmail.com RATE_LIMIT_API=1000 node dist/index.js &
node test/auth.test.mjs
```

The Google overrides are ignored when NODE_ENV=production.

For the requests flow, restart the app on a fresh database with `ADMIN_EMAILS=admin@x.com`, then run `node test/requests.test.mjs` (post, race to accept, WhatsApp privacy, status, rating, live stream).
