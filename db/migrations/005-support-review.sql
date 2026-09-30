-- Help chat now starts as a request that an admin reviews first.
-- A member sends a topic and a first message; the thread is "pending" (under
-- review) until an admin opens it ("open") or declines it with a reason.
-- An admin closes an open thread when it's resolved. One pending or open
-- thread per member at a time.

CREATE TABLE support_threads (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL CHECK (topic IN ('order', 'account', 'application', 'report', 'other')),
  order_code  TEXT CHECK (order_code ~ '^UM-[2-9A-HJ-NP-Z]{6}$'),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'declined', 'closed')),
  reason      TEXT CHECK (length(reason) <= 300),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at  TIMESTAMPTZ,
  decided_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX support_threads_one_active ON support_threads (user_id) WHERE status IN ('pending', 'open');
CREATE INDEX support_threads_queue ON support_threads (status, created_at);

ALTER TABLE support_messages ADD COLUMN thread_id BIGINT REFERENCES support_threads(id) ON DELETE CASCADE;

-- Conversations from before this change become open threads.
INSERT INTO support_threads (user_id, topic, status, created_at, decided_at)
SELECT user_id, 'other', 'open', min(created_at), min(created_at) FROM support_messages GROUP BY user_id;
UPDATE support_messages m SET thread_id = t.id FROM support_threads t WHERE t.user_id = m.user_id AND m.thread_id IS NULL;

ALTER TABLE support_messages ALTER COLUMN thread_id SET NOT NULL;
CREATE INDEX support_messages_by_thread ON support_messages (thread_id, created_at);
