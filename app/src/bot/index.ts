import { Bot, GrammyError, HttpError } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { config } from "../config.js";
import { log } from "../log.js";
import { claimLink } from "../notify.js";

/**
 * The UMove Telegram bot.
 *
 * Long polling: the bot calls Telegram, Telegram never calls the mini PC,
 * so there is no webhook endpoint to attack and nothing for a firewall to
 * block. Outgoing messages are throttled to Telegram's limits, incoming
 * spam is dropped per user, and the bot only talks in private chats.
 */
export function createBot(): Bot | null {
  if (!config.telegramBotToken) {
    log.info("bot disabled (no TELEGRAM_BOT_TOKEN)");
    return null;
  }

  const bot = new Bot(config.telegramBotToken);
  bot.api.config.use(apiThrottler());
  bot.use(limit({ timeFrame: 3000, limit: 3, onLimitExceeded: () => {} }));

  // Private chats only: runner alerts are personal.
  bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.type !== "private") return;
    await next();
  });

  bot.command("start", async (ctx) => {
    // "/start <token>": the one-time link from Admin → Telegram alerts.
    const token = ctx.match?.trim();
    if (token && ctx.chat) {
      const ok = await claimLink(token, ctx.chat.id).catch(() => false);
      return ctx.reply(
        ok
          ? "Terhubung! Notifikasi admin UMOVE akan masuk ke chat ini."
          : "Link ini sudah kedaluwarsa atau sudah dipakai. Buat link baru di Admin → Overview → Telegram alerts.",
      );
    }
    return ctx.reply(`Hi! This is the UMOVE bot.\n\nOpen UMOVE: ${config.publicOrigin}`);
  });
  bot.command("help", (ctx) => ctx.reply(`Questions? ${config.publicOrigin}/faq`));

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) log.warn("telegram api error", { description: e.description });
    else if (e instanceof HttpError) log.warn("telegram network error");
    else log.error("bot handler error", { err: e });
  });

  return bot;
}
