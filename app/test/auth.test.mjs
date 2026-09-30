import { apply } from "./apply-helper.mjs";
const BASE = "http://localhost:3222", ORIGIN = BASE;
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${cond ? "" : extra}`); };
const cookieOf = (res, name) => (res.headers.getSetCookie().find((c) => c.startsWith(`__Host-${name}=`)) ?? "").split(";")[0];

async function signIn({ sub, email, name, verified, aud, tamperState }) {
  const r1 = await fetch(`${BASE}/api/auth/google?next=/settings`, { redirect: "manual" });
  const oauth = cookieOf(r1, "umove_oauth");
  const loc = new URL(r1.headers.get("location"));
  const q = loc.searchParams;
  const code = Buffer.from(JSON.stringify({ nonce: q.get("nonce"), challenge: q.get("code_challenge"), sub, email, name, verified, aud })).toString("base64url");
  const state = tamperState ? "wrong" : q.get("state");
  const r2 = await fetch(`${BASE}/api/auth/google/callback?code=${code}&state=${state}`, { redirect: "manual", headers: { cookie: oauth } });
  return { r1, r2, oauth, q, sid: cookieOf(r2, "umove_sid"), code, state };
}
const j = (res) => res.json();
const call = (path, sid, init = {}) => fetch(`${BASE}/api${path}`, { ...init, headers: { cookie: sid, origin: ORIGIN, "content-type": "application/json", ...(init.headers ?? {}) } });

// --- sign in
const a = await signIn({ sub: "g-aiman", email: "Rafi.Admin@Gmail.com", name: "Muhammad Rafi" });
check("auth redirect uses PKCE S256 + state + nonce", a.q.get("code_challenge_method") === "S256" && a.q.get("state") && a.q.get("nonce"));
check("oauth cookie is __Host HttpOnly Secure", /HttpOnly/i.test(a.r1.headers.getSetCookie()[0]) && /Secure/i.test(a.r1.headers.getSetCookie()[0]));
check("new admin goes to ?next (admins skip the welcome page)", a.r2.headers.get("location") === "/settings", a.r2.headers.get("location"));
const sidHeader = a.r2.headers.getSetCookie().find((c) => c.startsWith("__Host-umove_sid"));
check("session cookie HttpOnly+Secure+SameSite=Lax+Path=/", /HttpOnly/i.test(sidHeader) && /Secure/i.test(sidHeader) && /SameSite=Lax/i.test(sidHeader) && /Path=\//.test(sidHeader), sidHeader);

// replay the same callback (code/state/cookie reused)
const replay = await fetch(`${BASE}/api/auth/google/callback?code=${a.code}&state=${a.state}`, { redirect: "manual", headers: { cookie: a.oauth } });
check("replayed callback rejected", replay.headers.get("location") === "/login?error=expired");
const bad = await signIn({ sub: "x", email: "x@y.com", name: "X", tamperState: true });
check("wrong state rejected", bad.r2.headers.get("location") === "/login?error=expired" && !bad.sid);
const unv = await signIn({ sub: "u", email: "u@y.com", name: "U", verified: false });
check("unverified email rejected", unv.r2.headers.get("location") === "/login?error=failed" && !unv.sid);
const wrongAud = await signIn({ sub: "w", email: "w@y.com", name: "W", aud: "evil.apps.googleusercontent.com" });
check("wrong audience rejected", wrongAud.r2.headers.get("location") === "/login?error=failed");

// --- me
const me1 = await j(await call("/me", a.sid));
check("GET /me works", me1.email === "rafi.admin@gmail.com" && me1.username === "rafi_admin" && me1.isAdmin === true, JSON.stringify(me1));
check("GET /me without cookie = 401", (await fetch(`${BASE}/api/me`)).status === 401);
check("forged cookie = 401", (await call("/me", "__Host-umove_sid=" + "A".repeat(43))).status === 401);

// --- profile update
let r = await call("/me", a.sid, { method: "PATCH", body: JSON.stringify({ name: "Rafi", username: "rafi", whatsapp: "012-345 6789", college: "KK8", bio: "hi" }) });
let body = await j(r);
check("PATCH profile ok + phone normalised", r.status === 200 && body.whatsapp === "+60123456789" && body.username === "rafi", JSON.stringify(body));
r = await call("/me", a.sid, { method: "PATCH", body: JSON.stringify({ name: "", username: "Bad Name", whatsapp: "12", college: "", bio: "" }) });
body = await j(r);
check("PATCH invalid rejected with fields", r.status === 400 && body.fields.includes("name") && body.fields.includes("username"), JSON.stringify(body));
r = await call("/me", a.sid, { method: "PATCH", body: JSON.stringify({ name: "R", username: "rafi", whatsapp: "", college: "", bio: "", isAdmin: true }) });
check("PATCH with extra field (isAdmin) rejected", r.status === 400);
r = await call("/me", a.sid, { method: "PATCH", body: JSON.stringify({ name: "Rafi", username: "rafi", whatsapp: "abc", college: "", bio: "" }) });
check("invalid phone rejected", r.status === 400);

// --- second user, username clash, role needs whatsapp
const b = await signIn({ sub: "g-budi", email: "budi@student.um.edu.my", name: "Budi" });
r = await call("/me", b.sid, { method: "PATCH", body: JSON.stringify({ name: "Budi", username: "rafi", whatsapp: "", college: "", bio: "" }) });
check("username taken = 409", r.status === 409 && (await j(r)).error === "username_taken");
let ap = await apply(b.sid, "runner");
check("apply runner without WhatsApp = need_whatsapp", ap.status === 409 && ap.body.error === "need_whatsapp", JSON.stringify(ap));
await call("/me", b.sid, { method: "PATCH", body: JSON.stringify({ name: "Budi", username: "budi", whatsapp: "+62 812 3456 7890", college: "KK12", bio: "" }) });
ap = await apply(b.sid, "runner");
check("apply runner ok", ap.status === 200, JSON.stringify(ap));
check("apply twice = already_applied", (await apply(b.sid, "runner")).status === 409);
check("unknown role = 404", (await call("/me/roles/admin", b.sid, { method: "POST" })).status === 404);

// --- admin
check("non-admin blocked from admin", (await call("/admin/applications", b.sid)).status === 403);
const apps = await j(await call("/admin/applications", a.sid));
check("admin sees application", apps.length === 1 && apps[0].username === "budi" && apps[0].whatsapp === "+6281234567890", JSON.stringify(apps));
r = await call(`/admin/applications/${apps[0].id}/decision`, a.sid, { method: "POST", body: JSON.stringify({ decision: "approve" }) });
check("admin approves", r.status === 200);
check("approve twice = 409", (await call(`/admin/applications/${apps[0].id}/decision`, a.sid, { method: "POST", body: JSON.stringify({ decision: "approve" }) })).status === 409);

// --- public profile
const pub = await j(await fetch(`${BASE}/api/users/budi`));
check("public profile shows verified runner", pub.verifiedRunner === true && pub.name === "Budi");
check("public profile hides email/whatsapp/id", !("email" in pub) && !("whatsapp" in pub) && !("id" in pub) && !JSON.stringify(pub).includes("812"), JSON.stringify(pub));
check("unknown profile = 404", (await fetch(`${BASE}/api/users/nobody`)).status === 404);

// --- CSRF
r = await call("/me", a.sid, { method: "PATCH", headers: { origin: "https://evil.example" }, body: JSON.stringify({ name: "Hacked", username: "rafi", whatsapp: "", college: "", bio: "" }) });
check("cross-origin PATCH blocked", r.status === 403);
r = await fetch(`${BASE}/api/me`, { method: "PATCH", headers: { cookie: a.sid, "content-type": "application/json" }, body: "{}" });
check("PATCH without Origin blocked", r.status === 403);

// --- logout
r = await call("/auth/logout", a.sid, { method: "POST" });
check("logout ok", r.status === 200);
check("old session dead after logout", (await call("/me", a.sid)).status === 401);

// --- returning user goes to next
const a2 = await signIn({ sub: "g-aiman", email: "rafi.admin@gmail.com", name: "Muhammad Rafi" });
check("returning user goes to ?next", a2.r2.headers.get("location") === "/settings", a2.r2.headers.get("location"));
const me2 = await j(await call("/me", a2.sid));
check("returning user keeps edited username", me2.username === "rafi");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
