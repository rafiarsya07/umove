import { sql } from "../db.js";

/**
 * Pickup places inside UM, kept by admins. Members pick one when posting a
 * request (or type their own when it isn't listed). Hidden places stay in the
 * table so old requests keep their link.
 */
export type PlaceKind = "food" | "shop" | "print" | "other";
export type Place = { id: number; name: string; area: string; kind: PlaceKind };
export type AdminPlace = Place & { active: boolean; uses: number };

const MAX_PLACES = 300;
let cache: { at: number; rows: Place[] } | null = null;
/** Natural order, so KK2 comes before KK10. */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const byAreaName = (a: Place, b: Place) => collator.compare(a.area, b.area) || collator.compare(a.name, b.name);

/** Active places for the request form, grouped client-side by area. Cached 60s. */
export async function activePlaces(): Promise<Place[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const rows = await sql<Place[]>`
    select id, name, area, kind from places where active
  `;
  rows.sort(byAreaName);
  cache = { at: Date.now(), rows: [...rows] };
  return rows;
}

/** One active place, read fresh (used when a request is posted). */
export async function activePlace(id: number): Promise<Place | null> {
  const [p] = await sql<Place[]>`select id, name, area, kind from places where id = ${id} and active`;
  return p ?? null;
}

/** Text stored on a request for a listed place, e.g. "Kafeteria, KK12". */
export const placeLabel = (p: Pick<Place, "name" | "area">) => `${p.name}, ${p.area}`;

export async function allPlaces(): Promise<AdminPlace[]> {
  const rows = await sql<AdminPlace[]>`
    select p.id, p.name, p.area, p.kind, p.active,
           (select count(*)::int from orders o where o.place_id = p.id) as uses
    from places p
  `;
  return [...rows].sort((a, b) => Number(b.active) - Number(a.active) || byAreaName(a, b));
}

export type SaveResult = { ok: true; id: number } | { ok: false; error: "duplicate" | "not_found" | "too_many" };

/** Create (no id) or update a place. Names are unique per area, ignoring case. */
export async function savePlace(
  adminId: string,
  p: { id?: number; name: string; area: string; kind: PlaceKind; active: boolean },
): Promise<SaveResult> {
  try {
    const result = await sql.begin(async (tx) => {
      if (p.id === undefined) {
        const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from places`;
        if (n >= MAX_PLACES) return { ok: false, error: "too_many" } as const;
        const [row] = await tx<{ id: number }[]>`
          insert into places (name, area, kind, active) values (${p.name}, ${p.area}, ${p.kind}, ${p.active})
          returning id
        `;
        await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'place.create', ${placeLabel(p)})`;
        return { ok: true, id: row.id } as const;
      }
      const [row] = await tx<{ id: number }[]>`
        update places set name = ${p.name}, area = ${p.area}, kind = ${p.kind}, active = ${p.active}, updated_at = now()
        where id = ${p.id} returning id
      `;
      if (!row) return { ok: false, error: "not_found" } as const;
      await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'place.update', ${placeLabel(p)})`;
      return { ok: true, id: row.id } as const;
    });
    cache = null;
    return result;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { ok: false, error: "duplicate" };
    throw err;
  }
}
