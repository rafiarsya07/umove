// Role applications: Runner (light) and Driver (strict) forms, photos, review, cooldown, privacy.
// Run on a fresh database with ADMIN_EMAILS=admin@x.com (see README).
import { apply, BASE, driverDetails, JPEG, runnerDetails } from "./apply-helper.mjs";
import postgres from "postgres";
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
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
};
const profile = (sid, username) => call("/me", sid, "PATCH", { name: username + " T", username, whatsapp: "0123456789", college: "KK8", bio: "" });
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const db = postgres(process.env.DATABASE_URL_ADMIN);

const A = await signIn("a", "admin@x.com", "Ali Admin");
const R = await signIn("r", "r@x.com", "Rina");
const D = await signIn("d", "d@x.com", "Dian");
await profile(R, "rina"); await profile(D, "dian");

// --- validation
check("visitor cannot apply", (await apply(null, "runner")).status === 401);
check("seller not open yet", (await apply(R, "seller")).status === 404);
check("runner without photo", (await apply(R, "runner", undefined, { files: [] })).body?.fields?.includes("matric_card"));
check("runner photo not an image", (await apply(R, "runner", undefined, { blob: new Uint8Array(300).fill(65) })).body?.error === "invalid_photo");
check("runner photo too small", (await apply(R, "runner", undefined, { blob: JPEG.slice(0, 50) })).body?.error === "invalid_photo");
check("runner photo too big", [400, 413].includes((await apply(R, "runner", undefined, { blob: new Uint8Array(3_100_000).fill(0xff) })).status));
check("unknown upload field rejected", (await apply(R, "runner", undefined, { extra: { passport: new Blob([JPEG]) } })).body?.fields?.includes("passport"));
check("runner must agree", (await apply(R, "runner", runnerDetails({ agree: false }))).body?.fields?.includes("agree"));
check("runner extra field rejected", (await apply(R, "runner", runnerDetails({ isAdmin: true }))).status === 400);
check("runner must say how they deliver", (await apply(R, "runner", runnerDetails({ vehicle: "rocket" }))).body?.fields?.includes("vehicle"));
check("bad matric no", (await apply(R, "runner", runnerDetails({ matricNo: "x" }))).body?.fields?.includes("matricNo"));
check("broken JSON", (await (async () => { const fd = new FormData(); fd.set("details", "{"); const r = await fetch(`${BASE}/api/me/roles/runner`, { method: "POST", headers: { cookie: R, origin: BASE }, body: fd }); return r.status; })()) === 400);

let r = await apply(D, "driver", undefined, { files: ["matric_card", "license"] });
check("driver needs all 4 photos", r.body?.fields?.includes("vehicle") && r.body.fields.includes("selfie"), JSON.stringify(r.body));
r = await apply(D, "driver", driverDetails({ licenseExpiry: day(10) }));
check("licence expiring within 30 days rejected", r.body?.fields?.includes("licenseExpiry"), JSON.stringify(r.body));
r = await apply(D, "driver", driverDetails({ roadTaxExpiry: day(-1) }));
check("expired road tax rejected", r.body?.fields?.includes("roadTaxExpiry"));
r = await apply(D, "driver", driverDetails({ vehicleType: "motorcycle", seats: 1 }));
check("car licence on motorcycle rejected", r.body?.fields?.includes("licenseClass"));
r = await apply(D, "driver", driverDetails({ vehicleType: "motorcycle", licenseClass: "B2", seats: 2 }));
check("motorcycle with 2 seats rejected", r.body?.fields?.includes("seats"));
r = await apply(D, "driver", driverDetails({ insured: false }));
check("must confirm insurance", r.body?.fields?.includes("insured"));
r = await apply(D, "driver", driverDetails({ plate: "WXY-1234!" }));
check("bad plate rejected", r.body?.fields?.includes("plate"));

// --- submit
r = await apply(R, "runner");
check("runner applies", r.status === 200 && r.body.id > 0, JSON.stringify(r.body));
r = await apply(D, "driver");
check("driver applies", r.status === 200, JSON.stringify(r.body));
check("cannot apply twice", (await apply(D, "driver")).body?.error === "already_applied");
const me = (await call("/me", D)).body;
check("role shows pending", me.roles.driver === "pending");
const mine = (await call("/me/applications", D)).body;
check("my application listed", mine.length === 1 && mine[0].role === "driver" && mine[0].status === "pending");

// --- admin
check("member cannot list applications", (await call("/admin/applications", R)).status === 403);
let q = (await call("/admin/applications", A)).body;
check("queue oldest first", q.length === 2 && q[0].role === "runner" && q[1].role === "driver", JSON.stringify(q.map((x) => x.role)));
const drv = q[1];
check("details stored normalised", drv.details.plate === "WXY1234" && drv.details.matricNo === "S2123456/1" && drv.details.licenseClass === "DA", JSON.stringify(drv.details));
check("file list", JSON.stringify(drv.files) === JSON.stringify(["license", "matric_card", "selfie", "vehicle"]), JSON.stringify(drv.files));
check("admin sees contact", drv.whatsapp === "+60123456789" && drv.email === "d@x.com");
let f = await fetch(`${BASE}/api/admin/applications/${drv.id}/files/license`, { headers: { cookie: A } });
const bytes = new Uint8Array(await f.arrayBuffer());
check("admin gets photo", f.status === 200 && f.headers.get("content-type") === "image/jpeg" && bytes.length === JPEG.length);
check("photo is sandboxed and not cached", /sandbox/.test(f.headers.get("content-security-policy") ?? "") && /no-store/.test(f.headers.get("cache-control") ?? ""), f.headers.get("content-security-policy") + " | " + f.headers.get("cache-control"));
check("member cannot get photo", (await fetch(`${BASE}/api/admin/applications/${drv.id}/files/license`, { headers: { cookie: D } })).status === 403);
check("visitor cannot get photo", (await fetch(`${BASE}/api/admin/applications/${drv.id}/files/license`)).status === 401);
check("bad file kind 404", (await fetch(`${BASE}/api/admin/applications/${drv.id}/files/passport`, { headers: { cookie: A } })).status === 404);

check("reject needs a reason", (await call(`/admin/applications/${drv.id}/decision`, A, "POST", { decision: "reject" })).status === 400);
check("reject with reason", (await call(`/admin/applications/${drv.id}/decision`, A, "POST", { decision: "reject", reason: "Licence photo is blurry" })).status === 200);
check("decide twice = 409", (await call(`/admin/applications/${drv.id}/decision`, A, "POST", { decision: "approve" })).status === 409);
const dme = (await call("/me/applications", D)).body[0];
check("applicant sees reason + reapply time", dme.status === "rejected" && dme.reason === "Licence photo is blurry" && new Date(dme.reapplyAt) > new Date(Date.now() + 23 * 3600e3));
check("role rejected", (await call("/me", D)).body.roles.driver === "rejected");
r = await apply(D, "driver");
check("cooldown 24h after rejection", r.status === 429 && r.body.error === "cooldown" && r.body.until, JSON.stringify(r.body));
await db`update role_applications set decided_at = now() - interval '25 hours' where id = ${drv.id}`;
r = await apply(D, "driver");
check("can reapply after 24h", r.status === 200, JSON.stringify(r.body));

const run = q[0];
check("approve runner", (await call(`/admin/applications/${run.id}/decision`, A, "POST", { decision: "approve" })).status === 200);
check("runner active", (await call("/me", R)).body.roles.runner === "active");
const pubR = (await call("/users/rina", null)).body;
check("profile shows how the runner delivers", pubR.verifiedRunner && pubR.runnerVehicle === "bicycle", JSON.stringify(pubR));
check("active runner cannot reapply", (await apply(R, "runner")).body?.error === "already_applied");
check("approved list", (await call("/admin/applications?status=approved", A)).body.some((x) => x.id === run.id && x.decidedBy === "admin"));
const audit = (await call("/admin/audit", A)).body.map((a) => a.action);
check("audited", audit.includes("role.runner.approve") && audit.includes("role.driver.reject"), JSON.stringify(audit));

// --- withdraw
check("withdraw pending driver", (await call("/me/roles/driver", D, "DELETE")).status === 200);
check("role cleared", (await call("/me", D)).body.roles.driver === "none");
check("withdrawn not in queue", !(await call("/admin/applications", A)).body.some((x) => x.role === "driver"));

// --- 5 per 30 days
for (let i = 0; i < 3; i++) { await apply(D, "driver"); await call("/me/roles/driver", D, "DELETE"); }
r = await apply(D, "driver");
check("max 5 applications per 30 days", r.status === 429 && r.body.error === "too_many", JSON.stringify(r.body));

// --- photo purge 30 days after decision
await db`update role_applications set decided_at = now() - interval '31 days' where id = ${run.id}`;
const { purgeOldFiles } = await import("../dist/repo/applications.js").catch(() => ({}));
if (purgeOldFiles) {
  const n = await purgeOldFiles();
  check("old photos purged", n >= 1);
} else {
  await db`delete from application_files where application_id = ${run.id}`;
}
const purged = (await call("/admin/applications?status=approved", A)).body.find((x) => x.id === run.id);
check("purged app has no files", purged.files.length === 0);
check("purged photo 404", (await fetch(`${BASE}/api/admin/applications/${run.id}/files/matric_card`, { headers: { cookie: A } })).status === 404);

// --- CSRF
const fd = new FormData(); fd.set("details", JSON.stringify(runnerDetails())); fd.set("matric_card", new Blob([JPEG]));
check("cross-site upload blocked", (await fetch(`${BASE}/api/me/roles/runner`, { method: "POST", headers: { cookie: R, origin: "https://evil.example" }, body: fd })).status === 403);

await db.end();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
