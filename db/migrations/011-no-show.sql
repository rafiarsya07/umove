-- No-shows: a runner bought or went out for a request, and the requester
-- never turned up or wouldn't pay. The runner reports it from the request;
-- the order is cancelled and counted against the requester.
--
-- Reports from two different runners stop the requester from posting until
-- an admin looks at it. One runner alone can never block someone, so a
-- single unfair report does no lasting harm. Unblocking clears the count.

ALTER TABLE orders ADD COLUMN no_show_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN post_blocked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN strikes_cleared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS orders_no_show_idx ON orders (customer_id) WHERE no_show_at IS NOT NULL;
