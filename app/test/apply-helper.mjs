// Builds role-application uploads for the tests: a tiny valid JPEG and form data.
export const BASE = "http://localhost:3222";
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(200).fill(7)]);
const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export const runnerDetails = (o = {}) => ({ fullName: "Budi Santoso", matricNo: "u2102345", faculty: "FSKTM", vehicle: "bicycle", agree: true, ...o });
export const driverDetails = (o = {}) => ({
  fullName: "Citra Dewi", matricNo: "S2123456/1", faculty: "Engineering", agree: true,
  licenseClass: "DA", licenseType: "competent", licenseExpiry: day(400),
  vehicleType: "car", vehicleModel: "Perodua Myvi", vehicleColor: "White", plate: "wxy 1234", seats: 4,
  roadTaxExpiry: day(100), insured: true, ...o,
});
const FILES = { runner: ["matric_card", "selfie"], driver: ["matric_card", "license", "vehicle", "selfie"] };

export async function apply(sid, role, details, { files = FILES[role] ?? [], blob = JPEG, extra } = {}) {
  const fd = new FormData();
  fd.set("details", JSON.stringify(details ?? (role === "driver" ? driverDetails() : runnerDetails())));
  for (const k of files) fd.set(k, new Blob([blob], { type: "image/jpeg" }), `${k}.jpg`);
  if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  const r = await fetch(`${BASE}/api/me/roles/${role}`, { method: "POST", headers: { cookie: sid ?? "", origin: BASE }, body: fd });
  return { status: r.status, body: await r.json().catch(() => null) };
}
