import { sql } from "../db.js";

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
  id: number;
  details: string;
  pickup: string;
  dropoff: string;
  tipSen: number;
  status: Status;
  createdAt: Date;
  customer: Person;
};

/** Open requests, newest first. Public: only usernames and first names. */
export async function openBoard(limit: number): Promise<BoardItem[]> {
  const rows = await sql<(Omit<BoardItem, "customer"> & { cUsername: string; cName: string })[]>`
    select o.id::int as id, o.details, o.pickup, o.dropoff, o.tip_sen as "tipSen", o.status,
           o.created_at as "createdAt", c.username::text as "cUsername", split_part(c.name, ' ', 1) as "cName"
    from orders o join users c on c.id = o.customer_id
    where o.status = 'open' and c.status = 'active'
    order by o.created_at desc
    limit ${limit}
  `;
  return rows.map(({ cUsername, cName, ...r }) => ({ ...r, customer: { username: cUsername, name: cName } }));
}

export async function createRequest(
  userId: string,
  r: { details: string; pickup: string; dropoff: string; tipSen: number },
): Promise<{ id: number } | "need_whatsapp" | "too_many" | "daily_limit"> {
  const [u] = await sql<{ phone: boolean; open: number; today: number }[]>`
    select phone_wa is not null as phone,
      (select count(*)::int from orders where customer_id = ${userId}
         and status in ('open','accepted','on_the_way')) as open,
      (select count(*)::int from orders where customer_id = ${userId}
         and created_at > now() - interval '1 day') as today
    from users where id = ${userId}
  `;
  if (!u?.phone) return "need_whatsapp";
  if (u.open >= MAX_OPEN_PER_CUSTOMER) return "too_many";
  if (u.today >= MAX_POSTS_PER_DAY) return "daily_limit";
  const [row] = await sql<{ id: number }[]>`
    insert into orders (type, customer_id, pickup, dropoff, details, tip_sen)
    values ('deliver', ${userId}, ${r.pickup}, ${r.dropoff}, ${r.details}, ${r.tipSen})
    returning id::int as id
  `;
  return row;
}

/**
 * One request as a given viewer may see it. A request that is no longer
 * open is visible only to its customer and its runner. The counterpart's
 * WhatsApp number is included only for those two, and only after a runner
 * has accepted.
 */
export async function requestForViewer(id: number, viewerId: string | null) {
  const [o] = await sql<
    {
      id: number;
      details: string;
      pickup: string;
      dropoff: string;
      tipSen: number;
      status: Status;
      createdAt: Date;
      acceptedAt: Date | null;
      deliveredAt: Date | null;
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
    select o.id::int as id, o.details, o.pickup, o.dropoff, o.tip_sen as "tipSen", o.status,
           o.created_at as "createdAt", o.accepted_at as "acceptedAt", o.delivered_at as "deliveredAt",
           o.customer_id as "customerId", o.runner_id as "runnerId",
           c.username::text as "cUsername", c.name as "cName", c.phone_wa as "cPhone",
           r.username::text as "rUsername", r.name as "rName", r.phone_wa as "rPhone"
    from orders o
    join users c on c.id = o.customer_id
    left join users r on r.id = o.runner_id
    where o.id = ${id}
  `;
  if (!o) return null;

  const role = viewerId === o.customerId ? "customer" : viewerId && viewerId === o.runnerId ? "runner" : null;
  if (o.status !== "open" && !role) return null;

  const matched = role !== null && ["accepted", "on_the_way", "delivered"].includes(o.status);
  let canAccept = false;
  if (viewerId && o.status === "open" && role === null) {
    const [r] = await sql<{ ok: boolean }[]>`
      select exists (select 1 from user_roles where user_id = ${viewerId} and role = 'runner' and status = 'active') as ok
    `;
    canAccept = r.ok;
  }
  let rated = false;
  if (role && o.status === "delivered") {
    const [r] = await sql<{ n: number }[]>`
      select count(*)::int as n from ratings where order_id = ${id} and from_user = ${viewerId}
    `;
    rated = r.n > 0;
  }

  return {
    id: o.id,
    details: o.details,
    pickup: o.pickup,
    dropoff: o.dropoff,
    tipSen: o.tipSen,
    status: o.status,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    deliveredAt: o.deliveredAt,
    customer: { username: o.cUsername, name: role ? o.cName : o.cName.split(" ")[0] },
    runner: o.rUsername ? { username: o.rUsername, name: o.rName } : null,
    viewerRole: role,
    canAccept,
    canRate: role !== null && o.status === "delivered" && !rated,
    contact: matched ? (role === "customer" ? o.rPhone : o.cPhone) : null,
  };
}

export async function acceptRequest(id: number, runnerId: string): Promise<"ok" | "gone" | "not_runner" | "busy"> {
  const [r] = await sql<{ runner: boolean; active: number }[]>`
    select exists (select 1 from user_roles where user_id = ${runnerId} and role = 'runner' and status = 'active') as runner,
           (select count(*)::int from orders where runner_id = ${runnerId} and status in ('accepted','on_the_way')) as active
  `;
  if (!r.runner) return "not_runner";
  if (r.active >= MAX_ACTIVE_PER_RUNNER) return "busy";
  const rows = await sql`
    update orders set runner_id = ${runnerId}, status = 'accepted', accepted_at = now()
    where id = ${id} and status = 'open' and customer_id <> ${runnerId}
  `;
  return rows.count === 1 ? "ok" : "gone";
}

export async function advanceRequest(id: number, runnerId: string, to: "on_the_way" | "delivered"): Promise<boolean> {
  const rows =
    to === "on_the_way"
      ? await sql`
          update orders set status = 'on_the_way'
          where id = ${id} and runner_id = ${runnerId} and status = 'accepted'`
      : await sql`
          update orders set status = 'delivered', delivered_at = now()
          where id = ${id} and runner_id = ${runnerId} and status in ('accepted', 'on_the_way')`;
  return rows.count === 1;
}

/** The runner gives the request back to the board (before setting off). */
export async function releaseRequest(id: number, runnerId: string): Promise<boolean> {
  const rows = await sql`
    update orders set runner_id = null, status = 'open', accepted_at = null
    where id = ${id} and runner_id = ${runnerId} and status = 'accepted'
  `;
  return rows.count === 1;
}

/** The customer withdraws a request nobody has taken yet. */
export async function cancelRequest(id: number, customerId: string): Promise<boolean> {
  const rows = await sql`
    update orders set status = 'cancelled', cancelled_at = now()
    where id = ${id} and customer_id = ${customerId} and status = 'open'
  `;
  return rows.count === 1;
}

/** Rate the other side of a delivered request, once. */
export async function rateRequest(id: number, userId: string, stars: number, body: string): Promise<boolean> {
  const rows = await sql`
    insert into ratings (order_id, from_user, to_user, stars, body)
    select o.id, ${userId},
           case when o.customer_id = ${userId} then o.runner_id else o.customer_id end,
           ${stars}, ${body}
    from orders o
    where o.id = ${id} and o.status = 'delivered'
      and (o.customer_id = ${userId} or o.runner_id = ${userId})
    on conflict (order_id, from_user) do nothing
  `;
  return rows.count === 1;
}

/** The signed-in user's own requests and runs, most recent first. */
export async function myRequests(userId: string) {
  return sql<
    {
      id: number;
      details: string;
      pickup: string;
      dropoff: string;
      tipSen: number;
      status: Status;
      createdAt: Date;
      mine: "customer" | "runner";
    }[]
  >`
    select id::int as id, details, pickup, dropoff, tip_sen as "tipSen", status, created_at as "createdAt",
           case when customer_id = ${userId} then 'customer' else 'runner' end as mine
    from orders
    where customer_id = ${userId} or runner_id = ${userId}
    order by (status in ('open','accepted','on_the_way')) desc, created_at desc
    limit 40
  `;
}
