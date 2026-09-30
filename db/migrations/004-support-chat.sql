-- Help chat between a member and the UMOVE admins, inside the web app.
-- One thread per member (user_id). Messages are plain text; nothing here is
-- public, and the member's phone number is never needed.

CREATE TABLE support_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_admin BOOLEAN NOT NULL,
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- When the other side read it.
  read_at    TIMESTAMPTZ
);
CREATE INDEX support_thread ON support_messages (user_id, created_at);
CREATE INDEX support_unread_for_admin ON support_messages (user_id) WHERE NOT from_admin AND read_at IS NULL;
