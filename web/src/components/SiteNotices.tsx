import { useState } from "react";
import { Link } from "react-router";
import { fmt, useI18n } from "../i18n";
import { useSession } from "../lib/session";
import { useStatus, type Broadcast } from "../lib/status";
import { Container } from "./Container";
import { LogoMark } from "./Logo";

const KEY = "umove-dismissed-broadcasts";
function readDismissed(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "number").slice(-50) : [];
  } catch {
    return [];
  }
}

const TONE: Record<Broadcast["tone"], string> = {
  info: "bg-primary-soft text-primary-strong border-primary-border",
  warning: "bg-warning-soft text-warning border-warning/25",
  success: "bg-success-soft text-success border-success/25",
};

/** Announcements from the UMOVE team, under the header. Each can be dismissed (remembered on this device). */
/** True on the demo copy (umove-demo.rafiarsya.com), where changes are tried before release. */
export const IS_DEMO = typeof location !== "undefined" && location.hostname.startsWith("umove-demo");

/** A strip on every page of the demo copy, so nobody mistakes it for the real UMOVE. */
export function DemoBanner() {
  const { t } = useI18n();
  if (!IS_DEMO) return null;
  return (
    <div role="note" className="bg-foreground px-4 py-1.5 text-center text-[0.75rem] font-semibold text-background">
      {t.site.demo}
    </div>
  );
}

export function BroadcastBar() {
  const { t } = useI18n();
  const { status } = useStatus();
  const [dismissed, setDismissed] = useState<number[]>(readDismissed);
  const shown = status.broadcasts.filter((b) => !dismissed.includes(b.id));
  if (shown.length === 0) return null;

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(-50)));
    } catch {
      /* storage unavailable: hidden until reload */
    }
  };

  return (
    <div className="space-y-px">
      {shown.map((b) => (
        <div key={b.id} role="status" className={`border-b ${TONE[b.tone]}`}>
          <Container className="flex items-start gap-3 py-2.5">
            <p className="min-w-0 flex-1 text-[0.875rem] leading-snug">
              <span className="font-semibold">{b.title}</span>
              {b.body ? <span className="ml-2 opacity-90">{b.body}</span> : null}
              {b.linkPath ? (
                <Link to={b.linkPath} className="ml-2 font-semibold underline underline-offset-2">
                  {t.site.learnMore}
                </Link>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => dismiss(b.id)}
              aria-label={t.site.dismiss}
              title={t.site.dismiss}
              className="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-black/5 hover:opacity-100"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </Container>
        </div>
      ))}
    </div>
  );
}

/** For admins while maintenance is on: a reminder that everyone else is locked out. */
export function AdminMaintenanceNotice() {
  const { t } = useI18n();
  const { user } = useSession();
  const { status } = useStatus();
  if (!user?.isAdmin || !status.maintenance.on) return null;
  return (
    <div className="border-b border-warning/25 bg-warning-soft text-warning">
      <Container className="flex items-center justify-between gap-3 py-2 text-[0.8125rem] font-medium">
        <span>{t.site.adminOn}</span>
        <Link to="/admin/maintenance" className="shrink-0 font-semibold underline underline-offset-2">
          {t.site.manage}
        </Link>
      </Container>
    </div>
  );
}

/** Shown instead of the site to visitors and members during maintenance or when the server is unreachable. */
export function MaintenanceScreen() {
  const { t, locale } = useI18n();
  const { status } = useStatus();
  const m = status.maintenance;
  const offline = m.reason === "offline";
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <LogoMark className="size-14" />
      <h1 className="t-page-title mt-6">{offline ? t.site.offlineTitle : t.site.maintTitle}</h1>
      <p className="t-body mt-2 max-w-md text-foreground-secondary">
        {m.message || (offline ? t.site.offlineBody : t.site.maintBody)}
      </p>
      {m.until ? (
        <p className="mt-3 text-[0.9375rem] font-semibold">
          {fmt(t.site.backAround, {
            time: new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(
              new Date(m.until),
            ),
          })}
        </p>
      ) : null}
      <Link to="/login?next=/admin" className="mt-10 text-[0.75rem] text-muted-foreground hover:text-foreground">
        {t.site.adminSignIn}
      </Link>
    </div>
  );
}
