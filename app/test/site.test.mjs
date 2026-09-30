// Broadcasts and maintenance mode. Fresh database with ADMIN_EMAILS=admin@x.com.
const BASE = "http://localhost:3222";
let pass = 0, fail = 0;
const check = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n} ${c ? "" : x}`); };
const cookieOf = (res, name) => (res.headers.getSetCookie().find((c) => c.startsWith(`__Host-${name}=`)) ?? "").split(";")[0];
async function signIn(sub, email, name) {
  const r1 = await fetch(`${BASE}/api/auth/google`, { redirect: "manual" });
  const q = new URL(r1.headers.get("location")).searchParams;
  const code = Buffer.from(JSON.stringify({ nonce: q.get("nonce"), challenge: q.get("code_challenge"), sub, email, name })).toString("base64url");
  const r2 = await fetch(`${BASE}/api/auth/google/callback?code=${code}&state=${q.get("state")}`, { redirect: "manual", headers: { cookie: cookieOf(r1, "umove_oauth") } });
  return { sid: cookieOf(r2, "umove_sid"), to: r2.headers.get("location") };
}
const call = async (path, sid, method = "GET", body) => {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { cookie: sid ?? "", origin: BASE, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const later = (min) => new Date(Date.now() + min * 60_000).toISOString();

const A = (await signIn("a", "admin@x.com", "Ali Admin")).sid;
const M = (await signIn("m", "m@x.com", "Mira")).sid;

// --- status
let s = (await call("/status", null)).body;
check("status public, maintenance off", s.maintenance.on === false && Array.isArray(s.broadcasts));

// --- broadcasts
check("member cannot broadcast", (await call("/admin/broadcasts", M, "POST", { title: "Hi all", body: "", tone: "info", audience: "all" })).status === 403);
check("title too short", (await call("/admin/broadcasts", A, "POST", { title: "Hi", body: "", tone: "info", audience: "all" })).body?.fields?.includes("title"));
check("external link rejected", (await call("/admin/broadcasts", A, "POST", { title: "Go here", body: "", tone: "info", audience: "all", linkPath: "https://evil.example" })).body?.fields?.includes("linkPath"));
check("protocol-relative link rejected", (await call("/admin/broadcasts", A, "POST", { title: "Go here", body: "", tone: "info", audience: "all", linkPath: "//evil.example" })).status === 400);
check("end before start rejected", (await call("/admin/broadcasts", A, "POST", { title: "Bad dates", body: "", tone: "info", audience: "all", startsAt: later(60), endsAt: later(30) })).body?.fields?.includes("endsAt"));
let r = await call("/admin/broadcasts", A, "POST", { title: "Welcome to UMOVE", body: "Deliveries are open in KK8 and KK12.", tone: "success", audience: "all", linkPath: "/requests" });
check("broadcast to all", r.status === 201);
const bAll = r.body.id;
await call("/admin/broadcasts", A, "POST", { title: "Members only note", body: "Update your WhatsApp number.", tone: "info", audience: "members" });
await call("/admin/broadcasts", A, "POST", { title: "Runners: rain tonight", body: "Stay safe.", tone: "warning", audience: "runners" });
await call("/admin/broadcasts", A, "POST", { title: "Scheduled for later", body: "", tone: "info", audience: "all", startsAt: later(60) });
s = (await call("/status", null)).body;
check("visitor sees only 'all'", s.broadcasts.length === 1 && s.broadcasts[0].title === "Welcome to UMOVE" && s.broadcasts[0].linkPath === "/requests", JSON.stringify(s.broadcasts));
s = (await call("/status", M)).body;
check("member sees all + members, not runners", s.broadcasts.length === 2 && !s.broadcasts.some((b) => b.audience === "runners"));
const list = (await call("/admin/broadcasts", A)).body;
check("admin sees history with states", list.length === 4 && list.some((b) => b.state === "scheduled") && list.every((b) => b.createdBy === "admin"), JSON.stringify(list.map((b) => b.state)));
check("end broadcast", (await call(`/admin/broadcasts/${bAll}/end`, A, "POST")).status === 200);
check("end twice = 409", (await call(`/admin/broadcasts/${bAll}/end`, A, "POST")).status === 409);
check("ended one gone from status", !(await call("/status", null)).body.broadcasts.some((b) => b.id === bAll));

// --- maintenance
check("member cannot switch maintenance", (await call("/admin/maintenance", M, "POST", { on: true })).status === 403);
r = await call("/admin/maintenance", A, "POST", { on: true, message: "Upgrading the server, back by 9pm.", until: later(90) });
check("maintenance on", r.status === 200 && r.body.on && r.body.message.startsWith("Upgrading"));
s = (await call("/status", null)).body;
check("status shows maintenance", s.maintenance.on && s.maintenance.until);
r = await call("/requests", null);
check("visitor blocked with 503 + message", r.status === 503 && r.body.error === "maintenance" && r.body.message.startsWith("Upgrading"));
check("member blocked from posting", (await call("/requests", M, "POST", { details: "xx", pickup: "aa", dropoff: "bb", tip: 2 })).status === 503);
check("member can still load /me", (await call("/me", M)).status === 200);
check("member PATCH /me blocked", (await call("/me", M, "PATCH", { name: "M", username: "mira", whatsapp: "", college: "", bio: "" })).status === 503);
check("health still works", (await call("/health", null)).status === 200);
const login = await signIn("a", "admin@x.com", "Ali Admin");
check("admin can still sign in", login.to === "/admin", login.to);
check("admin keeps full access", (await call("/requests", A)).status === 200 && (await call("/admin/stats", A)).status === 200);
check("maintenance off", (await call("/admin/maintenance", A, "POST", { on: false })).body.on === false);
check("site back", (await call("/requests", null)).status === 200);
const audit = (await call("/admin/audit", A)).body.map((a) => a.action);
check("audited", ["broadcast.create", "broadcast.end", "maintenance.on", "maintenance.off"].every((x) => audit.includes(x)), JSON.stringify(audit));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
