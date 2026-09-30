import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { btn } from "./ui";

export type ChatMessage = { id: number; fromAdmin: boolean; body: string; createdAt: string; author: string | null };

/**
 * A plain chat thread: bubbles, newest at the bottom, a composer that sends
 * on Enter. Used by members (Help) and admins (Support inbox).
 */
export function ChatThread({
  messages,
  mineIsAdmin,
  labels,
  locale,
  onSend,
  empty,
}: {
  messages: ChatMessage[];
  mineIsAdmin: boolean;
  labels: { placeholder: string; send: string; sending: string; hint: string; me: string; them: string };
  locale: string;
  onSend: (body: string) => Promise<string | null>;
  empty?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const err = await onSend(body);
    if (err) setError(err);
    else setText("");
    setBusy(false);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );

  return (
    <div className="flex flex-col rounded-(--radius-surface) border border-border bg-card">
      <div className="max-h-[60vh] min-h-64 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && empty ? empty : null}
        {messages.map((m) => {
          const mine = m.fromAdmin === mineIsAdmin;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap ${
                  mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground"
                }`}
              >
                {m.body}
              </div>
              <span className="mt-1 px-1 text-[0.6875rem] text-muted-foreground">
                {mine ? labels.me : m.fromAdmin && m.author ? `${labels.them} (${m.author})` : labels.them}
                {"  "}
                {time(m.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            maxLength={1000}
            placeholder={labels.placeholder}
            aria-label={labels.placeholder}
            className="min-h-11 flex-1 resize-none rounded-(--radius-control) border border-border-input bg-card px-3 py-2.5 text-[0.9375rem] placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className={`${btn.primary} disabled:opacity-50`}>
            {busy ? labels.sending : labels.send}
          </button>
        </div>
        <p className="mt-1.5 hidden text-[0.6875rem] text-muted-foreground sm:block">{labels.hint}</p>
        {error ? (
          <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
