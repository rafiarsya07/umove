// Pickup places (UM list). Fresh database with ADMIN_EMAILS=admin@x.com.
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

const A = (await signIn("a", "admin@x.com", "Ali Admin")).sid;
const M = (await signIn("m", "m@x.com", "Mira")).sid;
await call("/me", M, "PATCH", { name: "Mira Tester", username: "mira", whatsapp: "+60123456789", college: "KK8", bio: "" });

// --- public list
let places = (await call("/places", null)).body;
check("public list has seeded cafeterias", places.length === 13 && places.some((p) => p.name === "Kafeteria" && p.area === "KK12"), JSON.stringify(places.slice(0, 2)));
check("public list hides admin fields", !("active" in places[0]) && !("uses" in places[0]));
const kk12 = places.find((p) => p.area === "KK12");

// --- admin CRUD
check("member cannot add a place", (await call("/admin/places", M, "POST", { name: "Evil Mart", area: "KK1", kind: "shop" })).status === 403);
check("bad kind rejected", (await call("/admin/places", A, "POST", { name: "Printer", area: "KK8", kind: "weapons" })).body?.fields?.includes("kind"));
check("short area rejected", (await call("/admin/places", A, "POST", { name: "Printer", area: "K", kind: "print" })).body?.fields?.includes("area"));
let r = await call("/admin/places", A, "POST", { name: "Ayam Gepuk stall", area: "KK12", kind: "food" });
check("admin adds a place", r.status === 201 && r.body.id > 0);
const ayam = r.body.id;
check("duplicate name in same area rejected", (await call("/admin/places", A, "POST", { name: "  ayam gepuk STALL ", area: "kk12", kind: "food" })).body?.error === "duplicate");
check("same name in another area ok", (await call("/admin/places", A, "POST", { name: "Ayam Gepuk stall", area: "KK8", kind: "food" })).status === 201);
places = (await call("/places", null)).body;
check("new place listed publicly", places.some((p) => p.id === ayam));

// --- posting with a listed place
const post = (body) => call("/requests", M, "POST", { details: "Ayam gepuk 1, extra sambal", dropoff: "KK8 Block C, room 12", tip: 3, ...body });
r = await post({ placeId: kk12.id, pickup: "Mid Valley Megamall" });
check("post with placeId", r.status === 201, JSON.stringify(r.body));
let d = (await call(`/requests/${r.body.code}`, M)).body;
check("server uses the listed name, not the typed one", d.pickup === "Kafeteria, KK12" && d.listed === true, JSON.stringify(d));
r = await post({ pickup: "Kedai Mamak near KK4" });
check("typed pickup still allowed", r.status === 201);
d = (await call(`/requests/${r.body.code}`, M)).body;
check("typed pickup not marked listed", d.listed === false && d.pickup === "Kedai Mamak near KK4");
check("no pickup at all rejected", (await post({})).body?.fields?.includes("pickup"));
check("unknown placeId rejected", (await post({ placeId: 99999 })).status === 400);
const board = (await call("/requests", null)).body;
check("board carries listed flag", board.some((b) => b.listed === true) && board.some((b) => b.listed === false));

// --- hide a place
r = await call(`/admin/places/${ayam}`, A, "POST", { name: "Ayam Gepuk stall", area: "KK12", kind: "food", active: false });
check("admin hides a place", r.status === 200);
check("hidden place not public", !(await call("/places", null)).body.some((p) => p.id === ayam));
check("hidden place can't be picked", (await post({ placeId: ayam })).status === 400);
const all = (await call("/admin/places", A)).body;
check("admin sees hidden place with usage", all.some((p) => p.id === ayam && p.active === false && p.uses === 0) && all.find((p) => p.id === kk12.id).uses === 1);
check("edit missing place 404", (await call("/admin/places/99999", A, "POST", { name: "Nope", area: "KK1", kind: "food" })).status === 404);
const audit = (await call("/admin/audit", A)).body;
check("audited", JSON.stringify(audit).includes("place.create") && JSON.stringify(audit).includes("place.update"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
