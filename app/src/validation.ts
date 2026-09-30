import { z } from "zod";

/**
 * Every input from the browser is parsed with a strict schema: unknown
 * fields are rejected, and nothing here can carry a user id, role, status
 * or admin flag. Those come from the session only.
 */
export const USERNAME = /^[a-z0-9_]{3,24}$/;

/** Normalise a phone number to E.164. Malaysian numbers may omit +60. */
export function normalisePhone(input: string): string | null {
  const raw = input.replace(/[\s()-]/g, "");
  if (raw === "") return null;
  let e164: string;
  if (raw.startsWith("+")) e164 = raw;
  else if (raw.startsWith("00")) e164 = `+${raw.slice(2)}`;
  else if (raw.startsWith("60")) e164 = `+${raw}`;
  else if (raw.startsWith("0")) e164 = `+60${raw.slice(1)}`;
  else e164 = `+60${raw}`;
  return /^\+[1-9][0-9]{7,14}$/.test(e164) ? e164 : "invalid";
}

const text = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim());

export const profileSchema = z
  .object({
    name: text(40).pipe(z.string().min(1)),
    username: z.string().toLowerCase().regex(USERNAME),
    whatsapp: z.string().max(20),
    college: text(40),
    bio: text(160),
  })
  .strict();

export const roleParam = z.enum(["runner", "driver"]);
export type ApplyRole = z.infer<typeof roleParam>;

/** Photos each role must upload with its application. */
export const REQUIRED_FILES = {
  runner: ["matric_card"],
  driver: ["matric_card", "license", "vehicle", "selfie"],
} as const;
export type FileKind = (typeof REQUIRED_FILES)["driver"][number];
export const fileKindParam = z.enum(["matric_card", "license", "vehicle", "selfie"]);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const daysFromToday = (iso: string) => {
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return (Date.parse(iso + "T00:00:00Z") - today) / 86_400_000;
};

const identity = {
  /** Full name exactly as on the matric card. */
  fullName: text(60).pipe(z.string().min(3)),
  matricNo: z
    .string()
    .max(20)
    .transform((s) => s.replace(/\s/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9/-]{5,20}$/)),
  faculty: text(60).pipe(z.string().min(2)),
  agree: z.literal(true),
};

export const runnerApplicationSchema = z.object(identity).strict();

export const driverApplicationSchema = z
  .object({
    ...identity,
    licenseClass: z.enum(["B2", "B", "D", "DA"]),
    licenseType: z.enum(["competent", "probationary"]),
    licenseExpiry: isoDate,
    vehicleType: z.enum(["car", "motorcycle"]),
    vehicleModel: text(40).pipe(z.string().min(2)),
    vehicleColor: text(20).pipe(z.string().min(2)),
    plate: z
      .string()
      .max(12)
      .transform((s) => s.replace(/\s/g, "").toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9]{2,10}$/)),
    seats: z.number().int().min(1).max(7),
    roadTaxExpiry: isoDate,
    insured: z.literal(true),
  })
  .strict()
  .superRefine((d, ctx) => {
    // Licence must still be valid for at least 30 days, road tax must be current.
    if (!(daysFromToday(d.licenseExpiry) >= 30)) ctx.addIssue({ code: "custom", path: ["licenseExpiry"], message: "expiring" });
    if (!(daysFromToday(d.roadTaxExpiry) >= 0)) ctx.addIssue({ code: "custom", path: ["roadTaxExpiry"], message: "expired" });
    const bike = d.vehicleType === "motorcycle";
    if (bike !== (d.licenseClass === "B" || d.licenseClass === "B2")) {
      ctx.addIssue({ code: "custom", path: ["licenseClass"], message: "does not match vehicle" });
    }
    if (bike && d.seats !== 1) ctx.addIssue({ code: "custom", path: ["seats"], message: "a motorcycle takes one passenger" });
  });

export const decisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    /** Shown to the applicant; required when rejecting. */
    reason: text(300).optional(),
  })
  .strict()
  .refine((d) => d.decision === "approve" || (d.reason?.length ?? 0) >= 5, { path: ["reason"] });

export const requestSchema = z
  .object({
    details: text(300).pipe(z.string().min(2)),
    pickup: text(80).pipe(z.string().min(2)),
    dropoff: text(80).pipe(z.string().min(2)),
    /** Tip in ringgit, e.g. 3 or 2.50. Stored as sen. */
    tip: z.number().min(0).max(100),
  })
  .strict();

export const statusSchema = z.object({ status: z.enum(["on_the_way", "delivered"]) }).strict();

export const rateSchema = z
  .object({
    stars: z.number().int().min(1).max(5),
    body: text(300),
  })
  .strict();

export const idParam = z.coerce
  .number()
  .int()
  .positive()
  .max(2 ** 53);
