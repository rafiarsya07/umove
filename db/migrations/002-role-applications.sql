-- Role applications: a Runner or Driver fills in a form and uploads photos
-- of their documents; an admin reviews it (target: within 24 hours).
--
-- user_roles keeps the CURRENT state of each role (pending/active/rejected);
-- role_applications keeps every submission with its details and decision.
-- Document photos are private (admin only) and are deleted 30 days after
-- the decision (files_purged_at), so UMOVE never hoards ID documents.

CREATE TABLE role_applications (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('runner', 'driver')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  details         JSONB NOT NULL CHECK (jsonb_typeof(details) = 'object' AND length(details::text) <= 4000),
  reason          TEXT CHECK (length(reason) <= 300),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at      TIMESTAMPTZ,
  decided_by      UUID REFERENCES users(id),
  files_purged_at TIMESTAMPTZ,
  CHECK ((status = 'pending') = (decided_at IS NULL))
);
-- One open application per person per role.
CREATE UNIQUE INDEX role_applications_one_pending ON role_applications (user_id, role) WHERE status = 'pending';
CREATE INDEX role_applications_queue ON role_applications (status, created_at);
CREATE INDEX role_applications_user ON role_applications (user_id, created_at DESC);

CREATE TABLE application_files (
  application_id BIGINT NOT NULL REFERENCES role_applications(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('matric_card', 'license', 'vehicle', 'selfie')),
  mime           TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data           BYTEA NOT NULL CHECK (length(data) BETWEEN 100 AND 3000000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, kind)
);

-- The reason shown to the applicant when a role is rejected.
ALTER TABLE user_roles ADD COLUMN reason TEXT CHECK (length(reason) <= 300);
