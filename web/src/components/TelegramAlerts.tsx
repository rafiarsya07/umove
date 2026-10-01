import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { Badge, btn } from "./ui";

type State = { enabled: boolean; username: string | null; linked: boolean };

/**
 * Admin → Overview: get alerts on Telegram (new requests, help chats,
 * applications, requests nobody has taken). One tap links this admin's chat.
 */
export function TelegramAlerts({ className = "" }: { className?: string }) {
  const [st, setSt] = useState<State | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    api<State>("/admin/telegram")
      .then(setSt)
      .catch(() => setSt(null));
  }, []);
  useEffect(load, [load]);

  // After tapping the link, come back here: refresh when the tab is focused again.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const run = async (path: string, ok: string) => {
    setBusy(true);
    setNote(null);
    try {
      const r = await api<{ url?: string }>(`/admin/telegram/${path}`, { method: "POST" });
      // Opened by the person's own tap below (a pop-up after a network call gets blocked).
      setLinkUrl(r.url ?? null);
      setNote(ok);
      load();
    } catch {
      setNote("That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!st) return null;
  return (
    <div className={`rounded-(--radius-surface) border border-border bg-card p-5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[0.9375rem] font-semibold">Telegram alerts</p>
        <Badge tone={st.linked ? "success" : "muted"}>{st.linked ? "On" : "Off"}</Badge>
      </div>
      <p className="t-meta mt-1 leading-relaxed">
        New requests, help chats, runner applications and photos, and requests nobody has taken after 15 minutes. Chat
        messages are grouped: at most one alert per member every 10 minutes.
      </p>
      {!st.enabled ? (
        <p className="t-meta mt-3 text-[0.8125rem]">
          The bot isn't set up yet. Add <code>TELEGRAM_BOT_TOKEN</code> to <code>.env</code> on the mini PC (see
          docs/SETUP.md), then run the update.
        </p>
      ) : !st.username ? (
        <p className="t-meta mt-3 text-[0.8125rem]">The bot is starting. Refresh in a moment.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {st.linked ? (
            <>
              <button
                type="button"
                className={btn.small}
                disabled={busy}
                onClick={() => run("test", "Test sent. Check Telegram.")}
              >
                Send a test
              </button>
              <button
                type="button"
                className={btn.small}
                disabled={busy}
                onClick={() => run("unlink", "Alerts turned off.")}
              >
                Turn off
              </button>
            </>
          ) : (
            <button
              type="button"
              className={btn.primary}
              disabled={busy}
              onClick={() => run("link", "Link ready (valid 10 minutes). After tapping Start, come back here.")}
            >
              Connect Telegram
            </button>
          )}
        </div>
      )}
      {linkUrl && !st.linked ? (
        <a href={linkUrl} target="_blank" rel="noreferrer" className={`${btn.outline} mt-3`}>
          Open Telegram and tap Start
        </a>
      ) : null}
      {note ? <p className="t-meta mt-2 text-[0.8125rem]">{note}</p> : null}
    </div>
  );
}
