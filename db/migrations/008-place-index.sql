-- Admin → Places counts requests per place; keep that lookup fast.
CREATE INDEX IF NOT EXISTS orders_place_idx ON orders (place_id) WHERE place_id IS NOT NULL;
