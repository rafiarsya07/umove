-- Places inside UM where runners can pick things up (cafeterias, shops, print
-- corners). Admins keep the list; members pick from it, or type a place when
-- theirs isn't listed yet.

CREATE TABLE places (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 50),
  -- Where on campus, e.g. "KK12", "Faculty of Engineering". Used to group the list.
  area        TEXT NOT NULL CHECK (length(btrim(area)) BETWEEN 2 AND 40),
  kind        TEXT NOT NULL DEFAULT 'food' CHECK (kind IN ('food', 'shop', 'print', 'other')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX places_unique_name ON places (lower(btrim(area)), lower(btrim(name)));

-- A request remembers which listed place it came from (null = typed by the member).
ALTER TABLE orders ADD COLUMN place_id INT REFERENCES places(id) ON DELETE SET NULL;

-- A starting list: the cafeteria at each residential college. Edit in Admin → Places.
INSERT INTO places (name, area, kind)
SELECT 'Kafeteria', 'KK' || n, 'food' FROM generate_series(1, 13) AS n;
