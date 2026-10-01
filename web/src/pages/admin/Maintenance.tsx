import { useEffect, useState } from "react";
import { Badge, btn } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { useStatus } from "../../lib/status";
import { PageTitle, panel } from "./AdminLayout";

type M = { on: boolean; message: string | null; until: string | null; reopenMessage?: string | null };

const field =
  "w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] focus:border-foreground focus:outline-none";

/** "2026-09-30T21:00" in local time, for a datetime-local input. */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/**
 * Maintenance mode: everyone except admins sees a "we're under maintenance"
 * screen, and the API refuses their requests. Admins keep full access.
 */
export default function Maintenance() {
  const { reload } = useStatus();
  const [m, setM] = useState<M | null>(null);
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [reopen, setReopen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<M>("/admin/maintenance")
      .then((v) => {
        setM(v);
        setMessage(v.message ?? "");
        setUntil(toLocal(v.until));
        setReopen(v.reopenMessage ?? "");
      })
      .catch(() => setError("Could not load the current state."));
  }, []);

  const save = async (on: boolean) => {
    const confirmText = until
      ? `Turn on maintenance until ${new Date(until).toLocaleString()}? UMOVE opens again by itself at that time.`
      : "Turn on maintenance? Everyone except admins will be locked out until you turn it off.";
    if (on && !m?.on && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const v = await api<M>("/admin/maintenance", {
        method: "POST",
        body: {
          on,
          message: message.trim(),
          until: until ? new Date(until).toISOString() : "",
          reopenMessage: until ? reopen.trim() : "",
        },
      });
      setM(v);
      if (!on) {
        setUntil("");
        setReopen("");
      }
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError && err.fields.includes("until")
          ? "That time has already passed. Pick a time in the future."
          : "That didn't work. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Maintenance"
        lead="While it's on, visitors and members see a maintenance screen and can't use UMOVE. You and other admins keep full access."
      />
      {m === null ? (
        <p className="t-meta">{error ?? "Loading…"}</p>
      ) : (
        <div className={`${panel} space-y-4 p-5`}>
          <div className="flex items-center gap-3">
            <span className="text-[0.9375rem] font-semibold">Status</span>
            <Badge tone={m.on ? "warning" : "success"}>{m.on ? "Maintenance on" : "Site live"}</Badge>
          </div>
          <label className="block">
            <span className="t-label">Message for users (optional)</span>
            <textarea
              className={`${field} mt-1.5 h-20 resize-none py-2.5`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              placeholder="We're upgrading UMOVE. Back by 9pm tonight."
            />
          </label>
          <label className="block max-w-xs">
            <span className="t-label">Open again automatically at (optional)</span>
            <input
              type="datetime-local"
              className={`${field} mt-1.5 h-11`}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
            <span className="t-meta mt-1 block text-[0.75rem]">
              {until
                ? "UMOVE turns maintenance off by itself at this time (within half a minute)."
                : "Leave empty to stay closed until you turn it off."}
            </span>
          </label>
          {until ? (
            <label className="block">
              <span className="t-label">Message when it opens again (optional)</span>
              <input
                className={`${field} mt-1.5 h-11`}
                value={reopen}
                onChange={(e) => setReopen(e.target.value)}
                maxLength={300}
                placeholder="UMOVE is back! Chat is faster now."
              />
              <span className="t-meta mt-1 block text-[0.75rem]">
                Shown to everyone as a broadcast for 24 hours after reopening.
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {m.on ? (
              <>
                <button type="button" className={btn.primary} disabled={busy} onClick={() => save(false)}>
                  Turn off, go live
                </button>
                <button type="button" className={btn.outline} disabled={busy} onClick={() => save(true)}>
                  Update message
                </button>
              </>
            ) : (
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-full bg-warning px-5 text-[0.9375rem] font-semibold text-white motion-pressable disabled:opacity-60"
                disabled={busy}
                onClick={() => save(true)}
              >
                Turn on maintenance
              </button>
            )}
          </div>
          {error ? <p className="text-[0.8125rem] text-danger">{error}</p> : null}
        </div>
      )}

      <div className={`${panel} mt-6 p-5`}>
        <p className="text-[0.9375rem] font-semibold">Working on the mini PC itself?</p>
        <p className="t-meta mt-1 leading-relaxed">
          This switch lives on the mini PC, so it can't help when the mini PC is off. For that, use the switch on
          Cloudflare: Workers &amp; Pages → umove → Settings → Variables and Secrets → add <code>MAINTENANCE</code> ={" "}
          <code>on</code> (and optionally <code>MAINTENANCE_MESSAGE</code>), then Deploy. Delete it to go live again. If
          the mini PC goes down unexpectedly, the site shows a “we'll be right back” screen by itself.
        </p>
        <p className="t-meta mt-2">Tip: announce planned maintenance a day earlier with a Broadcast.</p>
      </div>
    </div>
  );
}
