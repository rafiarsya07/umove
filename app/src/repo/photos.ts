import { sql } from "../db.js";

/**
 * Face photos of runners (see db/migrations/009-profile-photos.sql).
 *
 *   application selfie ── admin approves application ──▶ approved photo
 *   runner sends a new photo ──▶ pending ── admin approves ──▶ replaces approved
 *                                         └─ admin rejects (reason) ──▶ approved stays
 */
export type Photo = { mime: string; data: Buffer };
export type PhotoStatus = {
  approved: boolean;
  approvedAt: Date | null;
  pending: boolean;
  pendingAt: Date | null;
  reason: string | null;
};

const MAX_PENDING_PER_DAY = 5;

/** My photo status, for Settings. */
export async function myPhotoStatus(userId: string): Promise<PhotoStatus> {
  const [p] = await sql<PhotoStatus[]>`
    select data is not null as approved, approved_at as "approvedAt",
           pending_data is not null as pending, pending_at as "pendingAt", reason
    from profile_photos where user_id = ${userId}
  `;
  return p ?? { approved: false, approvedAt: null, pending: false, pendingAt: null, reason: null };
}

export async function hasApprovedPhoto(userId: string): Promise<boolean> {
  const [p] = await sql<{ ok: boolean }[]>`
    select exists (select 1 from profile_photos where user_id = ${userId} and data is not null) as ok
  `;
  return p.ok;
}

/** The owner's own photo (the pending one when asked, else the approved one). */
export async function ownPhoto(userId: string, which: "approved" | "pending"): Promise<Photo | null> {
  const [p] =
    which === "pending"
      ? await sql<Photo[]>`select pending_mime as mime, pending_data as data from profile_photos
                           where user_id = ${userId} and pending_data is not null`
      : await sql<Photo[]>`select mime, data from profile_photos where user_id = ${userId} and data is not null`;
  return p ?? null;
}

/**
 * The runner's approved photo for the requester of an order the runner has
 * taken (accepted, on the way or delivered). Anyone else gets nothing.
 */
export async function runnerPhotoForCustomer(code: string, viewerId: string): Promise<Photo | null> {
  const [p] = await sql<Photo[]>`
    select ph.mime, ph.data
    from orders o join profile_photos ph on ph.user_id = o.runner_id
    where o.code = ${code} and o.customer_id = ${viewerId}
      and o.status in ('accepted', 'on_the_way', 'delivered') and ph.data is not null
  `;
  return p ?? null;
}

export type SubmitPhotoResult = { ok: true } | { ok: false; error: "not_runner" | "too_many" };

/** A runner (or driver) sends a new photo; it waits for review. */
export async function submitPhoto(userId: string, mime: string, data: Uint8Array): Promise<SubmitPhotoResult> {
  return sql.begin(async (tx) => {
    const [r] = await tx<{ ok: boolean }[]>`
      select exists (select 1 from user_roles where user_id = ${userId} and role in ('runner', 'driver')
                     and status = 'active') as ok
    `;
    if (!r.ok) return { ok: false, error: "not_runner" } as const;
    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from audit_log
      where actor_id = ${userId} and action = 'photo.submit' and created_at > now() - interval '1 day'
    `;
    if (n >= MAX_PENDING_PER_DAY) return { ok: false, error: "too_many" } as const;
    await tx`
      insert into profile_photos (user_id, pending_mime, pending_data, pending_at, reason)
      values (${userId}, ${mime}, ${Buffer.from(data)}, now(), null)
      on conflict (user_id) do update
        set pending_mime = excluded.pending_mime, pending_data = excluded.pending_data,
            pending_at = now(), reason = null, updated_at = now()
    `;
    await tx`insert into audit_log (actor_id, action, target) values (${userId}, 'photo.submit', ${userId})`;
    return { ok: true } as const;
  });
}

/* ---- Admin ---------------------------------------------------------------- */

export async function pendingPhotos() {
  return sql<
    { userId: string; name: string; username: string; email: string; pendingAt: Date; hasApproved: boolean }[]
  >`
    select u.id as "userId", u.name, u.username::text as username, u.email::text as email,
           p.pending_at as "pendingAt", p.data is not null as "hasApproved"
    from profile_photos p join users u on u.id = p.user_id
    where p.pending_data is not null
    order by p.pending_at asc
    limit 200
  `;
}

export async function pendingPhotoCount(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from profile_photos where pending_data is not null
  `;
  return n;
}

/** Approve (replaces the current photo) or reject (keeps it) a pending photo. */
export async function decidePhoto(
  adminId: string,
  userId: string,
  decision: "approve" | "reject",
  reason: string | null,
): Promise<boolean> {
  return sql.begin(async (tx) => {
    const rows =
      decision === "approve"
        ? await tx`
            update profile_photos
            set mime = pending_mime, data = pending_data, approved_at = now(),
                pending_mime = null, pending_data = null, pending_at = null, reason = null, updated_at = now()
            where user_id = ${userId} and pending_data is not null`
        : await tx`
            update profile_photos
            set pending_mime = null, pending_data = null, pending_at = null, reason = ${reason}, updated_at = now()
            where user_id = ${userId} and pending_data is not null`;
    if (rows.count !== 1) return false;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, ${`photo.${decision}`}, ${userId})`;
    return true;
  });
}

/** Admin: the pending or approved photo of a member. */
export async function adminPhoto(userId: string, which: "approved" | "pending"): Promise<Photo | null> {
  return ownPhoto(userId, which);
}
