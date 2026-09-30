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

const A = await signIn("a", "admin@x.com", "Ali Admin");
const B = await signIn("b", "b@x.com", "Budi Runner");
const C = await signIn("c", "c@x.com", "Citra Runner");
const D = await signIn("d", "d@x.com", "Dewi Visitor");
await profile(B, "budi", "0111111111"); await profile(C, "citra", "0122222222"); await profile(D, "dewi", "");
for (const s of [B, C]) await apply(s, "runner");
const apps = (await call("/admin/applications", A)).body;
for (const a of apps) await call(`/admin/applications/${a.id}/decision`, A, "POST", { decision: "approve" });

// live stream
const ctrl = new AbortController();
const events = [];
const live = await fetch(`${BASE}/api/live`, { signal: ctrl.signal });
check("live stream is text/event-stream", (live.headers.get("content-type") ?? "").includes("text/event-stream"));
(async () => { const dec = new TextDecoder(); try { for await (const ch of live.body) events.push(dec.decode(ch)); } catch {} })();

const req = { details: "Nasi lemak ayam x2", pickup: "Kafe KK12", dropoff: "KK8 Blok C", tip: 3 };
let r = await call("/requests", A, "POST", req);
check("post without WhatsApp = need_whatsapp", r.status === 409 && r.body.error === "need_whatsapp");
await profile(A, "ali", "+60 13-333 3333");
check("post without login = 401", (await call("/requests", null, "POST", req)).status === 401);
check("tip out of range rejected", (await call("/requests", A, "POST", { ...req, tip: -1 })).status === 400);
check("extra field rejected", (await call("/requests", A, "POST", { ...req, customerId: "x" })).status === 400);
r = await call("/requests", A, "POST", req);
check("post ok", r.status === 201 && r.body.id > 0);
const id = r.body.id;
await new Promise((s) => setTimeout(s, 700));
check("live stream announced a change", events.join("").includes("event: change"), JSON.stringify(events));

const board = (await call("/requests", null)).body;
check("board is public and has the request", board.length === 1 && board[0].tipSen === 300 && board[0].customer.name === "ALI");
check("board hides phone and ids", !JSON.stringify(board).includes("333") && !("customerId" in board[0]));

check("non-runner cannot accept", (await call(`/requests/${id}/accept`, D, "POST")).body.error === "not_runner");
const [x, y] = await Promise.all([call(`/requests/${id}/accept`, B, "POST"), call(`/requests/${id}/accept`, C, "POST")]);
check("race: exactly one runner wins", [x.status, y.status].sort().join() === "200,409", `${x.status},${y.status}`);
const winner = x.status === 200 ? B : C, loser = x.status === 200 ? C : B;
const winnerPhone = x.status === 200 ? "+60111111111" : "+60122222222";

check("outsider cannot see accepted request", (await call(`/requests/${id}`, D)).status === 404);
check("loser cannot see it either", (await call(`/requests/${id}`, loser)).status === 404);
let d = (await call(`/requests/${id}`, A)).body;
check("customer sees runner WhatsApp after match", d.viewerRole === "customer" && d.contact === winnerPhone, JSON.stringify(d));
d = (await call(`/requests/${id}`, winner)).body;
check("runner sees customer WhatsApp", d.viewerRole === "runner" && d.contact === "+60133333333");
check("customer cannot cancel once accepted", (await call(`/requests/${id}/cancel`, A, "POST")).status === 409);
check("customer cannot mark delivered", (await call(`/requests/${id}/status`, A, "POST", { status: "delivered" })).status === 409);
check("runner: on the way", (await call(`/requests/${id}/status`, winner, "POST", { status: "on_the_way" })).status === 200);
check("runner cannot release after setting off", (await call(`/requests/${id}/release`, winner, "POST")).status === 409);
check("runner: delivered", (await call(`/requests/${id}/status`, winner, "POST", { status: "delivered" })).status === 200);
check("rate before? outsider cannot rate", (await call(`/requests/${id}/rate`, D, "POST", { stars: 1, body: "" })).status === 409);
check("customer rates runner", (await call(`/requests/${id}/rate`, A, "POST", { stars: 5, body: "Laju!" })).status === 200);
check("rating twice blocked", (await call(`/requests/${id}/rate`, A, "POST", { stars: 1, body: "" })).status === 409);
check("runner rates customer", (await call(`/requests/${id}/rate`, winner, "POST", { stars: 4, body: "" })).status === 200);
const wname = winner === B ? "budi" : "citra";
const pub = (await call(`/users/${wname}`, null)).body;
check("runner profile shows the run and rating", pub.stats.runs === 1 && pub.stats.rating === 5 && pub.reviews[0].body === "Laju!", JSON.stringify(pub.stats));
check("delivered request gone from board", (await call("/requests", null)).body.length === 0);

// release & cancel
r = await call("/requests", A, "POST", req); const id2 = r.body.id;
await call(`/requests/${id2}/accept`, B, "POST");
check("runner can release before setting off", (await call(`/requests/${id2}/release`, B, "POST")).status === 200);
check("released request is open again", (await call(`/requests/${id2}`, null)).body.status === "open");
check("stranger cannot cancel", (await call(`/requests/${id2}/cancel`, B, "POST")).status === 409);
check("customer cancels open request", (await call(`/requests/${id2}/cancel`, A, "POST")).status === 200);

// limits
r = await call("/requests", B, "POST", req); const own = r.body.id;
check("runner cannot take own request", (await call(`/requests/${own}/accept`, B, "POST")).body.error === "gone");
for (let i = 0; i < 3; i++) await call("/requests", A, "POST", req);
check("max 3 active requests per customer", (await call("/requests", A, "POST", req)).body.error === "too_many");
const mine = (await call("/requests/mine", A)).body;
check("my requests lists active first", mine.length >= 5 && mine[0].status === "open");
check("bad id = 404", (await call("/requests/abc", null)).status === 404);

ctrl.abort();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
