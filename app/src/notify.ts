import { randomBytes } from "node:crypto";
import type { Bot } from "grammy";
import { config } from "./config.js";
import { sql } from "./db.js";
import { log } from "./log.js";

/**
 * Admin alerts on Telegram.
 *
 * An admin links their Telegram once (Admin → Overview → Telegram alerts):
 * UMOVE makes a one-time link to the bot, the admin taps Start, and the bot
 * saves that chat for them. From then on the important events land on their
 * phone. Everything here is best effort: a Telegram hiccup never breaks the
 * request that caused it.
 */
let bot: Bot | null = null;
let botUsername: string | null = null;

export function setBot(b: Bot | null) {
  bot = b;
}
export function setBotUsername(name: string) {
  botUsername = name;
}
export function telegramReady() {
  return { enabled: bot !== null, username: botUsername };
}

/* ---- Linking -------------------------------------------------------------- */

const LINK_TTL_MS = 10 * 60_000;
const linkTokens = new Map<string, { userId: string; expires: number }>();

/** A one-time deep link (valid 10 minutes) that links the admin's Telegram chat. */
export function makeLink(userId: string): string | null {
  if (!botUsername) return null;
  const now = Date.now();
  for (const [t, v] of linkTokens) if (v.expires < now) linkTokens.delete(t);
  const token = randomBytes(18).toString("base64url");
  linkTokens.set(token, { userId, expires: now + LINK_TTL_MS });
  return `https://t.me/${botUsername}?start=${token}`;
}

/** Called by the bot on /start <token>. Returns true when the chat was linked. */
export async function claimLink(token: string, chatId: number): Promise<boolean> {
  const v = linkTokens.get(token);
  linkTokens.delete(token);
  if (!v || v.expires < Date.now()) return false;
  // A chat belongs to one account: unlink it anywhere else first.
  await sql`update users set telegram_chat_id = null where telegram_chat_id = ${chatId} and id <> ${v.userId}`;
  const rows = await sql`update users set telegram_chat_id = ${chatId} where id = ${v.userId}`;
  return rows.count === 1;
}

export async function unlink(userId: string) {
  await sql`update users set telegram_chat_id = null where id = ${userId}`;
}

export async function isLinked(userId: string): Promise<boolean> {
  const [r] = await sql<{ ok: boolean }[]>`select telegram_chat_id is not null as ok from users where id = ${userId}`;
  return r?.ok ?? false;
}

/* ---- Sending -------------------------------------------------------------- */

async function adminChats(): Promise<number[]> {
  const emails = [...config.adminEmails];
  if (!emails.length) return [];
  const rows = await sql<{ chat: string }[]>`
    select telegram_chat_id::text as chat from users
    where telegram_chat_id is not null and status = 'active' and lower(email::text) in ${sql(emails)}
  `;
  return rows.map((r) => Number(r.chat));
}

/** Send to every linked admin. Fire and forget. */
export function notifyAdmins(text: string, path?: string) {
  if (!bot) return;
  const b = bot;
  const body = path ? `${text}\n\n${config.publicOrigin}${path}` : text;
  void (async () => {
    try {
      for (const chat of await adminChats()) {
        await b.api.sendMessage(chat, body, { link_preview_options: { is_disabled: true } }).catch((err: unknown) => {
          log.warn("telegram alert failed", { err: String(err) });
        });
      }
    } catch (err) {
      log.warn("telegram alert failed", { err: String(err) });
    }
  })();
}

/** Same, but at most once per `key` every `everyMs` (e.g. one alert per chat thread per 10 minutes). */
const lastSent = new Map<string, number>();
export function notifyAdminsThrottled(key: string, everyMs: number, text: string, path?: string) {
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - everyMs) return;
  lastSent.set(key, now);
  if (lastSent.size > 5000) lastSent.clear();
  notifyAdmins(text, path);
}

/** One short line of user text for an alert. */
export const short = (s: string, max = 80) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1) + "…" : one;
};

/* ---- Requests nobody has taken ------------------------------------------- */

const UNCLAIMED_MIN = 15;
const alertedUnclaimed = new Set<string>();

/** Every minute: requests still open after 15 minutes get one alert each. */
export function startUnclaimedWatch() {
  const run = async () => {
    if (!bot) return;
    try {
      const rows = await sql<{ code: string; details: string; pickup: string; tipSen: number }[]>`
        select code, details, pickup, tip_sen as "tipSen" from orders
        where status = 'open'
          and created_at < now() - make_interval(mins => ${UNCLAIMED_MIN})
          and created_at > now() - interval '3 hours'
      `;
      for (const r of rows) {
        if (alertedUnclaimed.has(r.code)) continue;
        alertedUnclaimed.add(r.code);
        notifyAdmins(
          `Belum ada runner ${UNCLAIMED_MIN} menit: ${r.code}\n${short(r.details)}\nDari ${short(r.pickup, 40)}, upah RM${(r.tipSen / 100).toFixed(2).replace(/\.00$/, "")}`,
          `/requests/${r.code}`,
        );
      }
      if (alertedUnclaimed.size > 2000) alertedUnclaimed.clear();
    } catch (err) {
      log.warn("unclaimed watch failed", { err: String(err) });
    }
  };
  setInterval(() => void run(), 60_000).unref();
}

/** A test message to one admin (Admin → Telegram alerts → Send test). */
export async function sendTest(userId: string): Promise<boolean> {
  if (!bot) return false;
  const [r] = await sql<
    { chat: string | null }[]
  >`select telegram_chat_id::text as chat from users where id = ${userId}`;
  if (!r?.chat) return false;
  try {
    await bot.api.sendMessage(Number(r.chat), "Tes dari UMOVE: notifikasi admin sudah berjalan.");
    return true;
  } catch {
    return false;
  }
}
