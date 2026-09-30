import { type Context, Hono } from "hono";
import { z } from "zod";
import { config } from "../../config.js";
import { announceChange } from "../../live.js";
import { adminCancelRequest, adminStats, auditLog, listRequests, listUsers, setUserStatus } from "../../repo/admin.js";
import { announceSite, announceSupport } from "../../live.js";
import { allPlaces, savePlace } from "../../repo/places.js";
import { adminRename } from "../../repo/users.js";
import { adminPhoto, decidePhoto, pendingPhotos } from "../../repo/photos.js";
import { allBroadcasts, createBroadcast, endBroadcast, maintenance, setMaintenance } from "../../repo/site.js";
import { mailDecision, mailSupportDecision, mailSupportReply } from "../../mail.js";
import { adminThread, closeThread, decide, inbox, postMessage } from "../../repo/support.js";
import { applicationFile, decideApplication, listApplications } from "../../repo/applications.js";
import type { AppEnv } from "../../types.js";
import {
  broadcastSchema,
  decisionSchema,
  fileKindParam,
  idParam,
  maintenanceSchema,
  placeSchema,
  renameSchema,
  supportDecisionSchema,
  supportSchema,
} from "../../validation.js";
import { requireAdmin } from "../guards.js";
import { SANDBOX_HEADER } from "../security.js";

/** Admin area. Admins come from ADMIN_EMAILS only; every change is audited. */
export const admin = new Hono<AppEnv>();
admin.use("*", requireAdmin);

admin.get("/stats", async (c) => c.json(await adminStats()));

admin.get("/applications", async (c) => {
  const status = z.enum(["pending", "approved", "rejected"]).catch("pending").parse(c.req.query("status"));
  return c.json(await listApplications(status));
});

/** A document photo. Served only to admins, never cached, never run as a page. */
admin.get("/applications/:id/files/:kind", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const kind = fileKindParam.safeParse(c.req.param("kind"));
  if (!id.success || !kind.success) return c.json({ error: "not_found" }, 404);
  const file = await applicationFile(id.data, kind.data);
  if (!file) return c.json({ error: "not_found" }, 404);
  return c.body(new Uint8Array(file.data), 200, {
    "Content-Type": file.mime,
    "Content-Disposition": "inline",
    [SANDBOX_HEADER]: "1",
    "Cache-Control": "private, no-store",
  });
});

admin.post("/applications/:id/decision", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const body = decisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  if (!body.success) return c.json({ error: "invalid", fields: ["reason"] }, 400);
  const reason = body.data.reason ? body.data.reason : null;
  const r = await decideApplication(c.get("user")!.id, id.data, body.data.decision, reason);
  if (!r.ok) return c.json({ error: "not_pending" }, 409);
  mailDecision(r.email, r.name, r.role, body.data.decision, reason);
  return c.json({ ok: true });
});

admin.get("/users", async (c) => {
  const q = z
    .string()
    .max(60)
    .catch("")
    .parse(c.req.query("q") ?? "")
    .trim();
  return c.json(await listUsers(q));
});

admin.post("/users/:id/status", async (c) => {
  const id = z.uuid().safeParse(c.req.param("id"));
  const body = z
    .object({ status: z.enum(["active", "suspended"]) })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json({ error: "invalid" }, 400);
  const result = await setUserStatus(c.get("user")!.id, id.data, body.data.status, config.adminEmails);
  if (result === "ok") {
    announceChange();
    return c.json({ ok: true });
  }
  return c.json({ error: result }, result === "not_found" ? 404 : 409);
});

const STATUSES = ["open", "accepted", "on_the_way", "delivered", "cancelled"] as const;

admin.get("/requests", async (c) => {
  const status = z
    .enum(STATUSES)
    .nullable()
    .catch(null)
    .parse(c.req.query("status") ?? null);
  return c.json(await listRequests(status));
});

admin.post("/requests/:id/cancel", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const ok = await adminCancelRequest(c.get("user")!.id, id.data);
  if (!ok) return c.json({ error: "not_allowed" }, 409);
  announceChange();
  return c.json({ ok: true });
});

admin.get("/audit", async (c) => c.json(await auditLog()));

/* ---- Help chat: review requests, chat, close --------------------------------- */

admin.get("/support", async (c) => {
  const status = z.enum(["pending", "open", "closed"]).catch("pending").parse(c.req.query("status"));
  return c.json(await inbox(status));
});

admin.get("/support/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const t = await adminThread(id.data);
  if (!t) return c.json({ error: "not_found" }, 404);
  announceSupport(t.member.userId);
  return c.json(t);
});

admin.post("/support/:id/decision", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const body = supportDecisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  if (!body.success) return c.json({ error: "invalid", fields: ["reason"] }, 400);
  const reason = body.data.reason || null;
  const r = await decide(c.get("user")!.id, id.data, body.data.decision, reason);
  if (!r.ok) return c.json({ error: "not_pending" }, 409);
  announceSupport(r.userId);
  mailSupportDecision(r.email, r.name, body.data.decision, reason);
  return c.json({ ok: true });
});

admin.post("/support/:id/close", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const userId = await closeThread(c.get("user")!.id, id.data);
  if (!userId) return c.json({ error: "not_open" }, 409);
  announceSupport(userId);
  return c.json({ ok: true });
});

admin.post("/support/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  const parsed = supportSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  if (!parsed.success) return c.json({ error: "invalid", fields: ["body"] }, 400);
  const r = await postMessage({ admin: c.get("user")!.id, threadId: id.data }, parsed.data.body);
  if (!r.ok) return c.json({ error: r.error }, r.error === "not_found" ? 404 : 409);
  announceSupport(r.userId);
  // One e-mail per burst of replies: only if the member hasn't had one in the last 30 minutes.
  if (r.lastAdminReplyAgoMin === null || r.lastAdminReplyAgoMin > 30) {
    const t = await adminThread(id.data);
    if (t) mailSupportReply(t.member.email, t.member.name);
  }
  return c.json(r.message, 201);
});

/* ---- Broadcasts ------------------------------------------------------------ */

admin.get("/broadcasts", async (c) => c.json(await allBroadcasts()));

admin.post("/broadcasts", async (c) => {
  const parsed = broadcastSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }
  const b = parsed.data;
  const id = await createBroadcast(c.get("user")!.id, {
    title: b.title,
    body: b.body,
    tone: b.tone,
    audience: b.audience,
    linkPath: b.linkPath || null,
    startsAt: b.startsAt ? new Date(b.startsAt) : null,
    endsAt: b.endsAt ? new Date(b.endsAt) : null,
  });
  announceSite();
  return c.json({ id }, 201);
});

admin.post("/broadcasts/:id/end", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const ok = await endBroadcast(c.get("user")!.id, id.data);
  if (!ok) return c.json({ error: "not_live" }, 409);
  announceSite();
  return c.json({ ok: true });
});

/** Rename a member (approved runners can't rename themselves). */
admin.post("/users/:id/name", async (c) => {
  const id = z.uuid().safeParse(c.req.param("id"));
  const body = renameSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  if (!body.success) return c.json({ error: "invalid", fields: ["name"] }, 400);
  const ok = await adminRename(c.get("user")!.id, id.data, body.data.name);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_found" }, 404);
});

/* ---- Runner face photos ------------------------------------------------------ */

admin.get("/photos", async (c) => c.json(await pendingPhotos()));

admin.get("/photos/:userId/:which", async (c) => {
  const userId = z.uuid().safeParse(c.req.param("userId"));
  const which = c.req.param("which");
  if (!userId.success || (which !== "approved" && which !== "pending")) return c.json({ error: "not_found" }, 404);
  const p = await adminPhoto(userId.data, which);
  if (!p) return c.json({ error: "not_found" }, 404);
  return c.body(new Uint8Array(p.data), 200, {
    "Content-Type": p.mime,
    "Content-Disposition": "inline",
    [SANDBOX_HEADER]: "1",
    "Cache-Control": "private, no-store",
  });
});

admin.post("/photos/:userId/decision", async (c) => {
  const userId = z.uuid().safeParse(c.req.param("userId"));
  if (!userId.success) return c.json({ error: "not_found" }, 404);
  const parsed = decisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", fields: ["reason"] }, 400);
  const ok = await decidePhoto(c.get("user")!.id, userId.data, parsed.data.decision, parsed.data.reason || null);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_pending" }, 409);
});

/* ---- Pickup places --------------------------------------------------------- */

admin.get("/places", async (c) => c.json(await allPlaces()));

const savePlaceRoute = async (c: Context<AppEnv>, id?: number) => {
  const parsed = placeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }
  const r = await savePlace(c.get("user")!.id, { ...parsed.data, id });
  if (!r.ok) return c.json({ error: r.error }, r.error === "not_found" ? 404 : 409);
  return c.json({ id: r.id }, id === undefined ? 201 : 200);
};

admin.post("/places", (c) => savePlaceRoute(c));

admin.post("/places/:id", async (c) => {
  const id = idParam.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  return savePlaceRoute(c, id.data);
});

/* ---- Maintenance ----------------------------------------------------------- */

admin.get("/maintenance", async (c) => c.json(await maintenance()));

admin.post("/maintenance", async (c) => {
  const parsed = maintenanceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid", fields: ["message"] }, 400);
  const { on, message, until } = parsed.data;
  const m = await setMaintenance(c.get("user")!.id, {
    on,
    message: on ? message || null : null,
    until: on && until ? new Date(until).toISOString() : null,
  });
  announceSite();
  return c.json(m);
});
