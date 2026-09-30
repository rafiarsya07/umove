-- Trust without friction:
--   one WhatsApp number per account, a 30-day wait between username changes,
--   and the requester may send a runner away before they set off.

-- 1. One WhatsApp number per account. If a number is already on several
--    accounts, the oldest account keeps it; the others must add their own.
UPDATE users u SET phone_wa = NULL
WHERE phone_wa IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users o
    WHERE o.phone_wa = u.phone_wa AND (o.created_at, o.id) < (u.created_at, u.id)
  );
CREATE UNIQUE INDEX users_phone_unique ON users (phone_wa) WHERE phone_wa IS NOT NULL;

-- 2. When the username last changed (null = never, so the first change is free).
ALTER TABLE users ADD COLUMN username_changed_at TIMESTAMPTZ;

-- 3. Runners the requester sent away from this order; they can't take it again.
ALTER TABLE orders ADD COLUMN skipped_runners UUID[] NOT NULL DEFAULT '{}';
