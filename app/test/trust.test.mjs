// Trust rules: one WhatsApp per account, username cooldown, runner name lock, requester sends a runner away.
// Fresh database with ADMIN_EMAILS=admin@x.com, and DATABASE_URL_ADMIN (superuser) set.
import postgres from "postgres";
import { apply } from "./apply-helper.mjs";
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

const A = await signIn("a", "admin@x.com", "Ali Admin");
const P = await signIn("p", "p@x.com", "Putri");
const Q = await signIn("q", "q@x.com", "Qila");

// --- one WhatsApp number per account
check("first account takes the number", (await patch(P, { name: "Putri", username: "putri", whatsapp: "012-345 6789" })).status === 200);
let r = await patch(Q, { name: "Qila", username: "qila", whatsapp: "+60 12 345 6789" });
check("same number in another format is taken", r.status === 409 && r.body.error === "phone_taken" && r.body.fields.includes("whatsapp"), JSON.stringify(r.body));
check("owner can save again with the same number", (await patch(P, { name: "Putri", username: "putri", whatsapp: "0123456789" })).status === 200);
check("other number is fine", (await patch(Q, { name: "Qila", username: "qila", whatsapp: "0198765432" })).status === 200);
check("owner frees the number", (await patch(P, { name: "Putri", username: "putri", whatsapp: "0111111111" })).status === 200);
check("freed number can be taken", (await patch(Q, { name: "Qila", username: "qila", whatsapp: "0123456789" })).status === 200);

// --- username: first change free, then 30 days
r = await patch(P, { name: "Putri", username: "putri2", whatsapp: "0111111111" });
check("second username change within 30 days blocked", r.status === 409 && r.body.error === "username_cooldown" && new Date(r.body.until) > new Date(Date.now() + 29 * 86400e3), JSON.stringify(r.body));
check("me shows when username can change", new Date((await call("/me", P)).body.usernameChangeableAt) > new Date());
check("other fields still save", (await patch(P, { name: "Putri A", username: "putri", whatsapp: "0111111111", bio: "hai" })).status === 200);
await db`update users set username_changed_at = now() - interval '31 days' where username = 'putri'`;
check("after 30 days it can change", (await patch(P, { name: "Putri A", username: "putri2", whatsapp: "0111111111" })).status === 200);

// --- approved runner: name locked, admin renames
const R = await signIn("r", "r@x.com", "Rudi");
const S = await signIn("s", "s@x.com", "Sari");
await patch(R, { name: "Rudi", username: "rudi", whatsapp: "0133333333" });
await patch(S, { name: "Sari", username: "sari", whatsapp: "0144444444" });
await apply(R, "runner"); await apply(S, "runner");
for (const a of (await call("/admin/applications", A)).body) await call(`/admin/applications/${a.id}/decision`, A, "POST", { decision: "approve" });
r = await patch(R, { name: "Someone Else", username: "rudi", whatsapp: "0133333333" });
check("runner cannot rename themselves", r.status === 409 && r.body.error === "name_locked");
check("runner can still edit other fields", (await patch(R, { name: "Rudi", username: "rudi", whatsapp: "0133333333", bio: "KK12" })).status === 200);
const rudi = (await call("/admin/users?q=rudi", A)).body[0].id;
check("member cannot rename others", (await call(`/admin/users/${rudi}/name`, R, "POST", { name: "X" })).status === 403);
check("admin renames runner", (await call(`/admin/users/${rudi}/name`, A, "POST", { name: "Rudi Hartono" })).status === 200);
check("new name applied", (await call("/me", R)).body.name === "Rudi Hartono");
check("rename audited", JSON.stringify((await call("/admin/audit", A)).body).includes("user.rename"));

// --- requester sends a runner away
r = await call("/requests", Q, "POST", { details: "Nasi lemak 1", pickup: "Kafe KK12", dropoff: "KK8 C 2-14", tip: 3 });
const code = r.body.code;
check("runner takes it", (await call(`/requests/${code}/accept`, R, "POST")).status === 200);
check("runner cannot send themselves away", (await call(`/requests/${code}/replace-runner`, R, "POST")).status === 409);
check("stranger cannot send runner away", (await call(`/requests/${code}/replace-runner`, P, "POST")).status === 409);
check("requester sends runner away", (await call(`/requests/${code}/replace-runner`, Q, "POST")).status === 200);
let d = (await call(`/requests/${code}`, Q)).body;
check("back on the board", d.status === "open" && d.runner === null && d.contact === null);
d = (await call(`/requests/${code}`, R)).body;
check("sent-away runner sees it but can't take it", d.skipped === true && d.canAccept === false && d.contact === null);
check("sent-away runner accept refused", (await call(`/requests/${code}/accept`, R, "POST")).status === 409);
check("another runner can take it", (await call(`/requests/${code}/accept`, S, "POST")).status === 200);
check("cannot send away after setting off", (await call(`/requests/${code}/status`, S, "POST", { status: "on_the_way" })).status === 200 && (await call(`/requests/${code}/replace-runner`, Q, "POST")).status === 409);

// --- requester raises the fee while nobody has taken it
r = await call("/requests", Q, "POST", { details: "Teh tarik 2", pickup: "Kafe KK12", dropoff: "KK8 C 2-14", tip: 2 });
const c2 = r.body.code;
check("raise fee", (await call(`/requests/${c2}/tip`, Q, "POST", { tip: 3.5 })).status === 200);
check("fee shows new amount", (await call(`/requests/${c2}`, Q)).body.tipSen === 350);
check("cannot lower fee", (await call(`/requests/${c2}/tip`, Q, "POST", { tip: 3 })).body?.error === "not_higher");
check("fee capped at RM100", (await call(`/requests/${c2}/tip`, Q, "POST", { tip: 101 })).status === 400);
check("others cannot change the fee", (await call(`/requests/${c2}/tip`, P, "POST", { tip: 5 })).status === 409);
await call(`/requests/${c2}/accept`, R, "POST");
check("cannot raise once taken", (await call(`/requests/${c2}/tip`, Q, "POST", { tip: 5 })).body?.error === "gone");

// --- name, username and WhatsApp hold still while matched in an order
check("me says busy during an order", (await call("/me", Q)).body.busy === true && (await call("/me", P)).body.busy === false);
r = await patch(Q, { name: "Qila", username: "qila", whatsapp: "+62 812 3456 7890" });
check("requester cannot change number mid-order", r.status === 409 && r.body.error === "busy_locked" && r.body.fields.join() === "whatsapp", JSON.stringify(r.body));
r = await patch(Q, { name: "Qila B", username: "qila", whatsapp: "0123456789" });
check("requester cannot rename mid-order", r.status === 409 && r.body.error === "busy_locked" && r.body.fields.join() === "name");
check("same number in another format still saves", (await patch(Q, { name: "Qila", username: "qila", whatsapp: "012-345 6789", bio: "busy" })).status === 200);
r = await patch(R, { name: "Rudi Hartono", username: "rudi_x", whatsapp: "0133333333", bio: "KK12" });
check("runner cannot change username mid-order", r.status === 409 && r.body.error === "busy_locked" && r.body.fields.join() === "username");
check("runner can still edit bio mid-order", (await patch(R, { name: "Rudi Hartono", username: "rudi", whatsapp: "0133333333", bio: "KK12 C" })).status === 200);
await call(`/requests/${c2}/status`, R, "POST", { status: "on_the_way" });
await call(`/requests/${c2}/status`, R, "POST", { status: "delivered" });
await call(`/requests/${code}/status`, S, "POST", { status: "delivered" });
check("not busy after delivery", (await call("/me", Q)).body.busy === false);
check("number changes after delivery", (await patch(Q, { name: "Qila", username: "qila", whatsapp: "+62 812 3456 7890" })).status === 200);
check("stored as E.164", (await call("/me", Q)).body.whatsapp === "+6281234567890");

// --- no-shows: two different runners' reports stop the requester posting
const post = (sid, details) => call("/requests", sid, "POST", { details, pickup: "Kafe KK12", dropoff: "KK8 lobby", tip: 2 });
const backdate = (code) => db`update orders set accepted_at = now() - interval '6 minutes' where code = ${code}`;
r = await post(P, "Nasi goreng");
let ns = r.body.code;
await call(`/requests/${ns}/accept`, R, "POST");
check("no-show too soon after taking it", (await call(`/requests/${ns}/no-show`, R, "POST")).body?.error === "too_soon");
check("detail hides the button too soon", (await call(`/requests/${ns}`, R)).body.canReportNoShow === false);
await backdate(ns);
check("detail offers the button after 5 minutes", (await call(`/requests/${ns}`, R)).body.canReportNoShow === true);
check("requester cannot report a no-show", (await call(`/requests/${ns}/no-show`, P, "POST")).status === 409);
check("stranger cannot report a no-show", (await call(`/requests/${ns}/no-show`, S, "POST")).status === 409);
check("runner reports no-show", (await call(`/requests/${ns}/no-show`, R, "POST")).status === 200);
d = (await call(`/requests/${ns}`, P)).body;
check("order cancelled and marked for requester", d.status === "cancelled" && d.noShow === true);
check("no double report", (await call(`/requests/${ns}/no-show`, R, "POST")).status === 409);
r = await post(P, "Roti canai");
check("one report does not block", r.status === 201);
ns = r.body.code;
await call(`/requests/${ns}/accept`, R, "POST"); await backdate(ns);
await call(`/requests/${ns}/no-show`, R, "POST");
r = await post(P, "Teh tarik");
check("same runner twice still does not block", r.status === 201);
ns = r.body.code;
await call(`/requests/${ns}/accept`, S, "POST"); await backdate(ns);
await call(`/requests/${ns}/status`, S, "POST", { status: "on_the_way" });
check("second runner reports while on the way", (await call(`/requests/${ns}/no-show`, S, "POST")).status === 200);
r = await post(P, "Milo ais");
check("two runners block posting", r.status === 409 && r.body.error === "blocked", JSON.stringify(r.body));
const pu = (await call("/admin/users?q=putri", A)).body.find((u) => u.username === "putri2");
check("admin sees block and count", pu?.postBlocked === true && pu?.noShows === 2, JSON.stringify(pu));
check("member cannot unblock", (await call(`/admin/users/${pu.id}/unblock`, P, "POST")).status === 403);
check("admin unblocks", (await call(`/admin/users/${pu.id}/unblock`, A, "POST")).status === 200);
check("can post again", (await post(P, "Milo ais")).status === 201);
const pu2 = (await call("/admin/users?q=putri", A)).body.find((u) => u.username === "putri2");
check("count cleared after unblock", pu2.postBlocked === false && pu2.noShows === 0);
const audit = JSON.stringify((await call("/admin/audit", A)).body);
check("no-show audited", audit.includes("order.no_show") && audit.includes("user.post_blocked") && audit.includes("user.post_unblocked"));

// --- maintenance reopens by itself at the set time, with a broadcast
const soon = new Date(Date.now() + 3000).toISOString();
check("past reopening time refused", (await call("/admin/maintenance", A, "POST", { on: true, message: "x", until: new Date(Date.now() - 60000).toISOString() })).status === 400);
r = await call("/admin/maintenance", A, "POST", { on: true, message: "Upgrade", until: soon, reopenMessage: "UMOVE is back with faster chat" });
check("maintenance on with reopen time", r.status === 200 && r.body.on === true);
check("reopen message hidden from public status", !JSON.stringify((await call("/status", null)).body).includes("faster chat"));
check("members blocked during maintenance", (await call("/requests/mine", Q)).status === 503);
await new Promise((res) => setTimeout(res, 3500));
check("open again right after the time", (await call("/requests/mine", Q)).status === 200);
await new Promise((res) => setTimeout(res, 21000));
const st = (await call("/status", null)).body;
check("reopen broadcast posted", st.maintenance.on === false && st.broadcasts.some((b) => b.title === "UMOVE is back with faster chat"), JSON.stringify(st));
check("auto reopen audited", JSON.stringify((await call("/admin/audit", A)).body).includes("maintenance.auto_off"));

await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
