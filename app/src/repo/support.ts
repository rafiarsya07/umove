import { sql } from "../db.js";

/**
 * Help chat, reviewed first.
 *
 *   member sends a request (topic + first message)  → thread "pending" (under review)
 *   admin approves                                  → "open": both sides can chat
 *   admin declines (with a reason)                  → "declined"
 *   admin closes when resolved / member withdraws   → "closed"
 *
 * One pending or open thread per member (enforced by a unique index).
 * A member only ever reads or writes their own threads (keyed by the session).
 */
const PAGE = 200;
const MAX_MESSAGES_PER_10_MIN = 20;
const MAX_THREADS_PER_DAY = 3;

export type Topic = "order" | "account" | "application" | "report" | "other";
export type ThreadStatus = "pending" | "open" | "declined" | "closed";

export type SupportMessage = { id: number; fromAdmin: boolean; body: string; createdAt: Date; author: string | null };
export type Thread = {
  id: number;
  topic: Topic;
  orderCode: string | null;
  status: ThreadStatus;
  reason: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  closedAt: Date | null;
};

const threadCols = sql`
  t.id::int as id, t.topic, t.order_code as "orderCode", t.status, t.reason,
  t.created_at as "createdAt", t.decided_at as "decidedAt", t.closed_at as "closedAt"
`;

async function messagesOf(threadId: number): Promise<SupportMessage[]> {
  return sql<SupportMessage[]>`
    select * from (
      select m.id::int as id, m.from_admin as "fromAdmin", m.body, m.created_at as "createdAt",
             case when m.from_admin then split_part(a.name, ' ', 1) else null end as author
      from support_messages m left join users a on a.id = m.author_id
      where m.thread_id = ${threadId}
      order by m.created_at desc
      limit ${PAGE}
    ) x order by "createdAt" asc
  `;
}

/* ---- Member --------------------------------------------------------------- */

/** The member's latest thread (any status) and its messages; marks admin replies read. */
export async function myLatest(userId: string) {
  const [thread] = await sql<Thread[]>`
    select ${threadCols} from support_threads t
    where t.user_id = ${userId}
    order by t.created_at desc limit 1
  `;
  if (!thread) return { thread: null, messages: [] };
  const messages = await messagesOf(thread.id);
  await sql`
    update support_messages set read_at = now()
    where thread_id = ${thread.id} and from_admin and read_at is null
  `;
  return { thread, messages };
}

export async function unreadForMember(userId: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from support_messages where user_id = ${userId} and from_admin and read_at is null
  `;
  return r.n;
}

export type StartResult = { ok: true; thread: Thread } | { ok: false; error: "already_open" | "too_many" };

/** Send a new help request. It waits for an admin to review it. */
export async function startThread(
  userId: string,
  topic: Topic,
  orderCode: string | null,
  body: string,
): Promise<StartResult> {
  return sql.begin(async (tx) => {
    await tx`select 1 from users where id = ${userId} for update`;
    const [{ active, today }] = await tx<{ active: number; today: number }[]>`
      select
        (select count(*)::int from support_threads where user_id = ${userId} and status in ('pending', 'open')) as active,
        (select count(*)::int from support_threads where user_id = ${userId} and created_at > now() - interval '1 day') as today
    `;
    if (active > 0) return { ok: false, error: "already_open" } as const;
    if (today >= MAX_THREADS_PER_DAY) return { ok: false, error: "too_many" } as const;
    const [t] = await tx<Thread[]>`
      insert into support_threads (user_id, topic, order_code) values (${userId}, ${topic}, ${orderCode})
      returning id::int as id, topic, order_code as "orderCode", status, reason,
                created_at as "createdAt", decided_at as "decidedAt", closed_at as "closedAt"
    `;
    await tx`
      insert into support_messages (user_id, thread_id, from_admin, author_id, body)
      values (${userId}, ${t.id}, false, ${userId}, ${body})
    `;
    return { ok: true, thread: t } as const;
  });
}

export type PostResult =
  | { ok: true; message: SupportMessage; userId: string; lastAdminReplyAgoMin: number | null }
  | { ok: false; error: "not_open" | "too_fast" | "not_found" };

/**
 * Add a message to an OPEN thread. A member may only write in their own open
 * thread (identified by userId); an admin writes in the thread by id.
 */
export async function postMessage(
  who: { member: string } | { admin: string; threadId: number },
  body: string,
): Promise<PostResult> {
  return sql.begin(async (tx) => {
    const [t] =
      "member" in who
        ? await tx<{ id: number; userId: string; status: ThreadStatus }[]>`
            select id::int as id, user_id as "userId", status from support_threads
            where user_id = ${who.member} and status in ('pending', 'open')
            for update`
        : await tx<{ id: number; userId: string; status: ThreadStatus }[]>`
            select id::int as id, user_id as "userId", status from support_threads
            where id = ${who.threadId}
            for update`;
    if (!t) return { ok: false, error: "member" in who ? "not_open" : "not_found" } as const;
    if (t.status !== "open") return { ok: false, error: "not_open" } as const;
    const fromAdmin = "admin" in who;
    if (!fromAdmin) {
      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int as n from support_messages
        where user_id = ${t.userId} and not from_admin and created_at > now() - interval '10 minutes'
      `;
      if (n >= MAX_MESSAGES_PER_10_MIN) return { ok: false, error: "too_fast" } as const;
    }
    const [last] = await tx<{ mins: number }[]>`
      select extract(epoch from now() - max(created_at)) / 60 as mins from support_messages
      where thread_id = ${t.id} and from_admin
      having count(*) > 0
    `;
    const [m] = await tx<SupportMessage[]>`
      insert into support_messages (user_id, thread_id, from_admin, author_id, body)
      values (${t.userId}, ${t.id}, ${fromAdmin}, ${"admin" in who ? who.admin : who.member}, ${body})
      returning id::int as id, from_admin as "fromAdmin", body, created_at as "createdAt", null::text as author
    `;
    if (fromAdmin) {
      await tx`update support_messages set read_at = now() where thread_id = ${t.id} and not from_admin and read_at is null`;
    }
    return { ok: true, message: m, userId: t.userId, lastAdminReplyAgoMin: last ? Number(last.mins) : null } as const;
  });
}

/** The member withdraws a request that is still under review. */
export async function withdraw(userId: string): Promise<boolean> {
  const rows = await sql`
    update support_threads set status = 'closed', closed_at = now()
    where user_id = ${userId} and status = 'pending'
  `;
  return rows.count === 1;
}

/* ---- Admin ---------------------------------------------------------------- */

export type InboxRow = Thread & {
  userId: string;
  name: string;
  username: string;
  email: string;
  lastBody: string;
  lastFromAdmin: boolean;
  lastAt: Date;
  unread: number;
};

export async function inbox(status: "pending" | "open" | "closed"): Promise<InboxRow[]> {
  const statuses = status === "closed" ? ["closed", "declined"] : [status];
  return sql<InboxRow[]>`
    select ${threadCols},
           u.id as "userId", u.name, u.username::text as username, u.email::text as email,
           l.body as "lastBody", l.from_admin as "lastFromAdmin", l.created_at as "lastAt",
           (select count(*)::int from support_messages x
             where x.thread_id = t.id and not x.from_admin and x.read_at is null) as unread
    from support_threads t
    join users u on u.id = t.user_id
    join lateral (
      select body, from_admin, created_at from support_messages m
      where m.thread_id = t.id order by created_at desc limit 1
    ) l on true
    where t.status in ${sql(statuses)}
    order by ${status === "pending" ? sql`t.created_at asc` : sql`l.created_at desc`}
    limit 200
  `;
}

export async function counts(): Promise<{ pending: number; unread: number }> {
  const [r] = await sql<{ pending: number; unread: number }[]>`
    select
      (select count(*)::int from support_threads where status = 'pending') as pending,
      (select count(distinct m.thread_id)::int from support_messages m join support_threads t on t.id = m.thread_id
        where t.status = 'open' and not m.from_admin and m.read_at is null) as unread
  `;
  return r;
}

/** Admin: one thread with its member and messages; marks the member's messages read. */
export async function adminThread(threadId: number) {
  const [row] = await sql<
    (Thread & { userId: string; name: string; username: string; email: string; college: string; joined: Date })[]
  >`
    select ${threadCols}, u.id as "userId", u.name, u.username::text as username, u.email::text as email,
           u.college, u.created_at as joined
    from support_threads t join users u on u.id = t.user_id
    where t.id = ${threadId}
  `;
  if (!row) return null;
  const messages = await messagesOf(threadId);
  let markedRead = 0;
  if (row.status === "open") {
    const r =
      await sql`update support_messages set read_at = now() where thread_id = ${threadId} and not from_admin and read_at is null`;
    markedRead = r.count;
  }
  const { userId, name, username, email, college, joined, ...thread } = row;
  return { thread, member: { userId, name, username, email, college, joined }, messages, markedRead };
}

export type DecideResult = { ok: true; userId: string; email: string; name: string } | { ok: false };

/** Approve (open the chat) or decline a pending request, recorded in the audit log. */
export async function decide(
  adminId: string,
  threadId: number,
  decision: "approve" | "decline",
  reason: string | null,
): Promise<DecideResult> {
  return sql.begin(async (tx) => {
    const [t] = await tx<{ userId: string; email: string; name: string }[]>`
      update support_threads t
      set status = ${decision === "approve" ? "open" : "declined"}, reason = ${reason},
          decided_at = now(), decided_by = ${adminId},
          closed_at = ${decision === "approve" ? null : sql`now()`}
      from users u
      where t.id = ${threadId} and t.status = 'pending' and u.id = t.user_id
      returning t.user_id as "userId", u.email::text as email, u.name
    `;
    if (!t) return { ok: false } as const;
    await tx`
      insert into audit_log (actor_id, action, target)
      values (${adminId}, ${`support.${decision}`}, ${String(threadId)})
    `;
    return { ok: true, ...t } as const;
  });
}

/** Close an open thread once it's resolved. */
export async function closeThread(adminId: string, threadId: number): Promise<string | null> {
  return sql.begin(async (tx) => {
    const [t] = await tx<{ userId: string }[]>`
      update support_threads set status = 'closed', closed_at = now()
      where id = ${threadId} and status = 'open'
      returning user_id as "userId"
    `;
    if (!t) return null;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'support.close', ${String(threadId)})`;
    return t.userId;
  });
}
