import { Hono } from "hono";
import { announceChange } from "../../live.js";
import {
  acceptRequest,
  advanceRequest,
  cancelRequest,
  createRequest,
  myRequests,
  openBoard,
  rateRequest,
  raiseTip,
  releaseRequest,
  sendAwayRunner,
  requestForViewer,
} from "../../repo/requests.js";
import type { AppEnv } from "../../types.js";
import { codeParam, raiseTipSchema, rateSchema, requestSchema, statusSchema } from "../../validation.js";
import { requireUser } from "../guards.js";
import { notifyAdmins, short } from "../../notify.js";
import { SANDBOX_HEADER } from "../security.js";
import { runnerPhotoForCustomer } from "../../repo/photos.js";
import { activePlace, placeLabel } from "../../repo/places.js";

/** Delivery requests: the board, posting, taking, status, rating. */
export const requests = new Hono<AppEnv>();

const invalid = (fields: string[]) => ({ error: "invalid", fields });

requests.get("/", async (c) => c.json(await openBoard(50)));

requests.get("/mine", requireUser, async (c) => c.json(await myRequests(c.get("user")!.id)));

requests.post("/", requireUser, async (c) => {
  const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalid([...new Set(parsed.error.issues.map((i) => String(i.path[0])))]), 400);
  const { tip, placeId, pickup, ...rest } = parsed.data;
  // A listed place is looked up here, so its name can't be spoofed; a hidden or unknown one is refused.
  const place = placeId === undefined ? null : await activePlace(placeId);
  if (placeId !== undefined && !place) return c.json(invalid(["pickup"]), 400);
  const result = await createRequest(c.get("user")!.id, {
    ...rest,
    pickup: place ? placeLabel(place) : pickup!,
    placeId: place?.id ?? null,
    tipSen: Math.round(tip * 100),
  });
  if (typeof result === "string") return c.json({ error: result }, 409);
  announceChange();
  const from = place ? placeLabel(place) : pickup!;
  notifyAdmins(
    `Permintaan baru ${result.code}\n${short(rest.details)}\n${short(from, 40)} ke ${short(rest.dropoff, 40)}, upah RM${tip}`,
    `/requests/${result.code}`,
  );
  return c.json(result, 201);
});

requests.get("/:code", async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const r = await requestForViewer(id.data, c.get("user")?.id ?? null);
  return r ? c.json(r) : c.json({ error: "not_found" }, 404);
});

/** The runner's face, for the requester of an order that runner has taken. */
requests.get("/:code/runner-photo", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const p = await runnerPhotoForCustomer(id.data, c.get("user")!.id);
  if (!p) return c.json({ error: "not_found" }, 404);
  return c.body(new Uint8Array(p.data), 200, {
    "Content-Type": p.mime,
    "Content-Disposition": "inline",
    [SANDBOX_HEADER]: "1",
    "Cache-Control": "private, no-store",
  });
});

/** Runs a state change and answers 409 when it did not apply. */
async function change(ok: boolean | string) {
  if (ok === true || ok === "ok") {
    announceChange();
    return { status: 200 as const, body: { ok: true } };
  }
  return { status: 409 as const, body: { error: typeof ok === "string" ? ok : "not_allowed" } };
}

/** The requester raises the delivery fee while the request is still open. */
requests.post("/:code/tip", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  const body = raiseTipSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  if (!body.success) return c.json(invalid(["tip"]), 400);
  const r = await raiseTip(id.data, c.get("user")!.id, Math.round(body.data.tip * 100));
  if (r !== "ok") return c.json({ error: r }, 409);
  announceChange();
  return c.json({ ok: true });
});

/** The requester asks for a different runner (only before the runner sets off). */
requests.post("/:code/replace-runner", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const r = await change(await sendAwayRunner(id.data, c.get("user")!.id));
  return c.json(r.body, r.status);
});

requests.post("/:code/accept", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const r = await change(await acceptRequest(id.data, c.get("user")!.id));
  return c.json(r.body, r.status);
});

requests.post("/:code/status", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  const body = statusSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json(invalid(["status"]), 400);
  const r = await change(await advanceRequest(id.data, c.get("user")!.id, body.data.status));
  return c.json(r.body, r.status);
});

requests.post("/:code/release", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const r = await change(await releaseRequest(id.data, c.get("user")!.id));
  return c.json(r.body, r.status);
});

requests.post("/:code/cancel", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  if (!id.success) return c.json({ error: "not_found" }, 404);
  const r = await change(await cancelRequest(id.data, c.get("user")!.id));
  return c.json(r.body, r.status);
});

requests.post("/:code/rate", requireUser, async (c) => {
  const id = codeParam.safeParse(c.req.param("code"));
  const body = rateSchema.safeParse(await c.req.json().catch(() => null));
  if (!id.success || !body.success) return c.json(invalid(["stars"]), 400);
  const ok = await rateRequest(id.data, c.get("user")!.id, body.data.stars, body.data.body);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_allowed" }, 409);
});
