-- UMove database schema.
-- Runs ONCE, automatically, when the database is first created.
--
-- The database itself enforces the rules the app relies on (formats,
-- lengths, allowed values), so a bug in the app cannot store bad data.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub       TEXT UNIQUE NOT NULL CHECK (length(google_sub) BETWEEN 1 AND 255),
  email            CITEXT UNIQUE NOT NULL CHECK (length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+$'),
  username         CITEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  name             TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  college          TEXT NOT NULL DEFAULT '' CHECK (length(college) <= 40),
  bio              TEXT NOT NULL DEFAULT '' CHECK (length(bio) <= 160),
  -- Private: shown only to a matched counterpart, never on a public page.
  phone_wa         TEXT CHECK (phone_wa ~ '^\+?[0-9]{8,15}$'),
  telegram_chat_id BIGINT UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side sessions. The browser holds a random token in an HttpOnly
-- cookie; only its SHA-256 hash is stored here, so a database leak does
-- not leak usable sessions.
CREATE TABLE sessions (
  token_hash  BYTEA PRIMARY KEY CHECK (length(token_hash) = 32),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expiry_idx ON sessions (expires_at);

-- A user can hold several roles; runner and driver need admin approval.
CREATE TABLE user_roles (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('runner', 'driver', 'seller')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'deliver' CHECK (type IN ('deliver', 'ride')),
  customer_id UUID NOT NULL REFERENCES users(id),
  runner_id   UUID REFERENCES users(id),
  pickup      TEXT NOT NULL CHECK (length(btrim(pickup)) BETWEEN 2 AND 80),
  dropoff     TEXT NOT NULL CHECK (length(btrim(dropoff)) BETWEEN 2 AND 80),
  details     TEXT NOT NULL CHECK (length(btrim(details)) BETWEEN 2 AND 300),
  tip_sen     INT NOT NULL CHECK (tip_sen BETWEEN 0 AND 100000),
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'accepted', 'on_the_way', 'delivered', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at  TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (runner_id IS NULL OR runner_id <> customer_id),
  CHECK ((status = 'open') = (runner_id IS NULL) OR status = 'cancelled')
);
CREATE INDEX orders_open_idx ON orders (status, created_at DESC);
CREATE INDEX orders_customer_idx ON orders (customer_id, created_at DESC);
CREATE INDEX orders_runner_idx ON orders (runner_id, created_at DESC);

CREATE TABLE ratings (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_user  UUID NOT NULL REFERENCES users(id),
  to_user    UUID NOT NULL REFERENCES users(id),
  stars      INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  body       TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, from_user),
  CHECK (from_user <> to_user)
);

CREATE TABLE reports (
  id          BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  order_id    BIGINT REFERENCES orders(id),
  reason      TEXT NOT NULL CHECK (length(btrim(reason)) BETWEEN 5 AND 500),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);

-- Every admin action (approving a runner, suspending a user) is recorded.
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor_id   UUID REFERENCES users(id),
  action     TEXT NOT NULL CHECK (length(action) <= 64),
  target     TEXT CHECK (length(target) <= 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at maintained by the database, not trusted from the app.
CREATE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
