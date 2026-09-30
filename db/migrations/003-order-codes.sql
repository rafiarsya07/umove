-- Public order codes like UM-7K3F9Q instead of #4.
-- Random (from gen_random_uuid, which is cryptographically random), so a code
-- reveals nothing about how many orders exist and cannot be guessed by
-- counting. Letters that look alike (0/O, 1/I) are left out.

CREATE FUNCTION gen_order_code() RETURNS TEXT
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes BYTEA;
  candidate TEXT;
BEGIN
  LOOP
    bytes := uuid_send(gen_random_uuid());
    candidate := 'UM-';
    FOR i IN 0..5 LOOP
      candidate := candidate || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.code = candidate);
  END LOOP;
  RETURN candidate;
END $$;

ALTER TABLE orders ADD COLUMN code TEXT;
UPDATE orders SET code = gen_order_code() WHERE code IS NULL;
ALTER TABLE orders
  ALTER COLUMN code SET DEFAULT gen_order_code(),
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT orders_code_format CHECK (code ~ '^UM-[2-9A-HJ-NP-Z]{6}$');
CREATE UNIQUE INDEX orders_code_key ON orders (code);

-- The delivery fee (upah antar) is at least RM1 from now on; old rows keep their value.
ALTER TABLE orders ADD CONSTRAINT orders_fee_min CHECK (tip_sen >= 100) NOT VALID;
