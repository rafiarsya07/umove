// Fresh database with ADMIN_EMAILS=admin@x.com, and DATABASE_URL_ADMIN (superuser) set.
import postgres from "postgres";
const BASE = "http://localhost:3222";
let pass = 0, fail = 0;
const check = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`); };
const cookieOf = (res, name) => (res.headers.getSetCookie().find((c) => c.startsWith(`__Host-${name}=`)) ?? "").split(";")[0];
async function signIn(sub, email, name) {
  const r1 = await fetch(`${BASE}/api/auth/google`, { redirect: "manual" });
  const q = new URL(r1.headers.get("location")).searchParams;
  const code = Buffer.from(JSON.stringify({ nonce: q.get("nonce"), challenge: q.get("code_challenge"), sub, email, name })).toString("base64url");
  const r2 = await fetch(`${BASE}/api/auth/google/callback?code=${code}&state=${q.get("state")}`, { redirect: "manual", headers: { cookie: cookieOf(r1, "umove_oauth") } });
  return cookieOf(r2, "umove_sid");
}
const call = async (path, sid, method = "GET", body) => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { cookie: sid ?? "", origin: BASE, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const profile = (sid, username, whatsapp) => call("/me", sid, "PATCH", { name: username.toUpperCase() + " Tester", username, whatsapp, college: "KK8", bio: "" });
const db = postgres(process.env.DATABASE_URL_ADMIN);
const patch = (sid, o) => call("/me", sid, "PATCH", { name: "Test User", username: "x", whatsapp: "", college: "", bio: "", ...o });


// ---- 1. The text filter on its own
const { holdReason } = await import("../dist/moderation.js");
const clean = ["Nasi lemak ayam + teh o ais", "Kafe KK12", "Print 20 pages A4, stapled", "Airport bus ticket", "Bubble tea less sugar", "Tealive KL Gateway", "Tahu goreng 2", "Maggi goreng pedas", "Gunung Kinabalu poster", "Sabun mandi 1 botol", "Biru pen x3", "KK8 Blok C 2-14", "99 Speedmart Pantai Dalam", "Mee bandung"];
for (const t of clean) check(`clean: ${t}`, holdReason(t) === null, JSON.stringify(holdReason(t)));
const dirty = [["Vape pod mint", "banned_item"], ["v4pe juice", "banned_item"], ["b.e.e.r 2 can", "banned_item"], ["beli rokok 1 kotak", "banned_item"], ["Tiger beer", "banned_item"], ["kau bodoh", "bad_word"], ["F U C K", "bad_word"], ["order kat https://x.com/abc", "link"], ["see wa.me/60123", "link"], ["call me 012-345 6789", "phone"], ["+60 12 345 6789", "phone"], ["jawapan exam final", "banned_item"]];
for (const [t, why] of dirty) check(`held: ${t}`, holdReason(t)?.reason === why, JSON.stringify(holdReason(t)));

// ---- people
const A = await signIn("a", "admin@x.com", "Ali Admin");
const C1 = await signIn("c1", "c1@x.com", "Cici");
const C2 = await signIn("c2", "c2@x.com", "Didi");
const C3 = await signIn("c3", "c3@x.com", "Eko");
const R = await signIn("r", "r@x.com", "Rafi");
const S = await signIn("s", "s@x.com", "Sari");
const V = await signIn("v", "v@x.com", "Vina");
await profile(C1, "cici", "0111000001"); await profile(C2, "didi", "0111000002"); await profile(C3, "eko", "0111000003");
await profile(R, "rafi", "0111000004"); await profile(S, "sari", "0111000005"); await profile(V, "vina", "0111000006");
for (const email of ["r@x.com", "s@x.com"]) {
  const [u] = await db`select id from users where email = ${email}`;
  await db`insert into user_roles (user_id, role, status) values (${u.id}, 'runner', 'active')`;
  await db`insert into profile_photos (user_id, mime, data, approved_at) values (${u.id}, 'image/png', ${Buffer.alloc(200, 1)}, now())`;
}
const post = (sid, details, extra = {}) => call("/requests", sid, "POST", { details, pickup: "Kafe KK12", dropoff: "KK8 lobby", tip: 2, ...extra });
const onBoard = async (code) => (await call("/requests", null)).body.some((x) => x.code === code);
const ago = (code, col, mins) => db`update orders set ${db(col)} = now() - make_interval(mins => ${mins}) where code = ${code}`;

// ---- 2. Held requests
let r = await post(C1, "Vape pod mint 2");
check("banned item is accepted but held", r.status === 201 && r.body.held === "banned_item", JSON.stringify(r.body));
const held = r.body.code;
check("held request is not on the board", !(await onBoard(held)));
check("held request hidden from others", (await call(`/requests/${held}`, V)).status === 404);
check("requester sees it is held", (await call(`/requests/${held}`, C1)).body.held === true);
check("runner cannot take a held request", (await call(`/requests/${held}/accept`, R, "POST")).status === 409);
r = await post(C1, "Roti", { dropoff: "call 0123456789" });
check("phone number in drop-off is held", r.body.held === "phone");
const held2 = r.body.code;
const list = (await call("/admin/requests?status=held", A)).body;
check("admin sees held list with reason", list.length === 2 && list.every((x) => x.held) && list.some((x) => x.holdReason?.startsWith("banned_item")), JSON.stringify(list));
check("member cannot approve", (await call(`/admin/requests/${list[0].id}/approve`, C1, "POST")).status === 403);
const vapeRow = list.find((x) => x.code === held), phoneRow = list.find((x) => x.code === held2);
check("admin cancels the bad one", (await call(`/admin/requests/${vapeRow.id}/cancel`, A, "POST")).status === 200);
check("admin approves the fine one", (await call(`/admin/requests/${phoneRow.id}/approve`, A, "POST")).status === 200);
check("approved request is on the board", await onBoard(held2));
check("approve twice refused", (await call(`/admin/requests/${phoneRow.id}/approve`, A, "POST")).status === 409);
check("approval audited", JSON.stringify((await call("/admin/audit", A)).body).includes("order.approve_held"));
r = await post(C2, "Nasi lemak ayam + teh o ais");
check("clean request goes straight on the board", r.body.held === null && (await onBoard(r.body.code)));
const clean1 = r.body.code;

// ---- 3. Expiry
await ago(held2, "created_at", 4 * 60);
check("stale request leaves the board at once", !(await onBoard(held2)));
check("stale request cannot be taken", (await call(`/requests/${held2}/accept`, R, "POST")).status === 409);
await db`update orders set status = 'cancelled', cancelled_at = now(), expired_at = now() where code = ${held2}`; // what the 5-minute watch does
const ex = (await call(`/requests/${held2}`, C1)).body;
check("requester sees it expired", ex.status === "cancelled" && ex.expired === true);

// ---- 4. Swapping a runner: a flag only when they hadn't set off after 10 minutes
await call(`/requests/${clean1}/accept`, R, "POST");
check("swap within 10 minutes", (await call(`/requests/${clean1}/replace-runner`, C2, "POST")).status === 200);
let users = (await call("/admin/users?q=rafi", A)).body;
check("no flag for a quick swap", users[0].runnerFlags === 0, JSON.stringify(users[0]));
const flagBy = async (sid, label) => {
  const c = (await post(sid, `Teh ais ${label}`)).body.code;
  await call(`/requests/${c}/accept`, R, "POST");
  await ago(c, "accepted_at", 11);
  return (await call(`/requests/${c}/replace-runner`, sid, "POST")).status;
};
check("late swap allowed", (await flagBy(C1, "a")) === 200);
users = (await call("/admin/users?q=rafi", A)).body;
check("late swap flags the runner", users[0].runnerFlags === 1);
check("same requester again still one flag", (await flagBy(C1, "b")) === 200 && (await call("/admin/users?q=rafi", A)).body[0].runnerFlags === 1);

// ---- 5. Runner never came (on the way for an hour)
let c = (await post(C2, "Kuih 5")).body.code;
await call(`/requests/${c}/accept`, R, "POST");
await call(`/requests/${c}/status`, R, "POST", { status: "on_the_way" });
check("too soon to report the runner", (await call(`/requests/${c}/runner-missing`, C2, "POST")).body?.error === "too_soon");
check("detail hides the button too soon", (await call(`/requests/${c}`, C2)).body.canReportRunner === false);
await ago(c, "accepted_at", 61);
check("detail offers the button after an hour", (await call(`/requests/${c}`, C2)).body.canReportRunner === true);
check("runner cannot report themselves", (await call(`/requests/${c}/runner-missing`, R, "POST")).status === 409);
check("requester reports runner missing", (await call(`/requests/${c}/runner-missing`, C2, "POST")).status === 200);
let d = (await call(`/requests/${c}`, R)).body;
check("order cancelled, runner sees why", d.status === "cancelled" && d.runnerMissing === true);
check("two flags now", (await call("/admin/users?q=rafi", A)).body[0].runnerFlags === 2);
check("runner can still take requests", (await call(`/requests/${(await post(V, "Pisang goreng")).body.code}/accept`, R, "POST")).status === 200);
check("third requester pauses the runner", (await flagBy(C3, "c")) === 200);
users = (await call("/admin/users?q=rafi", A)).body;
check("admin sees runner paused", users[0].runnerPaused === true && users[0].runnerFlags === 3, JSON.stringify(users[0]));
r = await call(`/requests/${(await post(C3, "Air kotak")).body.code}/accept`, R, "POST");
check("paused runner cannot take requests", r.status === 409 && r.body.error === "paused", JSON.stringify(r.body));
check("other runners unaffected", (await call(`/requests/${(await post(C1, "Milo")).body.code}/accept`, S, "POST")).status === 200);
check("member cannot unpause", (await call(`/admin/users/${users[0].id}/unpause-runner`, R, "POST")).status === 403);
check("admin unpauses", (await call(`/admin/users/${users[0].id}/unpause-runner`, A, "POST")).status === 200);
users = (await call("/admin/users?q=rafi", A)).body;
check("flags cleared", users[0].runnerPaused === false && users[0].runnerFlags === 0);
const audit = JSON.stringify((await call("/admin/audit", A)).body);
check("pause audited", audit.includes("runner.paused") && audit.includes("runner.unpaused") && audit.includes("order.runner_missing"));

await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
