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

/** A runner sent a new face photo to review. */
export function mailNewPhoto() {
  sendMail(
    [...config.adminEmails],
    "New runner photo to review",
    [
      "A runner sent a new face photo on UMOVE.",
      "",
      "Review it here:",
      `${config.publicOrigin}/admin/applications?tab=photos`,
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
  sendMail(
    [to],
    decision === "approve" ? `You're approved as a UMOVE ${r}` : `Your UMOVE ${r} application`,
    [...lines, "", "— UMOVE"].join("\n"),
  );
}

const TOPIC = {
  order: "An order",
  account: "My account",
  application: "Runner/Driver application",
  report: "Reporting someone",
  other: "Something else",
} as const;

export function mailSupportToAdmins(name: string, username: string, topic: keyof typeof TOPIC, preview: string) {
  sendMail(
    [...config.adminEmails],
    `Help request from ${name}: ${TOPIC[topic]}`,
    [
      `${name} (@${username}) sent a help request (${TOPIC[topic]}):`,
      "",
      preview.length > 300 ? `${preview.slice(0, 300)}…` : preview,
      "",
      `Review it: ${config.publicOrigin}/admin/support`,
    ].join("\n"),
  );
}

export function mailSupportDecision(to: string, name: string, decision: "approve" | "decline", reason: string | null) {
  sendMail(
    [to],
    decision === "approve" ? "Your UMOVE help chat is open" : "About your UMOVE help request",
    (decision === "approve"
      ? [
          `Hi ${name},`,
          "",
          "We've reviewed your request and opened the chat. Continue here:",
          `${config.publicOrigin}/help`,
        ]
      : [
          `Hi ${name},`,
          "",
          "We reviewed your help request and won't open a chat for it.",
          `Reason: ${reason ?? "-"}`,
          "",
          `You can send a new request any time: ${config.publicOrigin}/help`,
        ]
    )
      .concat(["", "— UMOVE"])
      .join("\n"),
  );
}

export function mailSupportReply(to: string, name: string) {
  sendMail(
    [to],
    "UMOVE replied to your message",
    [`Hi ${name},`, "", "The UMOVE team replied in your help chat:", `${config.publicOrigin}/help`, "", "— UMOVE"].join(
      "\n",
    ),
  );
}
