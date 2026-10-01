import type postgres from "postgres";
import { holdReason, type HoldReason } from "../moderation.js";
import { sql } from "../db.js";
import { statsOf } from "./users.js";

/**
 * Delivery requests ("orders" table).
 *
 * Every state change is ONE conditional UPDATE: who may do it and from
 * which status is part of the WHERE clause, keyed by the session user. Two
 * runners pressing "Take" at the same moment cannot both win; the second
 * update simply matches no row.
 */

const MAX_OPEN_PER_CUSTOMER = 3;
const MAX_ACTIVE_PER_RUNNER = 3;
const MAX_POSTS_PER_DAY = 20;

export type Status = "open" | "accepted" | "on_the_way" | "delivered" | "cancelled";

type Person = { username: string; name: string };

export type BoardItem = {
  code: string;
  details: string;
  pickup: string;
  /** True when the pickup is a place from the admin's UM list. */
  listed: boolean;
  dropoff: string;
  tipSen: number;
  status: Status;
  createdAt: Date;
  customer: Person;
};

/** Open requests, newest first. Public: only usernames and first names. */
export async function openBoard(limit: number): Promise<BoardItem[]> {
  const rows = await sql<(Omit<BoardItem, "customer"> & { cUsername: string; cName: string })[]>`
    select o.code, o.details, o.pickup, o.place_id is not null as listed, o.dropoff, o.tip_sen as "tipSen", o.status,
           o.created_at as "createdAt", c.username::text as "cUsername", split_part(c.name, ' ', 1) as "cName"
    from orders o join users c on c.id = o.customer_id
    where o.status = 'open' and o.held_at is null and c.status = 'active'
      and o.created_at > now() - make_interval(hours => ${EXPIRE_HOURS})
    order by o.created_at desc
    limit ${limit}
  `;
  return rows.map(({ cUsername, cName, ...r }) => ({ ...r, customer: { username: cUsername, name: cName } }));
}

export async function createRequest(
  userId: string,
  r: { details: string; pickup: string; placeId: number | null; dropoff: string; tipSen: number },
): Promise<
  { code: string; held: HoldReason | null } | "need_whatsapp" | "too_many" | "daily_limit" | "blocked"
> {
  const [u] = await sql<{ phone: boolean; blocked: boolean; open: number; today: number }[]>`
    select phone_wa is not null as phone, post_blocked_at is not null as blocked,
      (select count(*)::int from orders where customer_id = ${userId}
         and status in ('open','accepted','on_the_way')) as open,
      (select count(*)::int from orders where customer_id = ${userId}
         and created_at > now() - interval '1 day') as today
    from users where id = ${userId}
  `;
  if (u?.blocked) return "blocked";
  if (!u?.phone) return "need_whatsapp";
  if (u.open >= MAX_OPEN_PER_CUSTOMER) return "too_many";
  if (u.today >= MAX_POSTS_PER_DAY) return "daily_limit";
  // Text that looks wrong waits for an admin instead of going on the public board.
  const hold = holdReason(r.details, r.placeId ? "" : r.pickup, r.dropoff);
  const [row] = await sql<{ code: string }[]>`
    insert into orders (type, customer_id, pickup, place_id, dropoff, details, tip_sen, held_at, hold_reason)
    values ('deliver', ${userId}, ${r.pickup}, ${r.placeId}, ${r.dropoff}, ${r.details}, ${r.tipSen},
            ${hold ? sql`now()` : null}, ${hold ? `${hold.reason}: ${hold.match}`.slice(0, 120) : null})
    returning code
  `;
  return { code: row.code, held: hold?.reason ?? null };
}

/**
 * One request as a given viewer may see it. A request that is no longer
 * open is visible only to its customer and its runner. The counterpart's
 * WhatsApp number is included only for those two, and only after a runner
 * has accepted.
 */
export async function requestForViewer(code: string, viewerId: string | null) {
  const [o] = await sql<
    {
      id: number;
      code: string;
      details: string;
      pickup: string;
      listed: boolean;
      dropoff: string;
      tipSen: number;
      status: Status;
      createdAt: Date;
      acceptedAt: Date | null;
      deliveredAt: Date | null;
      noShow: boolean;
      held: boolean;
      expired: boolean;
      runnerMissing: boolean;
      customerId: string;
      runnerId: string | null;
      cUsername: string;
      cName: string;
      cPhone: string | null;
      rUsername: string | null;
      rName: string | null;
      rPhone: string | null;
    }[]
  >`
    select o.id::int as id, o.code, o.details, o.pickup, o.place_id is not null as listed, o.dropoff,
           o.tip_sen as "tipSen", o.status,
           o.created_at as "createdAt", o.accepted_at as "acceptedAt", o.delivered_at as "deliveredAt",
           o.no_show_at is not null as "noShow",
           o.held_at is not null as held, o.expired_at is not null as expired,
           exists (select 1 from runner_flags f where f.order_id = o.id and f.kind = 'no_show') as "runnerMissing",
           o.customer_id as "customerId", o.runner_id as "runnerId",
           c.username::text as "cUsername", c.name as "cName", c.phone_wa as "cPhone",
           r.username::text as "rUsername", r.name as "rName", r.phone_wa as "rPhone"
    from orders o
    join users c on c.id = o.customer_id
    left join users r on r.id = o.runner_id
    where o.code = ${code}
  `;
  if (!o) return null;

  const role = viewerId === o.customerId ? "customer" : viewerId && viewerId === o.runnerId ? "runner" : null;
  if (o.status !== "open" && !role) return null;
  // A held request is only visible to the person who posted it until an admin approves it.
  if (o.held && role !== "customer") return null;

  const matched = role !== null && ["accepted", "on_the_way", "delivered"].includes(o.status);
  let canAccept = false;
  let needsPhoto = false;
  let skipped = false;
  if (viewerId && o.status === "open" && role === null) {
    const [r] = await sql<{ runner: boolean; skipped: boolean; photo: boolean }[]>`
      select exists (select 1 from user_roles where user_id = ${viewerId} and role = 'runner' and status = 'active') as runner,
             exists (select 1 from orders where id = ${o.id} and ${viewerId}::uuid = any(skipped_runners)) as skipped,
             exists (select 1 from profile_photos where user_id = ${viewerId} and data is not null) as photo
    `;
    skipped = r.runner && r.skipped;
    canAccept = r.runner && !r.skipped;
    needsPhoto = canAccept && !r.photo;
  }
  let rated = false;
  if (role && o.status === "delivered") {
    const [r] = await sql<{ n: number }[]>`
      select count(*)::int as n from ratings where order_id = ${o.id} and from_user = ${viewerId}
    `;
    rated = r.n > 0;
  }

  return {
    code: o.code,
    details: o.details,
    pickup: o.pickup,
    listed: o.listed,
    dropoff: o.dropoff,
    tipSen: o.tipSen,
    status: o.status,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    deliveredAt: o.deliveredAt,
    customer: { username: o.cUsername, name: role ? o.cName : o.cName.split(" ")[0] },
    runner: o.rUsername
      ? {
          username: o.rUsername,
          name: o.rName,
          // Who is coming: shown to the requester once the runner has taken the request.
          ...(matched && role === "customer" && o.runnerId ? await runnerCard(o.runnerId) : {}),
        }
      : null,
    viewerRole: role,
    canAccept,
    /** A runner who can take this request but has no approved face photo yet. */
    needsPhoto,
    /** This runner was sent away by the requester and can't take it again. */
    skipped,
    canRate: role !== null && o.status === "delivered" && !rated,
    /** The runner reported that the requester never turned up or wouldn't pay. */
    noShow: role !== null && o.noShow,
    /** Waiting for an admin to check the text before it goes on the board. */
    held: role === "customer" && o.held,
    /** Closed by itself: nobody took it in time. */
    expired: o.expired,
    /** The requester reported that the runner never came. */
    runnerMissing: role !== null && o.runnerMissing,
    /** The requester may report that the runner never came (long after they set off). */
    canReportRunner:
      role === "customer" &&
      o.status === "on_the_way" &&
      o.acceptedAt !== null &&
      Date.now() - o.acceptedAt.getTime() >= RUNNER_MISSING_WAIT_MS,
    /** The runner may report a no-show (a few minutes after taking it, before delivery). */
    canReportNoShow:
      role === "runner" &&
      (o.status === "accepted" || o.status === "on_the_way") &&
      o.acceptedAt !== null &&
      Date.now() - o.acceptedAt.getTime() >= NO_SHOW_WAIT_MS,
    contact: matched ? (role === "customer" ? o.rPhone : o.cPhone) : null,
  };
}

export async function acceptRequest(
  code: string,
  runnerId: string,
): Promise<"ok" | "gone" | "not_runner" | "busy" | "need_photo" | "paused"> {
  const [r] = await sql<{ runner: boolean; active: number; photo: boolean; paused: boolean }[]>`
    select exists (select 1 from user_roles where user_id = ${runnerId} and role = 'runner' and status = 'active') as runner,
           (select runner_paused_at is not null from users where id = ${runnerId}) as paused,
           (select count(*)::int from orders where runner_id = ${runnerId} and status in ('accepted','on_the_way')) as active,
           exists (select 1 from profile_photos where user_id = ${runnerId} and data is not null) as photo
  `;
  if (!r.runner) return "not_runner";
  if (r.paused) return "paused";
  // Requesters see who is coming, so a runner needs an approved face photo first.
  if (!r.photo) return "need_photo";
  if (r.active >= MAX_ACTIVE_PER_RUNNER) return "busy";
  const rows = await sql`
    update orders set runner_id = ${runnerId}, status = 'accepted', accepted_at = now()
    where code = ${code} and status = 'open' and held_at is null and customer_id <> ${runnerId}
      and created_at > now() - make_interval(hours => ${EXPIRE_HOURS})
      and not (${runnerId}::uuid = any(skipped_runners))
  `;
  return rows.count === 1 ? "ok" : "gone";
}

export async function advanceRequest(code: string, runnerId: string, to: "on_the_way" | "delivered"): Promise<boolean> {
  const rows =
    to === "on_the_way"
      ? await sql`
          update orders set status = 'on_the_way'
          where code = ${code} and runner_id = ${runnerId} and status = 'accepted'`
      : await sql`
          update orders set status = 'delivered', delivered_at = now()
          where code = ${code} and runner_id = ${runnerId} and status in ('accepted', 'on_the_way')`;
  return rows.count === 1;
}

/**
 * The requester sends the runner away (before they set off) and the request
 * goes back to the board. That runner can't take this request again.
 * Swapping a runner who still hadn't set off 10 minutes after taking it
 * counts as a flag on that runner.
 */
export async function sendAwayRunner(
  code: string,
  customerId: string,
): Promise<{ ok: false } | { ok: true; flagged: RunnerFlagResult | null }> {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ id: number; runnerId: string; late: boolean }[]>`
      update orders o
      set skipped_runners = array_append(o.skipped_runners, o.runner_id),
          runner_id = null, status = 'open', accepted_at = null
      from (select id, runner_id, accepted_at from orders where code = ${code} for update) old
      where o.id = old.id and o.customer_id = ${customerId} and o.status = 'accepted'
      returning o.id::int as id, old.runner_id as "runnerId",
                old.accepted_at < now() - make_interval(mins => ${RUNNER_DROP_MIN}) as late
    `;
    if (!o) return { ok: false as const };
    const flagged = o.late ? await flagRunner(tx, o.id, o.runnerId, customerId, "dropped") : null;
    return { ok: true as const, flagged };
  });
}

/** The requester reports that the runner set off long ago and never came. The order is cancelled. */
export async function reportRunnerMissing(
  code: string,
  customerId: string,
): Promise<{ ok: false; error: "too_soon" | "gone" } | { ok: true; flagged: RunnerFlagResult }> {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ id: number; runnerId: string; acceptedAt: Date | null }[]>`
      select id::int as id, runner_id as "runnerId", accepted_at as "acceptedAt" from orders
      where code = ${code} and customer_id = ${customerId} and status = 'on_the_way'
      for update
    `;
    if (!o) return { ok: false as const, error: "gone" as const };
    if (!o.acceptedAt || Date.now() - o.acceptedAt.getTime() < RUNNER_MISSING_WAIT_MS) {
      return { ok: false as const, error: "too_soon" as const };
    }
    await tx`update orders set status = 'cancelled', cancelled_at = now() where id = ${o.id}`;
    await tx`insert into audit_log (actor_id, action, target) values (${customerId}, 'order.runner_missing', ${code})`;
    const flagged = await flagRunner(tx, o.id, o.runnerId, customerId, "no_show");
    return { ok: true as const, flagged };
  });
}

export type RunnerFlagResult = { runner: string; flags: number; paused: boolean };

/** Record a flag and pause the runner once RUNNER_FLAG_LIMIT different requesters flagged them (last 30 days). */
async function flagRunner(
  tx: postgres.TransactionSql,
  orderId: number,
  runnerId: string,
  customerId: string,
  kind: "dropped" | "no_show",
): Promise<RunnerFlagResult> {
  await tx`
    insert into runner_flags (order_id, runner_id, customer_id, kind)
    values (${orderId}, ${runnerId}, ${customerId}, ${kind})
    on conflict (order_id, runner_id) do nothing
  `;
  const [u] = await tx<{ username: string; paused: boolean; flags: number }[]>`
    select u.username::text as username, u.runner_paused_at is not null as paused,
           (select count(distinct f.customer_id)::int from runner_flags f
             where f.runner_id = u.id and f.created_at > now() - interval '30 days'
               and f.created_at > coalesce(u.runner_flags_cleared_at, '-infinity'::timestamptz)) as flags
    from users u where u.id = ${runnerId} for update
  `;
  let paused = u.paused;
  if (!paused && u.flags >= RUNNER_FLAG_LIMIT) {
    await tx`update users set runner_paused_at = now() where id = ${runnerId}`;
    await tx`insert into audit_log (actor_id, action, target) values (null, 'runner.paused', ${runnerId})`;
    paused = true;
  }
  return { runner: u.username, flags: u.flags, paused };
}

/** Requests nobody took within EXPIRE_HOURS close by themselves, so the board stays fresh. */
export async function expireStale(): Promise<string[]> {
  const rows = await sql<{ code: string }[]>`
    update orders set status = 'cancelled', cancelled_at = now(), expired_at = now()
    where status = 'open' and created_at < now() - make_interval(hours => ${EXPIRE_HOURS})
    returning code
  `;
  return rows.map((r) => r.code);
}

/**
 * The requester raises the delivery fee while nobody has taken the request
 * (it can only go up, so runners never see a fee drop under them).
 */
export async function raiseTip(
  code: string,
  customerId: string,
  tipSen: number,
): Promise<"ok" | "not_higher" | "gone"> {
  const [o] = await sql<{ tipSen: number }[]>`
    select tip_sen as "tipSen" from orders where code = ${code} and customer_id = ${customerId} and status = 'open'
  `;
  if (!o) return "gone";
  if (tipSen <= o.tipSen) return "not_higher";
  const rows = await sql`
    update orders set tip_sen = ${tipSen}
    where code = ${code} and customer_id = ${customerId} and status = 'open' and tip_sen < ${tipSen}
  `;
  return rows.count === 1 ? "ok" : "gone";
}

/** A runner swapped out after this many minutes without setting off gets a flag. */
export const RUNNER_DROP_MIN = 10;
/** How long after taking it before the requester can say the runner never came. */
export const RUNNER_MISSING_WAIT_MS = 60 * 60_000;
/** Different requesters flagging a runner (in 30 days) before the runner is paused. */
export const RUNNER_FLAG_LIMIT = 3;
/** Open requests nobody took close after this long. */
export const EXPIRE_HOURS = 3;

/** How long a runner must wait after taking a request before reporting a no-show. */
export const NO_SHOW_WAIT_MS = 5 * 60_000;
/** Different runners reporting the same requester before they can't post any more. */
export const NO_SHOW_LIMIT = 2;

/**
 * The runner reports that the requester never turned up or wouldn't pay.
 * The order is cancelled and counted against the requester; reports from
 * NO_SHOW_LIMIT different runners stop them posting until an admin checks.
 */
export async function reportNoShow(
  code: string,
  runnerId: string,
): Promise<
  | { ok: true; customerId: string; customer: string; strikes: number; blocked: boolean }
  | { ok: false; error: "too_soon" | "gone" }
> {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ id: number; customerId: string; acceptedAt: Date | null }[]>`
      select id::int as id, customer_id as "customerId", accepted_at as "acceptedAt" from orders
      where code = ${code} and runner_id = ${runnerId} and status in ('accepted', 'on_the_way')
      for update
    `;
    if (!o) return { ok: false as const, error: "gone" as const };
    if (!o.acceptedAt || Date.now() - o.acceptedAt.getTime() < NO_SHOW_WAIT_MS) {
      return { ok: false as const, error: "too_soon" as const };
    }
    await tx`update orders set status = 'cancelled', cancelled_at = now(), no_show_at = now() where id = ${o.id}`;
    await tx`insert into audit_log (actor_id, action, target) values (${runnerId}, 'order.no_show', ${code})`;
    const [u] = await tx<{ strikes: number; blocked: boolean; username: string }[]>`
      select u.username::text as username, u.post_blocked_at is not null as blocked,
             (select count(distinct x.runner_id)::int from orders x
               where x.customer_id = u.id and x.no_show_at is not null
                 and x.no_show_at > coalesce(u.strikes_cleared_at, '-infinity'::timestamptz)) as strikes
      from users u where u.id = ${o.customerId} for update
    `;
    let blocked = u.blocked;
    if (!blocked && u.strikes >= NO_SHOW_LIMIT) {
      await tx`update users set post_blocked_at = now() where id = ${o.customerId}`;
      await tx`insert into audit_log (actor_id, action, target) values (null, 'user.post_blocked', ${o.customerId})`;
      blocked = true;
    }
    return { ok: true as const, customerId: o.customerId, customer: u.username, strikes: u.strikes, blocked };
  });
}

/** The runner gives the request back to the board (before setting off). */
export async function releaseRequest(code: string, runnerId: string): Promise<boolean> {
  const rows = await sql`
    update orders set runner_id = null, status = 'open', accepted_at = null
    where code = ${code} and runner_id = ${runnerId} and status = 'accepted'
  `;
  return rows.count === 1;
}

/** The customer withdraws a request nobody has taken yet. */
export async function cancelRequest(code: string, customerId: string): Promise<boolean> {
  const rows = await sql`
    update orders set status = 'cancelled', cancelled_at = now()
    where code = ${code} and customer_id = ${customerId} and status = 'open'
  `;
  return rows.count === 1;
}

/** Rate the other side of a delivered request, once. */
export async function rateRequest(code: string, userId: string, stars: number, body: string): Promise<boolean> {
  const rows = await sql`
    insert into ratings (order_id, from_user, to_user, stars, body)
    select o.id, ${userId},
           case when o.customer_id = ${userId} then o.runner_id else o.customer_id end,
           ${stars}, ${body}
    from orders o
    where o.code = ${code} and o.status = 'delivered'
      and (o.customer_id = ${userId} or o.runner_id = ${userId})
    on conflict (order_id, from_user) do nothing
  `;
  return rows.count === 1;
}

/** The signed-in user's own requests and runs, most recent first. */
export async function myRequests(userId: string) {
  return sql<
    {
      code: string;
      details: string;
      pickup: string;
      dropoff: string;
      tipSen: number;
      status: Status;
      createdAt: Date;
      mine: "customer" | "runner";
    }[]
  >`
    select code, details, pickup, dropoff, tip_sen as "tipSen", status, created_at as "createdAt",
           case when customer_id = ${userId} then 'customer' else 'runner' end as mine
    from orders
    where customer_id = ${userId} or runner_id = ${userId}
    order by (status in ('open','accepted','on_the_way')) desc, created_at desc
    limit 40
  `;
}

/** Runner details for the requester: photo flag, how they travel, runs and rating. */
async function runnerCard(runnerId: string) {
  const [r] = await sql<{ hasPhoto: boolean; vehicle: string | null }[]>`
    select exists (select 1 from profile_photos where user_id = ${runnerId} and data is not null) as "hasPhoto",
           (select details->>'vehicle' from role_applications
             where user_id = ${runnerId} and role = 'runner' and status = 'approved'
             order by decided_at desc limit 1) as vehicle
  `;
  const s = await statsOf(runnerId);
  return { hasPhoto: r.hasPhoto, vehicle: r.vehicle, runs: s.runs, rating: s.rating, ratingCount: s.ratingCount };
}
