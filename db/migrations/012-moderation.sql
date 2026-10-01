-- Keeping the board clean and fair, both ways.
--
-- 1. Held requests: text that looks like bad words, banned items, links or
--    phone numbers waits for an admin before it appears on the public board.
-- 2. Expired requests: nobody took it in 3 hours, so it closes by itself and
--    the board never fills with stale posts.
-- 3. Runner flags: a requester had to swap a runner who didn't start (10+
--    minutes after taking it), or the runner never arrived. Flags from three
--    different requesters pause the runner until an admin checks.

ALTER TABLE orders ADD COLUMN held_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN hold_reason TEXT CHECK (length(hold_reason) <= 120);
ALTER TABLE orders ADD COLUMN expired_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_held_idx ON orders (created_at) WHERE held_at IS NOT NULL;

ALTER TABLE users ADD COLUMN runner_paused_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN runner_flags_cleared_at TIMESTAMPTZ;

CREATE TABLE runner_flags (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  runner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('dropped', 'no_show')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, runner_id)
);
CREATE INDEX IF NOT EXISTS runner_flags_runner_idx ON runner_flags (runner_id, created_at);
