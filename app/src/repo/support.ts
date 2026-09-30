import { sql } from "../db.js";

/**
 * Help chat: one thread per member, answered by any admin.
 * A member can only ever read or write their own thread (keyed by the session).
 */
const PAGE = 200;
const MAX_PER_10_MIN = 20;

export type SupportMessage = { id: number; fromAdmin: boolean; body: string; createdAt: Date; author: string | null };

export async function thread(userId: string): Promise<SupportMessage[]> {
  const rows = await sql<SupportMessage[]>`
    select * from (
      select m.id::int as id, m.from_admin as "fromAdmin", m.body, m.created_at as "createdAt",
             case when m.from_admin then split_part(a.name, ' ', 1) else null end as author
      from support_messages m left join users a on a.id = m.author_id
      where m.user_id = ${userId}
      order by m.created_at desc
      limit ${PAGE}
    ) t order by "createdAt" asc
  `;
  return rows;
}

/** Mark the other side's messages in a thread as read. */
export async function markRead(userId: string, readerIsAdmin: boolean) {
  await sql`
    update support_messages set read_at = now()
    where user_id = ${userId} and from_admin = ${!readerIsAdmin} and read_at is null
  `;
}

export async function unreadForMember(userId: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from support_messages where user_id = ${userId} and from_admin and read_at is null
  `;
  return r.n;
}

export type PostResult =
  | { ok: true; message: SupportMessage; firstUnread: boolean; lastAdminReplyAgoMin: number | null }
  | { ok: false; error: "too_fast" };

/** Add a message. `firstUnread` tells the caller whether to e-mail (avoid one mail per message). */
export async function post(userId: string, fromAdmin: boolean, authorId: string, body: string): Promise<PostResult> {
  return sql.begin(async (tx) => {
    await tx`select 1 from users where id = ${userId} for update`;
    if (!fromAdmin) {
      const [{ n }] = await tx<{ n: number }[]>`
        select count(*)::int as n from support_messages
        where user_id = ${userId} and not from_admin and created_at > now() - interval '10 minutes'
      `;
      if (n >= MAX_PER_10_MIN) return { ok: false, error: "too_fast" } as const;
    }
    const [{ pending }] = await tx<{ pending: number }[]>`
      select count(*)::int as pending from support_messages
      where user_id = ${userId} and from_admin = ${fromAdmin} and read_at is null
    `;
    const [last] = await tx<{ mins: number }[]>`
      select extract(epoch from now() - max(created_at)) / 60 as mins from support_messages
      where user_id = ${userId} and from_admin
      having count(*) > 0
    `;
    const [m] = await tx<SupportMessage[]>`
      insert into support_messages (user_id, from_admin, author_id, body)
      values (${userId}, ${fromAdmin}, ${authorId}, ${body})
      returning id::int as id, from_admin as "fromAdmin", body, created_at as "createdAt", null::text as author
    `;
    return { ok: true, message: m, firstUnread: pending === 0, lastAdminReplyAgoMin: last ? Number(last.mins) : null } as const;
  });
}

/** Admin inbox: one row per member thread, newest activity first. */
export async function inbox() {
  return sql<
    {
      userId: string;
      name: string;
      username: string;
      email: string;
      lastBody: string;
      lastFromAdmin: boolean;
      lastAt: Date;
      unread: number;
    }[]
  >`
    select u.id as "userId", u.name, u.username::text as username, u.email::text as email,
           l.body as "lastBody", l.from_admin as "lastFromAdmin", l.created_at as "lastAt",
           (select count(*)::int from support_messages x
             where x.user_id = u.id and not x.from_admin and x.read_at is null) as unread
    from users u
    join lateral (
      select body, from_admin, created_at from support_messages m
      where m.user_id = u.id order by created_at desc limit 1
    ) l on true
    order by l.created_at desc
    limit 200
  `;
}

export async function unreadThreadsForAdmin(): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select count(distinct user_id)::int as n from support_messages where not from_admin and read_at is null
  `;
  return r.n;
}

export async function member(userId: string) {
  const [u] = await sql<{ name: string; username: string; email: string; college: string; joined: Date }[]>`
    select name, username::text as username, email::text as email, college, created_at as joined
    from users where id = ${userId}
  `;
  return u ?? null;
}
