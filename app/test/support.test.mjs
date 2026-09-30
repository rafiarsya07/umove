// Help chat: member ↔ admins, privacy, unread counts, live events, limits.
// Fresh database with ADMIN_EMAILS=admin@x.com.
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
async function liveEvents(sid, ms) {
  const ctrl = new AbortController(); const got = [];
  const res = await fetch(`${BASE}/api/live`, { headers: { cookie: sid ?? "" }, signal: ctrl.signal });
  const reader = res.body.getReader(); const dec = new TextDecoder();
  const done = (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; got.push(dec.decode(value)); } } catch {} })();
  return { stop: async () => { await new Promise((r) => setTimeout(r, ms)); ctrl.abort(); await done; return got.join(""); } };
}

const A = await signIn("a", "admin@x.com", "Ali Admin");
const M = await signIn("m", "m@x.com", "Mira Student");
const N = await signIn("n", "n@x.com", "Nadia Other");
const start = (sid, o = {}) => call("/me/support/threads", sid, "POST", { topic: "order", orderCode: "um-abc234", body: "My order UM-ABC234 wasn't delivered yet", ...o });

check("visitor cannot use help", (await call("/me/support", null)).status === 401);
check("no thread yet", (await call("/me/support", M)).body.thread === null);
check("cannot chat before a request", (await call("/me/support", M, "POST", { body: "hello" })).body.error === "not_open");
check("message too short", (await start(M, { body: "hi" })).body?.fields?.includes("body"));
check("bad topic", (await start(M, { topic: "love" })).body?.fields?.includes("topic"));
check("bad order code", (await start(M, { orderCode: "12345" })).body?.fields?.includes("orderCode"));
check("extra field rejected", (await start(M, { status: "open" })).status === 400);

const liveM = await liveEvents(M, 1500), liveN = await liveEvents(N, 1500), liveA = await liveEvents(A, 1500);
await new Promise((r) => setTimeout(r, 200));
let r = await start(M);
check("request sent, under review", r.status === 201 && r.body.status === "pending" && r.body.orderCode === "UM-ABC234", JSON.stringify(r.body));
const [em, en, ea] = await Promise.all([liveM.stop(), liveN.stop(), liveA.stop()]);
check("admin gets live event", ea.includes("data: support"));
check("member gets live event", em.includes("data: support"));
check("other member does NOT", !en.includes("data: support"));

check("one active request at a time", (await start(M)).body.error === "already_open");
check("cannot chat while under review", (await call("/me/support", M, "POST", { body: "hello?" })).body.error === "not_open");
let mine = (await call("/me/support", M)).body;
check("member sees pending + own message", mine.thread.status === "pending" && mine.messages.length === 1);

check("stats counts pending", (await call("/admin/stats", A)).body.supportPending === 1 && (await call("/admin/stats", A)).body.support === 1);
check("member cannot open admin inbox", (await call("/admin/support", M)).status === 403);
let q = (await call("/admin/support", A)).body;
check("pending queue lists it", q.length === 1 && q[0].status === "pending" && q[0].email === "m@x.com" && q[0].topic === "order", JSON.stringify(q));
const tid = q[0].id;
check("admin cannot chat before approving", (await call(`/admin/support/${tid}`, A, "POST", { body: "hi" })).body.error === "not_open");
check("decline needs a reason", (await call(`/admin/support/${tid}/decision`, A, "POST", { decision: "decline" })).status === 400);
check("approve", (await call(`/admin/support/${tid}/decision`, A, "POST", { decision: "approve" })).status === 200);
check("approve twice = 409", (await call(`/admin/support/${tid}/decision`, A, "POST", { decision: "approve" })).status === 409);
check("member now open", (await call("/me/support", M)).body.thread.status === "open");

r = await call(`/admin/support/${tid}`, A, "POST", { body: "Hi Mira, checking now." });
check("admin replies", r.status === 201 && r.body.fromAdmin);
check("member has 1 unread", (await call("/me/support/unread", M)).body.unread === 1);
mine = (await call("/me/support", M)).body;
check("member sees reply with admin first name", mine.messages.length === 2 && mine.messages[1].author === "Ali");
check("reading clears unread", (await call("/me/support/unread", M)).body.unread === 0);
check("member replies", (await call("/me/support", M, "POST", { body: "Thanks!" })).status === 201);
check("stats counts unread open chat", (await call("/admin/stats", A)).body.support === 1);
const view = (await call(`/admin/support/${tid}`, A)).body;
check("admin view has member + messages", view.member.email === "m@x.com" && view.messages.length === 3 && view.thread.status === "open");
check("opening clears admin unread", (await call("/admin/stats", A)).body.support === 0);
check("other member sees nothing", (await call("/me/support", N)).body.thread === null);

check("close chat", (await call(`/admin/support/${tid}/close`, A, "POST")).status === 200);
check("member sees closed", (await call("/me/support", M)).body.thread.status === "closed");
check("cannot chat after close", (await call("/me/support", M, "POST", { body: "one more" })).body.error === "not_open");
check("closed list", (await call("/admin/support?status=closed", A)).body.some((x) => x.id === tid));

r = await start(M, { topic: "account", orderCode: "", body: "Please change my college to KK12" });
check("new request after close", r.status === 201);
check("member withdraws pending", (await call("/me/support/threads/current", M, "DELETE")).status === 200);
r = await start(M, { topic: "other", body: "Third request of the day here" });
const t3 = (await call("/admin/support", A)).body[0].id;
check("decline with reason", (await call(`/admin/support/${t3}/decision`, A, "POST", { decision: "decline", reason: "Please use the FAQ for this" })).status === 200);
mine = (await call("/me/support", M)).body;
check("member sees reason", mine.thread.status === "declined" && mine.thread.reason === "Please use the FAQ for this");
check("max 3 requests per day", (await start(M, { body: "Fourth request of the day" })).status === 429);
const audit = (await call("/admin/audit", A)).body.map((a) => a.action);
check("audited", ["support.approve", "support.decline", "support.close"].every((x) => audit.includes(x)), JSON.stringify(audit));

// flood limit in an open chat
r = await start(N, { body: "Need help with my account" });
const tn = (await call("/admin/support", A)).body.find((x) => x.email === "n@x.com").id;
await call(`/admin/support/${tn}/decision`, A, "POST", { decision: "approve" });
for (let i = 0; i < 19; i++) await call("/me/support", N, "POST", { body: `msg ${i}` });
check("flood limited", (await call("/me/support", N, "POST", { body: "one more" })).status === 429);
check("CSRF blocked", (await fetch(`${BASE}/api/me/support/threads`, { method: "POST", headers: { cookie: N, origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ topic: "other", body: "xxxxxxxxxxxx" }) })).status === 403);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
