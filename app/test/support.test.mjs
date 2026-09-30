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

check("visitor cannot read help chat", (await call("/me/support", null)).status === 401);
check("empty thread", (await call("/me/support", M)).body.length === 0);
check("empty body rejected", (await call("/me/support", M, "POST", { body: "   " })).status === 400);
check("too long rejected", (await call("/me/support", M, "POST", { body: "x".repeat(1001) })).status === 400);
check("extra field rejected", (await call("/me/support", M, "POST", { body: "hi", fromAdmin: true })).status === 400);

const liveM = await liveEvents(M, 1500), liveN = await liveEvents(N, 1500), liveA = await liveEvents(A, 1500);
await new Promise((r) => setTimeout(r, 200));
let r = await call("/me/support", M, "POST", { body: "Hi admin, my order UM-ABC234 wasn't delivered" });
check("member sends message", r.status === 201 && r.body.fromAdmin === false);
const [em, en, ea] = await Promise.all([liveM.stop(), liveN.stop(), liveA.stop()]);
check("member gets live support event", em.includes("data: support"), em);
check("admin gets live support event", ea.includes("data: support"));
check("other member does NOT get it", !en.includes("data: support"));

check("stats shows unread thread", (await call("/admin/stats", A)).body.support === 1);
check("member cannot open admin inbox", (await call("/admin/support", M)).status === 403);
let inbox = (await call("/admin/support", A)).body;
check("inbox lists thread", inbox.length === 1 && inbox[0].email === "m@x.com" && inbox[0].unread === 1, JSON.stringify(inbox));
const t = (await call(`/admin/support/${inbox[0].userId}`, A)).body;
check("admin reads thread", t.messages.length === 1 && t.member.email === "m@x.com");
check("opening marks read", (await call("/admin/stats", A)).body.support === 0);
r = await call(`/admin/support/${inbox[0].userId}`, A, "POST", { body: "Sorry! Checking now." });
check("admin replies", r.status === 201 && r.body.fromAdmin === true);
check("member has 1 unread", (await call("/me/support/unread", M)).body.unread === 1);
const mine = (await call("/me/support", M)).body;
check("member sees reply with admin first name", mine.length === 2 && mine[1].fromAdmin && mine[1].author === "Ali", JSON.stringify(mine));
check("reading clears unread", (await call("/me/support/unread", M)).body.unread === 0);
check("other member sees nothing", (await call("/me/support", N)).body.length === 0);
check("bad user id 404", (await call("/admin/support/not-a-uuid", A)).status === 404);
check("unknown user 404", (await call("/admin/support/00000000-0000-4000-8000-000000000000", A, "POST", { body: "x" })).status === 404);

for (let i = 0; i < 19; i++) await call("/me/support", M, "POST", { body: `msg ${i}` });
check("flood limited (20 per 10 min)", (await call("/me/support", M, "POST", { body: "one more" })).status === 429);
check("CSRF blocked", (await fetch(`${BASE}/api/me/support`, { method: "POST", headers: { cookie: M, origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ body: "x" }) })).status === 403);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
