import { Hono } from "hono";
import { announceSupport } from "../../live.js";
import { mailNewApplication, mailNewPhoto, mailSupportToAdmins } from "../../mail.js";
import { myLatest, postMessage, startThread, unreadForMember, withdraw } from "../../repo/support.js";
import { myApplications, submitApplication, withdrawApplication, type Upload } from "../../repo/applications.js";
import { getMe, updateProfile } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";
import {
  driverApplicationSchema,
  normalisePhone,
  profileSchema,
  REQUIRED_FILES,
  roleParam,
  runnerApplicationSchema,
  supportSchema,
  supportStartSchema,
} from "../../validation.js";
import { requireUser } from "../guards.js";
import { notifyAdmins, notifyAdminsThrottled, short } from "../../notify.js";
import { SANDBOX_HEADER } from "../security.js";
import { myPhotoStatus, ownPhoto, submitPhoto } from "../../repo/photos.js";

/** The signed-in user's own account. Every query is keyed by the session. */
export const me = new Hono<AppEnv>();
me.use("*", requireUser);

me.get("/", async (c) => {
  const user = c.get("user")!;
  const data = await getMe(user.id);
  if (!data) return c.json({ error: "unauthorized" }, 401);
  return c.json({ ...data, isAdmin: user.isAdmin });
});

me.patch("/", async (c) => {
  const user = c.get("user")!;
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }
  const whatsapp = normalisePhone(parsed.data.whatsapp);
  if (whatsapp === "invalid") return c.json({ error: "invalid", fields: ["whatsapp"] }, 400);

  const result = await updateProfile(user.id, { ...parsed.data, whatsapp });
  if (!result.ok) {
    const field = result.error === "phone_taken" ? "whatsapp" : result.error === "name_locked" ? "name" : "username";
    return c.json(
      { error: result.error, fields: [field], until: result.error === "username_cooldown" ? result.until : null },
      409,
    );
  }
  return c.json(await getMe(user.id));
});

me.get("/applications", async (c) => c.json(await myApplications(c.get("user")!.id)));

export const MAX_PHOTO_BYTES = 3_000_000;

/** Recognise the image by its first bytes; the browser's declared type is not trusted. */
function sniffImage(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  )
    return "image/webp";
  return null;
}

/**
 * Apply for a role: multipart form with `details` (JSON) and one photo per
 * required document (field name = document kind).
 */
me.post("/roles/:role", async (c) => {
  const role = roleParam.safeParse(c.req.param("role"));
  if (!role.success) return c.json({ error: "not_found" }, 404);
  const user = c.get("user")!;

  const form = await c.req.parseBody({ all: false }).catch(() => null);
  if (!form || typeof form.details !== "string") return c.json({ error: "invalid", fields: ["details"] }, 400);

  let raw: unknown;
  try {
    raw = JSON.parse(form.details);
  } catch {
    return c.json({ error: "invalid", fields: ["details"] }, 400);
  }
  const schema = role.data === "driver" ? driverApplicationSchema : runnerApplicationSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }

  const needed = REQUIRED_FILES[role.data];
  const extra = Object.keys(form).filter((k) => k !== "details" && !(needed as readonly string[]).includes(k));
  if (extra.length) return c.json({ error: "invalid", fields: extra }, 400);

  const files: Upload[] = [];
  const bad: string[] = [];
  for (const kind of needed) {
    const f = form[kind];
    if (!(f instanceof File) || f.size < 100 || f.size > MAX_PHOTO_BYTES) {
      bad.push(kind);
      continue;
    }
    const data = new Uint8Array(await f.arrayBuffer());
    const mime = sniffImage(data);
    if (!mime) bad.push(kind);
    else files.push({ kind, mime, data });
  }
  if (bad.length) return c.json({ error: "invalid_photo", fields: bad }, 400);

  const result = await submitApplication(user.id, role.data, parsed.data as Record<string, unknown>, files);
  if (!result.ok) {
    const status = result.error === "cooldown" || result.error === "too_many" ? 429 : 409;
    return c.json({ error: result.error, until: result.until ?? null }, status);
  }
  mailNewApplication(role.data, result.name, result.username);
  notifyAdmins(`Pendaftar ${role.data} baru: ${result.name} (@${result.username}). Tinjau dalam 24 jam.`, "/admin/applications");
  return c.json({ ok: true, id: result.id });
});

me.delete("/roles/:role", async (c) => {
  const role = roleParam.safeParse(c.req.param("role"));
  if (!role.success) return c.json({ error: "not_found" }, 404);
  const ok = await withdrawApplication(c.get("user")!.id, role.data);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_pending" }, 409);
});

/* ---- Face photo (runners and drivers) ---------------------------------------- */

me.get("/photo", async (c) => c.json(await myPhotoStatus(c.get("user")!.id)));

/** My own photo: `approved` (in use) or `pending` (waiting for review). */
me.get("/photo/:which", async (c) => {
  const which = c.req.param("which");
  if (which !== "approved" && which !== "pending") return c.json({ error: "not_found" }, 404);
  const p = await ownPhoto(c.get("user")!.id, which);
  if (!p) return c.json({ error: "not_found" }, 404);
  return c.body(new Uint8Array(p.data), 200, {
    "Content-Type": p.mime,
    "Content-Disposition": "inline",
    [SANDBOX_HEADER]: "1",
    "Cache-Control": "private, no-store",
  });
});

/** Send a new face photo (multipart field `photo`); an admin reviews it. */
me.post("/photo", async (c) => {
  const form = await c.req.parseBody({ all: false }).catch(() => null);
  const f = form?.photo;
  if (!(f instanceof File) || f.size < 100 || f.size > MAX_PHOTO_BYTES) {
    return c.json({ error: "invalid_photo", fields: ["photo"] }, 400);
  }
  const data = new Uint8Array(await f.arrayBuffer());
  const mime = sniffImage(data);
  if (!mime) return c.json({ error: "invalid_photo", fields: ["photo"] }, 400);
  const r = await submitPhoto(c.get("user")!.id, mime, data);
  if (!r.ok) return c.json({ error: r.error }, r.error === "too_many" ? 429 : 403);
  mailNewPhoto();
  notifyAdmins("Foto wajah runner baru menunggu dicek.", "/admin/applications?tab=photos");
  return c.json(await myPhotoStatus(c.get("user")!.id), 201);
});

/* ---- Help chat (reviewed by an admin before it opens) ----------------------- */

me.get("/support", async (c) => c.json(await myLatest(c.get("user")!.id)));

me.get("/support/unread", async (c) => c.json({ unread: await unreadForMember(c.get("user")!.id) }));

/** Send a help request; it stays "under review" until an admin opens it. */
me.post("/support/threads", async (c) => {
  const user = c.get("user")!;
  const parsed = supportStartSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }
  const { topic, orderCode, body } = parsed.data;
  const r = await startThread(user.id, topic, orderCode || null, body);
  if (!r.ok) return c.json({ error: r.error }, r.error === "too_many" ? 429 : 409);
  announceSupport(user.id);
  const me = await getMe(user.id);
  if (me) {
    mailSupportToAdmins(me.name, me.username, topic, body);
    notifyAdmins(`Help chat baru dari ${me.name} (@${me.username}), topik ${topic}:\n${short(body, 140)}`, "/admin/support");
  }
  return c.json(r.thread, 201);
});

/** Withdraw a request that is still under review. */
me.delete("/support/threads/current", async (c) => {
  const ok = await withdraw(c.get("user")!.id);
  if (!ok) return c.json({ error: "not_pending" }, 409);
  announceSupport(c.get("user")!.id);
  return c.json({ ok: true });
});

/** A message in my open chat. */
me.post("/support", async (c) => {
  const user = c.get("user")!;
  const parsed = supportSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", fields: ["body"] }, 400);
  const r = await postMessage({ member: user.id }, parsed.data.body);
  if (!r.ok) return c.json({ error: r.error }, r.error === "too_fast" ? 429 : 409);
  announceSupport(user.id);
  // One alert per member per 10 minutes, so a lively chat doesn't flood the admin's phone.
  notifyAdminsThrottled(`chat:${user.id}`, 10 * 60_000, `Pesan baru di help chat: ${short(parsed.data.body, 140)}`, "/admin/support?tab=open");
  return c.json(r.message, 201);
});
