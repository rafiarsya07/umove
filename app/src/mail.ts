import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config.js";
import { log } from "./log.js";

/**
 * Optional e-mail. Without SMTP_URL nothing is sent and UMOVE works the same
 * (admins then watch the badge in the admin panel). Sending never blocks or
 * fails a request: errors are logged and dropped.
 *
 * Mails carry no document or personal data beyond the applicant's name:
 * the details stay behind the admin login.
 */
let transport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (!config.smtpUrl) return null;
  transport ??= nodemailer.createTransport(config.smtpUrl, {
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transport;
}

function sender(): string {
  if (config.mailFrom) return config.mailFrom;
  try {
    return `UMOVE <${decodeURIComponent(new URL(config.smtpUrl!).username)}>`;
  } catch {
    return "UMOVE";
  }
}

export function sendMail(to: string[], subject: string, text: string): void {
  const t = getTransport();
  if (!t || to.length === 0) return;
  // Strip CR/LF from anything that ends up in a header.
  const clean = (s: string) => s.replace(/[\r\n]+/g, " ").slice(0, 200);
  t.sendMail({ from: sender(), to: to.map(clean), subject: clean(subject), text })
    .then(() => log.info("mail sent", { subject: clean(subject) }))
    .catch((err: unknown) => log.warn("mail failed", { err }));
}

const ROLE_NAME = { runner: "Runner", driver: "Driver" } as const;

export function mailNewApplication(role: "runner" | "driver", name: string, username: string) {
  sendMail(
    [...config.adminEmails],
    `New ${ROLE_NAME[role]} application: ${name}`,
    [
      `${name} (@${username}) applied to be a ${ROLE_NAME[role]} on UMOVE.`,
      "",
      "Please review it within 24 hours:",
      `${config.publicOrigin}/admin/applications`,
    ].join("\n"),
  );
}

export function mailDecision(
  to: string,
  name: string,
  role: "runner" | "driver",
  decision: "approve" | "reject",
  reason: string | null,
) {
  const r = ROLE_NAME[role];
  const lines =
    decision === "approve"
      ? [
          `Hi ${name},`,
          "",
          `Good news: your ${r} application on UMOVE is approved.`,
          role === "runner"
            ? `You can start taking requests now: ${config.publicOrigin}/requests`
            : "Rides are launching soon, and approved drivers get access first.",
        ]
      : [
          `Hi ${name},`,
          "",
          `Your ${r} application on UMOVE was not approved this time.`,
          `Reason: ${reason ?? "-"}`,
          "",
          `You can fix this and apply again after 24 hours: ${config.publicOrigin}/settings#roles`,
        ];
  sendMail([to], decision === "approve" ? `You're approved as a UMOVE ${r}` : `Your UMOVE ${r} application`, [
    ...lines,
    "",
    "— UMOVE",
  ].join("\n"));
}

export function mailSupportToAdmins(name: string, username: string, preview: string) {
  sendMail(
    [...config.adminEmails],
    `Help chat: new message from ${name}`,
    [
      `${name} (@${username}) wrote in the UMOVE help chat:`,
      "",
      preview.length > 300 ? `${preview.slice(0, 300)}…` : preview,
      "",
      `Reply: ${config.publicOrigin}/admin/support`,
    ].join("\n"),
  );
}

export function mailSupportReply(to: string, name: string) {
  sendMail(
    [to],
    "UMOVE replied to your message",
    [`Hi ${name},`, "", "The UMOVE team replied in your help chat:", `${config.publicOrigin}/help`, "", "— UMOVE"].join("\n"),
  );
}
