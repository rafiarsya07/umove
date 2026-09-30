// Runner face photos. Fresh database with ADMIN_EMAILS=admin@x.com, and DATABASE_URL_ADMIN (superuser) set.
import postgres from "postgres";
import { apply, JPEG } from "./apply-helper.mjs";
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
const raw = (path, sid) => fetch(`${BASE}/api${path}`, { headers: { cookie: sid ?? "" } });
const upload = (sid, blob = JPEG) => {
  const fd = new FormData();
  fd.set("photo", new Blob([blob], { type: "image/jpeg" }), "me.jpg");
  return fetch(`${BASE}/api/me/photo`, { method: "POST", headers: { cookie: sid ?? "", origin: BASE }, body: fd })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
};

const A = await signIn("a", "admin@x.com", "Ali Admin");
const R = await signIn("r", "r@x.com", "Rina Runner");
const S = await signIn("s", "s@x.com", "Sam Runner");
const C = await signIn("c", "c@x.com", "Caca Customer");
const X = await signIn("x", "x@x.com", "Xena Other");
await profile(R, "rina", "0111111111"); await profile(S, "sam", "0122222222");
await profile(C, "caca", "0133333333"); await profile(X, "xena", "0144444444");

// --- selfie is part of the runner application
check("runner application without face photo rejected", (await apply(R, "runner", undefined, { files: [] })).body?.fields?.includes("selfie"));
check("runner application with selfie", (await apply(R, "runner")).status === 200);
await apply(S, "runner");
check("stats count pending applications", (await call("/admin/stats", A)).body.pending === 2);
for (const a of (await call("/admin/applications", A)).body) await call(`/admin/applications/${a.id}/decision`, A, "POST", { decision: "approve" });
let st = (await call("/me/photo", R)).body;
check("approval adopts the selfie as the photo", st.approved === true && st.pending === false, JSON.stringify(st));
check("runner can view own photo", (await raw("/me/photo/approved", R)).status === 200);

// --- a runner without a photo cannot take requests
await db`delete from profile_photos where user_id = (select id from users where username = 'sam')`;
let r = await call("/requests", C, "POST", { details: "Nasi lemak 1", pickup: "Kafe KK12", dropoff: "KK8 C 2-14", tip: 3 });
const code = r.body.code;
let d = (await call(`/requests/${code}`, S)).body;
check("detail tells a runner without photo", d.canAccept === true && d.needsPhoto === true);
check("accept without photo = need_photo", (await call(`/requests/${code}/accept`, S, "POST")).body?.error === "need_photo");

// --- sending a new photo
check("non-runner cannot send a photo", (await upload(X)).status === 403);
check("not an image rejected", (await upload(S, new Uint8Array(300).fill(65))).status === 400);
const big = new Uint8Array(900_000).fill(7); big.set([0xff, 0xd8, 0xff, 0xe0]);
check("a normal-size phone photo (900 KB) uploads", (await upload(S, big)).status === 201);
check("over 3 MB rejected", [400, 413].includes((await upload(S, new Uint8Array(3_100_000).fill(0xff))).status));
r = await upload(S);
check("runner sends photo, pending", r.status === 201 && r.body.pending === true && r.body.approved === false);
check("still cannot accept while pending", (await call(`/requests/${code}/accept`, S, "POST")).body?.error === "need_photo");
let list = (await call("/admin/photos", A)).body;
check("admin sees pending photo", list.length === 1 && list[0].username === "sam");
check("stats pending includes photos", (await call("/admin/stats", A)).body.photosPending === 1);
check("member cannot list photos", (await call("/admin/photos", X)).status === 403);
check("admin views pending photo", (await raw(`/admin/photos/${list[0].userId}/pending`, A)).status === 200);
check("reject needs a reason", (await call(`/admin/photos/${list[0].userId}/decision`, A, "POST", { decision: "reject" })).status === 400);
check("admin rejects with reason", (await call(`/admin/photos/${list[0].userId}/decision`, A, "POST", { decision: "reject", reason: "Face not visible, please retake" })).status === 200);
st = (await call("/me/photo", S)).body;
check("runner sees the reason", st.pending === false && st.approved === false && st.reason === "Face not visible, please retake");
await upload(S);
check("admin approves new photo", (await call(`/admin/photos/${list[0].userId}/decision`, A, "POST", { decision: "approve" })).status === 200);
check("decide twice = 409", (await call(`/admin/photos/${list[0].userId}/decision`, A, "POST", { decision: "approve" })).status === 409);
check("reason cleared after approval", (await call("/me/photo", S)).body.reason === null);

// --- who sees the runner's face
check("before accept: no runner photo", (await raw(`/requests/${code}/runner-photo`, C)).status === 404);
check("accept with photo", (await call(`/requests/${code}/accept`, S, "POST")).status === 200);
d = (await call(`/requests/${code}`, C)).body;
check("customer sees runner card", d.runner.hasPhoto === true && d.runner.vehicle === "bicycle" && d.runner.runs === 0, JSON.stringify(d.runner));
const img = await raw(`/requests/${code}/runner-photo`, C);
check("customer gets the photo", img.status === 200 && img.headers.get("content-type") === "image/jpeg" && img.headers.get("cache-control").includes("no-store"));
check("photo is sandboxed", (img.headers.get("content-security-policy") ?? "").includes("sandbox"));
check("stranger cannot get the photo", (await raw(`/requests/${code}/runner-photo`, X)).status === 404);
check("signed-out cannot get the photo", (await raw(`/requests/${code}/runner-photo`, null)).status === 401);
check("runner is not the customer", (await raw(`/requests/${code}/runner-photo`, S)).status === 404);
d = (await call(`/requests/${code}`, S)).body;
check("runner view has no runner card extras", d.runner.hasPhoto === undefined);
check("photo not on the public profile", !JSON.stringify((await call("/users/sam", null)).body).includes("hasPhoto"));
const audit = JSON.stringify((await call("/admin/audit", A)).body);
check("audited", audit.includes("photo.submit") && audit.includes("photo.reject") && audit.includes("photo.approve"));

await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
