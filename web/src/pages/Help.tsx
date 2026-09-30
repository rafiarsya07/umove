import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import { ChatIcon } from "../components/Icon";
import { Badge, btn } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { useLive } from "../lib/live";

type Topic = "order" | "account" | "application" | "report" | "other";
type Thread = {
  id: number;
  topic: Topic;
  orderCode: string | null;
  status: "pending" | "open" | "declined" | "closed";
  reason: string | null;
  createdAt: string;
};
type State = { thread: Thread | null; messages: ChatMessage[] };

const TOPICS: Topic[] = ["order", "account", "application", "report", "other"];
const field =
  "w-full rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] motion-interactive placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-foreground/10 focus:outline-none aria-invalid:border-danger";

/**
 * Help. A member sends a request; an admin reviews it and opens the chat.
 * Until then the member sees "Under review". Members only (AccountLayout).
 */
export default function Help() {
  const { t, locale } = useI18n();
  const h = t.help;
  const [data, setData] = useState<State | null>(null);
  // "Report a problem" on an order opens this page with ?topic=report&order=UM-…
  const [params] = useSearchParams();
  const [starting, setStarting] = useState(params.has("topic"));

  const load = useCallback(() => {
    api<State>("/me/support")
      .then(setData)
      .catch(() => setData((d) => d ?? { thread: null, messages: [] }));
  }, []);
  useEffect(load, [load]);
  useLive(load, "support");

  const thread = data?.thread ?? null;
  const active = thread && (thread.status === "pending" || thread.status === "open");
  const showForm = data && (!thread || (!active && starting));

  const send = async (body: string) => {
    try {
      const m = await api<ChatMessage>("/me/support", { method: "POST", body: { body } });
      setData((d) => (d ? { ...d, messages: [...d.messages, m] } : d));
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.code === "not_open") load();
      return err instanceof ApiError && err.code === "too_fast" ? h.errTooFast : t.settings.errGeneric;
    }
  };

  const withdraw = async () => {
    await api("/me/support/threads/current", { method: "DELETE" }).catch(() => {});
    load();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-page-title">{h.title}</h1>
      <p className="t-body mt-1 text-foreground-secondary">{h.lead}</p>
      <Link to="/faq" className="mt-2 inline-block text-[0.875rem] font-semibold text-primary-strong hover:underline">
        {h.faqLink}
      </Link>

      <div className="mt-6">
        {data === null ? (
          <p className="t-meta">{t.common.loading}</p>
        ) : showForm ? (
          <StartForm
            onSent={() => {
              setStarting(false);
              load();
            }}
          />
        ) : thread ? (
          <>
            <ThreadHeader thread={thread} />

            {thread.status === "pending" ? (
              <div className="mt-4 rounded-(--radius-surface) border border-border p-5">
                <p className="text-[1rem] font-semibold">{h.reviewTitle}</p>
                <p className="t-meta mt-1 leading-relaxed">{h.reviewBody}</p>
                {data.messages[0] ? (
                  <blockquote className="mt-4 rounded-(--radius-control) bg-surface px-4 py-3 text-[0.9375rem] whitespace-pre-wrap">
                    {data.messages[0].body}
                  </blockquote>
                ) : null}
                <button type="button" onClick={withdraw} className={`${btn.small} mt-4`}>
                  {h.withdraw}
                </button>
              </div>
            ) : thread.status === "open" ? (
              <div className="mt-4">
                <ChatThread
                  messages={data.messages}
                  mineIsAdmin={false}
                  locale={locale}
                  onSend={send}
                  labels={{
                    placeholder: h.placeholder,
                    send: h.send,
                    sending: h.sending,
                    hint: h.hint,
                    me: h.you,
                    them: h.team,
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-(--radius-surface) border border-border p-5">
                  <p className="text-[1rem] font-semibold">
                    {thread.status === "declined" ? h.declinedTitle : h.closedTitle}
                  </p>
                  <p className="t-meta mt-1">
                    {thread.status === "declined" && thread.reason
                      ? fmt(h.reason, { reason: thread.reason })
                      : h.closedBody}
                  </p>
                  <button type="button" onClick={() => setStarting(true)} className={`${btn.primary} mt-4`}>
                    {h.newRequest}
                  </button>
                </div>
                {data.messages.length > 1 ? (
                  <details className="rounded-(--radius-surface) border border-border">
                    <summary className="cursor-pointer px-4 py-3 text-[0.875rem] font-medium text-foreground-secondary">
                      {h.openTitle}
                    </summary>
                    <ul className="space-y-2 border-t border-border p-4 text-[0.875rem]">
                      {data.messages.map((m) => (
                        <li key={m.id} className={m.fromAdmin ? "text-foreground" : "text-foreground-secondary"}>
                          <span className="font-semibold">{m.fromAdmin ? h.team : h.you}:</span> {m.body}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ThreadHeader({ thread }: { thread: Thread }) {
  const { t } = useI18n();
  const h = t.help;
  const tone = thread.status === "open" ? "success" : thread.status === "pending" ? "warning" : "muted";
  const label =
    thread.status === "open"
      ? h.openTitle
      : thread.status === "pending"
        ? h.reviewTitle
        : thread.status === "declined"
          ? h.declinedTitle
          : h.closedTitle;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={tone}>{label}</Badge>
      <span className="text-[0.875rem] font-medium">{h.topics[thread.topic]}</span>
      {thread.orderCode ? (
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem] font-semibold">
          {thread.orderCode}
        </span>
      ) : null}
    </div>
  );
}

function StartForm({ onSent }: { onSent: () => void }) {
  const { t } = useI18n();
  const h = t.help;
  const [params] = useSearchParams();
  const [topic, setTopic] = useState<Topic>(() => {
    const q = params.get("topic");
    return TOPICS.includes(q as Topic) ? (q as Topic) : "order";
  });
  const [orderCode, setOrderCode] = useState(() => {
    const q = (params.get("order") ?? "").toUpperCase();
    return /^UM-[2-9A-HJ-NP-Z]{6}$/.test(q) ? q : "";
  });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ body?: string; orderCode?: string; form?: string }>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (body.trim().length < 10) errs.body = h.errShort;
    if (orderCode.trim() && !/^UM-[2-9A-HJ-NP-Z]{6}$/i.test(orderCode.trim())) errs.orderCode = h.errCode;
    setErrors(errs);
    if (errs.body || errs.orderCode) return;
    setBusy(true);
    try {
      await api("/me/support/threads", {
        method: "POST",
        body: { topic, orderCode: topic === "order" || topic === "report" ? orderCode.trim() : "", body },
      });
      onSent();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setErrors({
        form: code === "already_open" ? h.errAlready : code === "too_many" ? h.errTooMany : t.settings.errGeneric,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-(--radius-surface) border border-border p-5">
      <div className="flex items-center gap-3">
        <ChatIcon className="size-7 shrink-0" />
        <div>
          <p className="text-[1rem] font-semibold">{h.startTitle}</p>
          <p className="t-meta">{h.startLead}</p>
        </div>
      </div>

      <p className="t-label mt-5">{h.topic}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={h.topic}>
        {TOPICS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={topic === k}
            onClick={() => setTopic(k)}
            className={`rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium motion-interactive ${
              topic === k
                ? "border-primary bg-primary-soft text-primary-strong"
                : "border-border text-foreground-secondary hover:text-foreground"
            }`}
          >
            {h.topics[k]}
          </button>
        ))}
      </div>

      {topic === "order" || topic === "report" ? (
        <label className="mt-4 block max-w-[14rem]">
          <span className="t-label">{h.orderCode}</span>
          <input
            className={`${field} mt-1.5 h-11 font-mono uppercase`}
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
            placeholder={h.orderCodePh}
            maxLength={9}
            aria-invalid={Boolean(errors.orderCode)}
          />
          {errors.orderCode ? (
            <span className="mt-1 block text-[0.75rem] font-medium text-danger">{errors.orderCode}</span>
          ) : null}
        </label>
      ) : null}

      <label className="mt-4 block">
        <span className="t-label">{h.message}</span>
        <textarea
          className={`${field} mt-1.5 h-28 resize-none py-2.5`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={h.messagePh}
          maxLength={1000}
          aria-invalid={Boolean(errors.body)}
        />
        {errors.body ? <span className="mt-1 block text-[0.75rem] font-medium text-danger">{errors.body}</span> : null}
      </label>

      {errors.form ? (
        <p role="alert" className="mt-3 text-[0.875rem] font-medium text-danger">
          {errors.form}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={`${btn.primary} mt-4 disabled:opacity-60`}>
        {busy ? h.sending : h.sendRequest}
      </button>
    </form>
  );
}
