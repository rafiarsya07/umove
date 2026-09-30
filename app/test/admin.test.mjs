const BASE = "http://localhost:3222";
let pass = 0, fail = 0;
const check = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`); };
const cookieOf = (res, name) => (res.headers.getSetCookie().find((c) => c.startsWith(`__Host-${name}=`)) ?? "").split(";")[0];
async function signIn(sub, email, name, next) {
  const r1 = await fetch(`${BASE}/api/auth/google${next ? `?next=${next}` : ""}`, { redirect: "manual" });
  const q = new URL(r1.headers.get("location")).searchParams;
  const code = Buffer.from(JSON.stringify({ nonce: q.get("nonce"), challenge: q.get("code_challenge"), sub, email, name })).toString("base64url");
  const r2 = await fetch(`${BASE}/api/auth/google/callback?code=${code}&state=${q.get("state")}`, { redirect: "manual", headers: { cookie: cookieOf(r1, "umove_oauth") } });
  return { sid: cookieOf(r2, "umove_sid"), to: r2.headers.get("location") };
}
const call = async (path, sid, method = "GET", body) => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { cookie: sid ?? "", origin: BASE, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const A = await signIn("a", "admin@x.com", "Ali Admin");
check("admin lands on /admin", A.to === "/admin", A.to);
const D = await signIn("d", "d@x.com", "Dewi");
check("member lands on /dashboard", D.to === "/dashboard", D.to);
const N = await signIn("n", "new@x.com", "Nina New");
check("new member lands on welcome settings", N.to === "/settings?welcome=1", N.to);
const X = await signIn("a", "admin@x.com", "Ali Admin", "/requests/1");
check("admin with ?next goes there", X.to === "/requests/1", X.to);

for (const p of ["/admin/stats", "/admin/users", "/admin/requests", "/admin/audit"]) {
  check(`member blocked from ${p}`, (await call(p, D.sid)).status === 403);
  check(`visitor blocked from ${p}`, (await call(p, null)).status === 401);
}
const stats = (await call("/admin/stats", A.sid)).body;
check("stats has numbers", typeof stats.users === "number" && stats.users >= 5 && typeof stats.open === "number", JSON.stringify(stats));
let users = (await call("/admin/users?q=dewi", A.sid)).body;
check("search users", users.length === 1 && users[0].username === "dewi");
check("search with % is literal", (await call("/admin/users?q=%25", A.sid)).body.length === 0);
const dewi = users[0].id;
check("cannot suspend self", (await call(`/admin/users/${(await call("/admin/users?q=admin@x.com", A.sid)).body[0].id}/status`, A.sid, "POST", { status: "suspended" })).body.error === "self");
check("suspend member", (await call(`/admin/users/${dewi}/status`, A.sid, "POST", { status: "suspended" })).status === 200);
check("suspended member signed out", (await call("/me", D.sid)).status === 401);
const D2 = await signIn("d", "d@x.com", "Dewi");
check("suspended member cannot sign in", D2.to === "/login?error=suspended" && !D2.sid, D2.to);
check("suspended profile hidden", (await call("/users/dewi", null)).status === 404);
check("restore member", (await call(`/admin/users/${dewi}/status`, A.sid, "POST", { status: "active" })).status === 200);
check("bad status rejected", (await call(`/admin/users/${dewi}/status`, A.sid, "POST", { status: "admin" })).status === 400);

const open = (await call("/admin/requests?status=open", A.sid)).body;
check("list open requests", open.length > 0 && open.every((r) => r.status === "open"));
check("admin cancels a request", (await call(`/admin/requests/${open[0].id}/cancel`, A.sid, "POST")).status === 200);
check("cannot cancel twice", (await call(`/admin/requests/${open[0].id}/cancel`, A.sid, "POST")).status === 409);
const delivered = (await call("/admin/requests?status=delivered", A.sid)).body;
if (delivered[0]) check("cannot cancel delivered", (await call(`/admin/requests/${delivered[0].id}/cancel`, A.sid, "POST")).status === 409);
const audit = (await call("/admin/audit", A.sid)).body;
const actions = audit.map((a) => a.action);
check("audit records everything", ["user.suspended", "user.active", "request.cancel"].every((x) => actions.includes(x)) && audit[0].actor === "ali", JSON.stringify(actions));
check("member CSRF on admin action blocked", (await fetch(`${BASE}/api/admin/requests/1/cancel`, { method: "POST", headers: { cookie: A.sid, origin: "https://evil.example" } })).status === 403);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
