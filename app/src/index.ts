import { serve } from "@hono/node-server";
import { startSessionCleanup } from "./auth/session.js";
import { createBot } from "./bot/index.js";
import { config } from "./config.js";
import { sql } from "./db.js";
import { createApp } from "./http/app.js";
import { log } from "./log.js";
import { startFilePurge } from "./repo/applications.js";
import { setBot, setBotUsername, startUnclaimedWatch } from "./notify.js";
import { startMaintenanceWatch } from "./repo/site.js";

const app = createApp();

const server = serve({ fetch: app.fetch, port: config.port, hostname: "0.0.0.0" }, (info) =>
  log.info("http listening", { port: info.port, origin: config.publicOrigin }),
);

startSessionCleanup();
startFilePurge();

startMaintenanceWatch();

const bot = createBot();
setBot(bot);
startUnclaimedWatch();
bot
  ?.start({
    drop_pending_updates: true,
    allowed_updates: ["message"],
    onStart: (me) => {
      setBotUsername(me.username);
      log.info("bot polling", { username: me.username });
    },
  })
  .catch((err: unknown) => log.error("bot stopped", { err }));

let stopping = false;
async function shutdown(signal: string, code = 0) {
  if (stopping) return;
  stopping = true;
  log.info("shutting down", { signal });
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  await bot?.stop().catch(() => {});
  server.close();
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(code);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => log.error("unhandled rejection", { err }));
// A bug that escapes every handler leaves the process in an unknown state.
// Log it, close cleanly, and let Docker (restart: unless-stopped) start a
// fresh copy within seconds; the web app reconnects and catches up by itself.
process.on("uncaughtException", (err) => {
  log.error("uncaught exception", { err });
  void shutdown("uncaughtException", 1);
});
