import { randomInt } from "node:crypto";
import { sql } from "../db.js";
import { USERNAME } from "../validation.js";

/**
 * All SQL about users lives here. Every query is parameterised, and every
 * write that belongs to a user filters by the id from the SESSION, never
 * by an id sent from the browser.
 */

export type RoleStatus = "none" | "pending" | "active" | "rejected";
export type Roles = { runner: RoleStatus; driver: RoleStatus; seller: RoleStatus };

function usernameBase(email: string): string {
  let base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 18);
  if (base.length < 3) base = `user_${base}`.slice(0, 18);
  return base;
}

/** Finds the user for a Google account, creating it on first sign-in. */
export async function upsertGoogleUser(p: { sub: string; email: string; name: string }) {
  const found = await sql<{ id: string; status: string; isNew: boolean }[]>`
    update users set email = ${p.email} where google_sub = ${p.sub}
    returning id, status, false as "isNew"
  `;
  if (found[0]) return found[0];

  const name = (p.name.trim() || p.email.split("@")[0]).slice(0, 40);
  const base = usernameBase(p.email);
  for (let attempt = 0; attempt < 8; attempt++) {
    const username = attempt === 0 ? base : `${base.slice(0, 18)}_${randomInt(1000, 9999)}`;
    if (!USERNAME.test(username)) continue;
    const rows = await sql<{ id: string; status: string; isNew: boolean }[]>`
      insert into users (google_sub, email, username, name)
      values (${p.sub}, ${p.email}, ${username}, ${name})
      on conflict do nothing
      returning id, status, true as "isNew"
    `;
    if (rows[0]) return rows[0];
    // A conflict on google_sub means a parallel sign-in created it: read it back.
    const again = await sql<{ id: string; status: string; isNew: boolean }[]>`
      select id, status, false as "isNew" from users where google_sub = ${p.sub}
    `;
    if (again[0]) return again[0];
  }
  throw new Error("could not allocate a username");
}

async function rolesOf(userId: string): Promise<Roles> {
  const rows = await sql<{ role: keyof Roles; status: RoleStatus }[]>`
    select role, status from user_roles where user_id = ${userId}
  `;
  const roles: Roles = { runner: "none", driver: "none", seller: "none" };
  for (const r of rows) roles[r.role] = r.status;
  return roles;
}

export async function statsOf(userId: string) {
  const [s] = await sql<{ requests: number; runs: number; rating: string | null; ratingCount: number }[]>`
    select
      (select count(*)::int from orders where customer_id = ${userId}) as requests,
      (select count(*)::int from orders where runner_id = ${userId} and status = 'delivered') as runs,
      (select round(avg(stars)::numeric, 1)::text from ratings where to_user = ${userId}) as rating,
      (select count(*)::int from ratings where to_user = ${userId}) as "ratingCount"
  `;
  return { requests: s.requests, runs: s.runs, rating: s.rating ? Number(s.rating) : null, ratingCount: s.ratingCount };
}

/** The signed-in user's own view, including private fields. */
export async function getMe(userId: string) {
  const [u] = await sql<
    {
      name: string;
      username: string;
      email: string;
      college: string;
      bio: string;
      whatsapp: string | null;
      joined: Date;
    }[]
  >`
    select name, username::text as username, email::text as email, college, bio,
           phone_wa as whatsapp, created_at as joined
    from users where id = ${userId}
  `;
  if (!u) return null;
  return { ...u, roles: await rolesOf(userId), stats: await statsOf(userId) };
}

export type ProfileUpdate = { name: string; username: string; whatsapp: string | null; college: string; bio: string };

/** Returns "taken" when the username belongs to someone else. */
export async function updateProfile(userId: string, p: ProfileUpdate): Promise<"ok" | "taken"> {
  try {
    const rows = await sql`
      update users
      set name = ${p.name}, username = ${p.username}, phone_wa = ${p.whatsapp},
          college = ${p.college}, bio = ${p.bio}
      where id = ${userId}
    `;
    if (rows.count !== 1) throw new Error("profile update matched no row");
    return "ok";
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return "taken";
    throw err;
  }
}

/** Anyone's public profile. Never includes email or WhatsApp. */
export async function publicProfile(username: string) {
  const [u] = await sql<{ id: string; name: string; username: string; college: string; bio: string; joined: Date }[]>`
    select id, name, username::text as username, college, bio, created_at as joined
    from users where username = ${username} and status = 'active'
  `;
  if (!u) return null;
  const roles = await rolesOf(u.id);
  const reviews = await sql<{ id: number; by: string; stars: number; body: string; when: Date }[]>`
    select r.id, f.username::text as by, r.stars, r.body, r.created_at as when
    from ratings r join users f on f.id = r.from_user
    where r.to_user = ${u.id}
    order by r.created_at desc
    limit 20
  `;
  const [way] = await sql<{ vehicle: string | null }[]>`
    select details->>'vehicle' as vehicle from role_applications
    where user_id = ${u.id} and role = 'runner' and status = 'approved'
    order by decided_at desc limit 1
  `;
  const { id: _id, ...pub } = u;
  return {
    ...pub,
    verifiedRunner: roles.runner === "active",
    verifiedDriver: roles.driver === "active",
    runnerVehicle: roles.runner === "active" ? (way?.vehicle ?? null) : null,
    stats: await statsOf(u.id),
    reviews,
  };
}
