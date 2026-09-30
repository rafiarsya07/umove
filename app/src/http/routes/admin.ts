import { Hono } from "hono";
import { z } from "zod";
import { config } from "../../config.js";
import { announceChange } from "../../live.js";
import { adminCancelRequest, adminStats, auditLog, listRequests, listUsers, setUserStatus } from "../../repo/admin.js";
import { decideApplication, pendingApplications } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";
import { decisionSchema, idParam, roleParam } from "../../validation.js";
import { requireAdmin } from "../guards.js";

/** Admin area. Admins come from ADMIN_EMAILS only; every change is audited. */
export const admin = new Hono<AppEnv>();
admin.use("*", requireAdmin);

admin.get("/stats", async (c) => c.json(await adminStats()));

admin.get("/applications", async (c) => c.json(await pendingApplications()));

admin.post("/applications/:userId/:role", async (c) => {
  const userId = z.uuid().safeParse(c.req.param("userId"));
  const role = roleParam.safeParse(c.req.param("role"));
  const body = decisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!userId.success || !role.success || !body.success) return c.json({ error: "invalid" }, 400);
  const ok = await decideApplication(c.get("user")!.id, userId.data, role.data, body.data.decision);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_pending" }, 409);
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
