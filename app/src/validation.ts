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

export const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]) }).strict();

export const roleParam = z.enum(["runner"]);

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
