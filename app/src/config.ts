import { z } from "zod";

/**
 * Every setting comes from the environment and is validated once, at boot.
 * A missing or malformed value stops the process with a clear message
 * instead of failing later in the middle of a request.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().url().startsWith("postgres"),
    /** The one public address of UMove, e.g. https://umove.rafiarsya.com */
    PUBLIC_ORIGIN: z.string().url(),
    TELEGRAM_BOT_TOKEN: z
      .string()
      .regex(/^\d+:[\w-]{30,}$/, "TELEGRAM_BOT_TOKEN does not look like a bot token")
      .optional()
      .or(z.literal("")),
    /** Folder with the built web app (served by this process). */
    WEB_DIST: z.string().default("./public"),
    /** Requests per minute per IP, for the whole site and for /api. */
    RATE_LIMIT_SITE: z.coerce.number().int().positive().default(600),
    RATE_LIMIT_API: z.coerce.number().int().positive().default(120),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    /** Google sign-in (Google Cloud Console → Credentials → OAuth client). */
    GOOGLE_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com").optional().or(z.literal("")),
    GOOGLE_CLIENT_SECRET: z.string().min(10).optional().or(z.literal("")),
    /** Comma-separated emails that may use /admin. */
    ADMIN_EMAILS: z.string().default(""),
    SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /** Shared with the Cloudflare Worker that forwards /api (web/worker). */
    PROXY_SECRET: z.string().min(32).optional().or(z.literal("")),
    /** Test-only overrides for the Google endpoints (ignored in production). */
    GOOGLE_AUTH_URL: z.string().url().optional(),
    GOOGLE_TOKEN_URL: z.string().url().optional(),
    GOOGLE_JWKS_URL: z.string().url().optional(),
    GOOGLE_ISSUER: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.PUBLIC_ORIGIN.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["PUBLIC_ORIGIN"], message: "must be https:// in production" });
    }
    if (env.NODE_ENV === "production" && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) {
      ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "Google sign-in is required in production" });
    }
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names and reasons only: never echo the values, they may be secrets.
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`[config] Invalid environment:\n${problems}`);
    process.exit(1);
  }
  const env = parsed.data;
  const prod = env.NODE_ENV === "production";
  return {
    isProduction: env.NODE_ENV === "production",
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    publicOrigin: new URL(env.PUBLIC_ORIGIN).origin,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || null,
    webDist: env.WEB_DIST,
    rateLimit: { site: env.RATE_LIMIT_SITE, api: env.RATE_LIMIT_API },
    logLevel: env.LOG_LEVEL,
    sessionDays: env.SESSION_DAYS,
    proxySecret: env.PROXY_SECRET || null,
    adminEmails: new Set(
      env.ADMIN_EMAILS.split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUri: `${new URL(env.PUBLIC_ORIGIN).origin}/api/auth/google/callback`,
            // Real Google endpoints; overrides are honoured only outside production.
            authUrl: (!prod && env.GOOGLE_AUTH_URL) || "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: (!prod && env.GOOGLE_TOKEN_URL) || "https://oauth2.googleapis.com/token",
            jwksUrl: (!prod && env.GOOGLE_JWKS_URL) || "https://www.googleapis.com/oauth2/v3/certs",
            issuers:
              !prod && env.GOOGLE_ISSUER ? [env.GOOGLE_ISSUER] : ["https://accounts.google.com", "accounts.google.com"],
          }
        : null,
  };
}

export const config = load();
export type Config = typeof config;
