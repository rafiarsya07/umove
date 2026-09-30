import { sql } from "../db.js";
import { log } from "../log.js";
import type { ApplyRole, FileKind } from "../validation.js";

/**
 * Role applications (Runner, Driver). See db/migrations/002-role-applications.sql.
 *
 * Rules enforced here:
 *   - one open application per role; an active role cannot apply again;
 *   - a WhatsApp number is required (the admin may call to verify);
 *   - after a rejection, wait 24 hours before applying again;
 *   - at most 5 submissions per role per 30 days.
 */
export const REAPPLY_HOURS = 24;
const MAX_PER_30_DAYS = 5;
export const PURGE_DAYS = 30;

export type Upload = { kind: FileKind; mime: string; data: Uint8Array };

export type SubmitResult =
  | { ok: true; id: number; name: string; username: string }
  | { ok: false; error: "need_whatsapp" | "already_applied" | "cooldown" | "too_many" | "suspended"; until?: Date };

export async function submitApplication(
  userId: string,
  role: ApplyRole,
  details: Record<string, unknown>,
  files: Upload[],
): Promise<SubmitResult> {
  return sql.begin(async (tx) => {
    // Lock the user row so two submissions cannot race past the checks.
    const [u] = await tx<{ name: string; username: string; phone: string | null; status: string }[]>`
      select name, username::text as username, phone_wa as phone, status from users where id = ${userId} for update
    `;
    if (!u || u.status !== "active") return { ok: false, error: "suspended" } as const;
    if (!u.phone) return { ok: false, error: "need_whatsapp" } as const;

    const [current] = await tx<{ status: string }[]>`
      select status from user_roles where user_id = ${userId} and role = ${role}
    `;
    if (current && (current.status === "pending" || current.status === "active")) {
      return { ok: false, error: "already_applied" } as const;
    }

    const [last] = await tx<{ status: string; decidedAt: Date | null }[]>`
      select status, decided_at as "decidedAt" from role_applications
      where user_id = ${userId} and role = ${role}
      order by created_at desc limit 1
    `;
    if (last?.status === "rejected" && last.decidedAt) {
      const until = new Date(last.decidedAt.getTime() + REAPPLY_HOURS * 3_600_000);
      if (until > new Date()) return { ok: false, error: "cooldown", until } as const;
    }

    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from role_applications
      where user_id = ${userId} and role = ${role} and created_at > now() - interval '30 days'
    `;
    if (n >= MAX_PER_30_DAYS) return { ok: false, error: "too_many" } as const;

    const [app] = await tx<{ id: string }[]>`
      insert into role_applications (user_id, role, details)
      values (${userId}, ${role}, ${tx.json(details as never)})
      returning id
    `;
    for (const f of files) {
      await tx`
        insert into application_files (application_id, kind, mime, data)
        values (${app.id}, ${f.kind}, ${f.mime}, ${Buffer.from(f.data)})
      `;
    }
    await tx`
      insert into user_roles (user_id, role, status)
      values (${userId}, ${role}, 'pending')
      on conflict (user_id, role) do update
        set status = 'pending', reason = null, reviewed_by = null, reviewed_at = null, created_at = now()
    `;
    return { ok: true, id: Number(app.id), name: u.name, username: u.username } as const;
  });
}

/** Withdraw my open application for a role. */
export async function withdrawApplication(userId: string, role: ApplyRole): Promise<boolean> {
  return sql.begin(async (tx) => {
    const rows = await tx`
      delete from user_roles where user_id = ${userId} and role = ${role} and status = 'pending'
    `;
    if (rows.count !== 1) return false;
    await tx`
      update role_applications set status = 'withdrawn', decided_at = now()
      where user_id = ${userId} and role = ${role} and status = 'pending'
    `;
    return true;
  });
}

/** My latest application per role: what Settings shows (status, reason, when I may reapply). */
export async function myApplications(userId: string) {
  const rows = await sql<
    { role: ApplyRole; status: string; reason: string | null; createdAt: Date; decidedAt: Date | null }[]
  >`
    select distinct on (role) role, status, reason, created_at as "createdAt", decided_at as "decidedAt"
    from role_applications where user_id = ${userId}
    order by role, created_at desc
  `;
  return rows.map((r) => ({
    ...r,
    reapplyAt:
      r.status === "rejected" && r.decidedAt ? new Date(r.decidedAt.getTime() + REAPPLY_HOURS * 3_600_000) : null,
  }));
}

/** Admin: applications by status, oldest first for the queue, newest first otherwise. */
export async function listApplications(status: "pending" | "approved" | "rejected") {
  const rows = await sql<
    {
      id: string;
      role: ApplyRole;
      status: string;
      details: Record<string, unknown>;
      reason: string | null;
      createdAt: Date;
      decidedAt: Date | null;
      filesPurged: boolean;
      files: string[] | null;
      userId: string;
      name: string;
      username: string;
      email: string;
      whatsapp: string | null;
      college: string;
      joined: Date;
      decidedBy: string | null;
    }[]
  >`
    select a.id, a.role, a.status, a.details, a.reason, a.created_at as "createdAt", a.decided_at as "decidedAt",
           a.files_purged_at is not null as "filesPurged",
           (select array_agg(f.kind order by f.kind) from application_files f where f.application_id = a.id) as files,
           u.id as "userId", u.name, u.username::text as username, u.email::text as email,
           u.phone_wa as whatsapp, u.college, u.created_at as joined,
           d.username::text as "decidedBy"
    from role_applications a
    join users u on u.id = a.user_id
    left join users d on d.id = a.decided_by
    where a.status = ${status}
    order by ${status === "pending" ? sql`a.created_at asc` : sql`a.decided_at desc`}
    limit 200
  `;
  return rows.map((r) => ({ ...r, id: Number(r.id), files: r.files ?? [] }));
}

export async function pendingCount(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from role_applications where status = 'pending'`;
  return n;
}

/** Admin: one document photo. */
export async function applicationFile(id: number, kind: FileKind) {
  const [f] = await sql<{ mime: string; data: Buffer }[]>`
    select mime, data from application_files where application_id = ${id} and kind = ${kind}
  `;
  return f ?? null;
}

export type DecideResult = { ok: true; role: ApplyRole; email: string; name: string } | { ok: false };

/** Admin: approve or reject an open application; updates the role and the audit log together. */
export async function decideApplication(
  adminId: string,
  id: number,
  decision: "approve" | "reject",
  reason: string | null,
): Promise<DecideResult> {
  return sql.begin(async (tx) => {
    const [a] = await tx<{ userId: string; role: ApplyRole; email: string; name: string }[]>`
      update role_applications a
      set status = ${decision === "approve" ? "approved" : "rejected"}, decided_at = now(),
          decided_by = ${adminId}, reason = ${reason}
      from users u
      where a.id = ${id} and a.status = 'pending' and u.id = a.user_id
      returning a.user_id as "userId", a.role, u.email::text as email, u.name
    `;
    if (!a) return { ok: false } as const;
    await tx`
      update user_roles
      set status = ${decision === "approve" ? "active" : "rejected"}, reason = ${reason},
          reviewed_by = ${adminId}, reviewed_at = now()
      where user_id = ${a.userId} and role = ${a.role}
    `;
    // A runner's face photo becomes the face requesters see (see repo/photos.ts).
    // Drivers' selfies show their matric card, so they are never copied.
    if (decision === "approve" && a.role === "runner") {
      await tx`
        insert into profile_photos (user_id, mime, data, approved_at)
        select ${a.userId}, f.mime, f.data, now() from application_files f
        where f.application_id = ${id} and f.kind = 'selfie'
        on conflict (user_id) do update
          set mime = excluded.mime, data = excluded.data, approved_at = now(), reason = null, updated_at = now()
      `;
    }
    await tx`
      insert into audit_log (actor_id, action, target)
      values (${adminId}, ${`role.${a.role}.${decision}`}, ${a.userId})
    `;
    return { ok: true, role: a.role, email: a.email, name: a.name } as const;
  });
}

/** Delete document photos 30 days after a decision. */
export async function purgeOldFiles(): Promise<number> {
  return sql.begin(async (tx) => {
    const done = await tx<{ id: string }[]>`
      update role_applications set files_purged_at = now()
      where status <> 'pending' and files_purged_at is null
        and decided_at < now() - make_interval(days => ${PURGE_DAYS})
      returning id
    `;
    if (done.length === 0) return 0;
    await tx`delete from application_files where application_id in ${sql(done.map((d) => d.id))}`;
    return done.length;
  });
}

export function startFilePurge() {
  const run = () =>
    purgeOldFiles()
      .then((n) => n > 0 && log.info("purged application photos", { applications: n }))
      .catch((err: unknown) => log.warn("photo purge failed", { err }));
  void run();
  setInterval(run, 60 * 60 * 1000).unref();
}
