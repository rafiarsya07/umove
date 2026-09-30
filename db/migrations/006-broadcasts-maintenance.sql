-- Site-wide announcements (broadcasts) and maintenance mode.

CREATE TABLE broadcasts (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 80),
  body        TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 400),
  tone        TEXT NOT NULL DEFAULT 'info' CHECK (tone IN ('info', 'warning', 'success')),
  -- Who sees it: everyone, signed-in members, or approved runners.
  audience    TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'members', 'runners')),
  -- Optional link inside UMOVE only (a path such as /runner), so a broadcast can't send people off-site.
  link_path   TEXT CHECK (link_path ~ '^/(?!/)[A-Za-z0-9/_#?=&.-]{0,99}$'),
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at     TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX broadcasts_live ON broadcasts (starts_at, ends_at);

-- Small key/value store for switches such as maintenance mode.
CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY CHECK (key IN ('maintenance')),
  value      JSONB NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO site_settings (key, value) VALUES ('maintenance', '{"on": false}');
