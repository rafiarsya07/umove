import { sql } from "../db.js";

/**
 * Admin queries. Every change is one conditional statement plus an entry in
 * the append-only audit log, inside one transaction.
 */

export async function adminStats() {
  const [s] = await sql<
    {
      users: number;
      newUsers7d: number;
      runners: number;
      pending: number;
      open: number;
      active: number;
      delivered7d: number;
      suspended: number;
      support: number;
    }[]
  >`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where created_at > now() - interval '7 days') as "newUsers7d",
      (select count(*)::int from user_roles where role = 'runner' and status = 'active') as runners,
      (select count(*)::int from user_roles where status = 'pending') as pending,
      (select count(*)::int from orders where status = 'open') as open,
      (select count(*)::int from orders where status in ('accepted', 'on_the_way')) as active,
      (select count(*)::int from orders where status = 'delivered' and delivered_at > now() - interval '7 days') as "delivered7d",
      (select count(*)::int from users where status = 'suspended') as suspended,
      (select count(distinct user_id)::int from support_messages where not from_admin and read_at is null) as support
  `;
  return s;
}

export async function listUsers(q: string) {
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  return sql<
    {
      id: string;
      name: string;
      username: string;
      email: string;
      whatsapp: string | null;
      college: string;
      status: "active" | "suspended";
      runner: string | null;
      joined: Date;
      requests: number;
      runs: number;
    }[]
  >`
    select u.id, u.name, u.username::text as username, u.email::text as email, u.phone_wa as whatsapp,
           u.college, u.status, r.status as runner, u.created_at as joined,
           (select count(*)::int from orders o where o.customer_id = u.id) as requests,
           (select count(*)::int from orders o where o.runner_id = u.id and o.status = 'delivered') as runs
    from users u
    left join user_roles r on r.user_id = u.id and r.role = 'runner'
    where ${q === ""} or u.username ilike ${like} or u.email ilike ${like} or u.name ilike ${like}
    order by u.created_at desc
    limit 100
  `;
}

/** Suspend or restore a user. Suspending also signs them out everywhere. */
export async function setUserStatus(
  adminId: string,
  userId: string,
  status: "active" | "suspended",
  protectedEmails: Set<string>,
): Promise<"ok" | "self" | "protected" | "not_found"> {
  if (userId === adminId) return "self";
  return sql.begin(async (tx) => {
    const [u] = await tx<{ email: string }[]>`select email::text as email from users where id = ${userId} for update`;
    if (!u) return "not_found";
    if (protectedEmails.has(u.email.toLowerCase())) return "protected";
    await tx`update users set status = ${status} where id = ${userId}`;
    if (status === "suspended") await tx`delete from sessions where user_id = ${userId}`;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, ${`user.${status}`}, ${userId})`;
    return "ok";
  });
}

export async function listRequests(status: string | null) {
  return sql<
    {
      id: number;
      code: string;
      details: string;
      pickup: string;
      dropoff: string;
      tipSen: number;
      status: string;
      createdAt: Date;
      customer: string;
      runner: string | null;
    }[]
  >`
    select o.id::int as id, o.code, o.details, o.pickup, o.dropoff, o.tip_sen as "tipSen", o.status,
           o.created_at as "createdAt", c.username::text as customer, r.username::text as runner
    from orders o
    join users c on c.id = o.customer_id
    left join users r on r.id = o.runner_id
    where ${status === null} or o.status = ${status ?? ""}
    order by o.created_at desc
    limit 100
  `;
}

/** Moderation: cancel any request that is not finished yet. */
export async function adminCancelRequest(adminId: string, id: number): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [row] = await tx<{ code: string }[]>`
      update orders set status = 'cancelled', cancelled_at = now()
      where id = ${id} and status in ('open', 'accepted', 'on_the_way')
      returning code
    `;
    if (!row) return false;
    await tx`insert into audit_log (actor_id, action, target) values (${adminId}, 'request.cancel', ${row.code})`;
    return true;
  });
}

export async function auditLog() {
  return sql<{ id: number; actor: string | null; action: string; target: string | null; at: Date }[]>`
    select a.id::int as id, u.username::text as actor, a.action, a.target, a.created_at as at
    from audit_log a left join users u on u.id = a.actor_id
    order by a.created_at desc
    limit 100
  `;
}
