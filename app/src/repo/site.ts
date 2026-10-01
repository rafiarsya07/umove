import { sql } from "../db.js";
import { announceSite } from "../live.js";
import { log } from "../log.js";
import { notifyAdmins } from "../notify.js";

/**
 * Broadcasts (site-wide announcements) and maintenance mode.
 *
 * Maintenance is read on every API call, so it is cached in memory. There is
 * one API process, so the cache is simply replaced when an admin changes it,
 * and re-read every 15 seconds as a safety net.
 */

/**
 * `until`: when UMOVE opens again by itself. `reopenMessage`: posted as a
 * broadcast at that moment (e.g. "We're back, with photo check for runners").
 */
export type Maintenance = { on: boolean; message: string | null; until: string | null; reopenMessage?: string | null };
const OFF: Maintenance = { on: false, message: null, until: null, reopenMessage: null };
const isOver = (m: Maintenance) => m.on && m.until !== null && Date.parse(m.until) <= Date.now();
let cached: { value: Maintenance; at: number } | null = null;

export async function maintenance(): Promise<Maintenance> {
  if (cached && Date.now() - cached.at < 15_000) return isOver(cached.value) ? OFF : cached.value;
  try {
    const [row] = await sql<
      { value: Partial<Maintenance> }[]
    >`select value from site_settings where key = 'maintenance'`;
    const v = row?.value ?? {};
    const value: Maintenance = {
      on: v.on === true,
      message: v.message ?? null,
      until: v.until ?? null,
      reopenMessage: v.reopenMessage ?? null,
    };
    // Past the reopening time: open now; the watch below records it within seconds.
    cached = { value: isOver(value) ? OFF : value, at: Date.now() };
  } catch {
    // Table missing (migration not run yet) or DB hiccup: never block the site because of it.
    cached = { value: cached?.value ?? OFF, at: Date.now() };
  }
  return cached.value;
}

export async function setMaintenance(adminId: string, m: Maintenance): Promise<Maintenance> {
  await sql.begin(async (tx) => {
    await tx`
      insert into site_settings (key, value, updated_by, updated_at)
      values ('maintenance', ${tx.json(m as never)}, ${adminId}, now())
      on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
    `;
    await tx`
      insert into audit_log (actor_id, action, target)
      values (${adminId}, ${m.on ? "maintenance.on" : "maintenance.off"}, ${m.message?.slice(0, 120) ?? null})
    `;
  });
  cached = { value: m, at: Date.now() };
  return m;
}

/**
 * Every 20 seconds: if maintenance has a reopening time that has passed, turn
 * it off, post the reopening broadcast (if any) and tell the admins.
 */
export function startMaintenanceWatch() {
  const run = async () => {
    try {
      const [row] = await sql<
        { value: Partial<Maintenance> }[]
      >`select value from site_settings where key = 'maintenance'`;
      const v = row?.value;
      if (!v?.on || !v.until || Date.parse(v.until) > Date.now()) return;
      const msg = (v.reopenMessage ?? "").trim();
      await sql.begin(async (tx) => {
        const done = await tx`
          update site_settings set value = ${tx.json(OFF as never)}, updated_at = now()
          where key = 'maintenance' and (value->>'on')::boolean
        `;
        if (done.count !== 1) return;
        await tx`insert into audit_log (actor_id, action, target) values (null, 'maintenance.auto_off', null)`;
        if (msg) {
          await tx`
            insert into broadcasts (title, body, tone, audience, starts_at, ends_at)
            values (${msg.slice(0, 80)}, ${msg.length > 80 ? msg : ""}, 'success', 'all', now(), now() + interval '24 hours')
          `;
        }
      });
      cached = { value: OFF, at: Date.now() };
      announceSite();
      notifyAdmins("UMOVE dibuka lagi otomatis (maintenance selesai sesuai jadwal).", "/admin/maintenance");
    } catch (err) {
      log.warn("maintenance watch failed", { err: String(err) });
    }
  };
  setInterval(() => void run(), 20_000).unref();
}

export type Tone = "info" | "warning" | "success";
export type Audience = "all" | "members" | "runners";
export type Broadcast = {
  id: number;
  title: string;
  body: string;
  tone: Tone;
  audience: Audience;
  linkPath: string | null;
  startsAt: Date;
  endsAt: Date | null;
};

const cols = sql`
  b.id::int as id, b.title, b.body, b.tone, b.audience, b.link_path as "linkPath",
  b.starts_at as "startsAt", b.ends_at as "endsAt"
`;

/** Broadcasts live right now that this viewer should see. */
export async function liveBroadcasts(viewer: { id: string } | null): Promise<Broadcast[]> {
  const audiences: Audience[] = ["all"];
  if (viewer) {
    audiences.push("members");
    const [r] = await sql<{ ok: boolean }[]>`
      select exists (select 1 from user_roles where user_id = ${viewer.id} and role = 'runner' and status = 'active') as ok
    `;
    if (r.ok) audiences.push("runners");
  }
  return sql<Broadcast[]>`
    select ${cols} from broadcasts b
    where b.starts_at <= now() and (b.ends_at is null or b.ends_at > now())
      and b.audience in ${sql(audiences)}
    order by b.starts_at desc
    limit 3
  `;
}

/** Admin: everything, newest first, with who posted it and whether it's live. */
export async function allBroadcasts() {
  return sql<(Broadcast & { createdBy: string | null; state: "scheduled" | "live" | "ended" })[]>`
    select ${cols}, u.username::text as "createdBy",
      case when b.starts_at > now() then 'scheduled'
           when b.ends_at is not null and b.ends_at <= now() then 'ended'
           else 'live' end as state
    from broadcasts b left join users u on u.id = b.created_by
    order by b.created_at desc
    limit 100
  `;
}

export async function createBroadcast(
  adminId: string,
  b: {
    title: string;
    body: string;
    tone: Tone;
    audience: Audience;
    linkPath: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
  },
): Promise<number> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: number }[]>`
      insert into broadcasts (title, body, tone, audience, link_path, starts_at, ends_at, created_by)
      values (${b.title}, ${b.body}, ${b.tone}, ${b.audience}, ${b.linkPath},
              ${b.startsAt ?? sql`now()`}, ${b.endsAt}, ${adminId})
      returning id::int as id
    `;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'broadcast.create', ${String(row.id)})`;
    return row.id;
  });
}

/** End a broadcast now (it stays in the history). */
export async function endBroadcast(adminId: string, id: number): Promise<boolean> {
  return sql.begin(async (tx) => {
    const rows = await tx`
      update broadcasts set starts_at = least(starts_at, now() - interval '1 second'), ends_at = now()
      where id = ${id} and (ends_at is null or ends_at > now())
    `;
    if (rows.count !== 1) return false;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'broadcast.end', ${String(id)})`;
    return true;
  });
}
