import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ChatThread, type ChatMessage } from "../../components/ChatThread";
import { Badge, btn } from "../../components/ui";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { useLive } from "../../lib/live";
import { PageTitle, panel } from "./AdminLayout";

type Status = "pending" | "open" | "declined" | "closed";
type Row = {
  id: number;
  topic: string;
  orderCode: string | null;
  status: Status;
  createdAt: string;
  name: string;
  email: string;
  lastBody: string;
  lastFromAdmin: boolean;
  lastAt: string;
  unread: number;
};
type Detail = {
  thread: {
    id: number;
    topic: string;
    orderCode: string | null;
    status: Status;
    reason: string | null;
    createdAt: string;
  };
  member: { name: string; username: string; email: string; college: string; joined: string };
  messages: ChatMessage[];
};

const TOPIC: Record<string, string> = {
  order: "Order",
  account: "Account",
  application: "Application",
  report: "Report",
  other: "Other",
};
const DECLINE_REASONS = [
  "This is answered in the FAQ.",
  "Please include the order code so we can look into it.",
  "This isn't something UMOVE can help with.",
  "Duplicate of an earlier request.",
];
const TABS = [
  ["pending", "To review"],
  ["open", "Open chats"],
  ["closed", "Closed"],
] as const;

/**
 * Help chat. Members' requests wait in "To review"; approve to open a chat,
 * decline with a reason, and close the chat once it's resolved. Updates live.
 */
export default function Support() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(([k]) => k === params.get("tab"))?.[0] ?? "pending") as (typeof TABS)[number][0];
  const selected = params.get("t");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  const loadList = useCallback(() => {
    api<Row[]>(`/admin/support?status=${tab}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [tab]);
  const loadThread = useCallback(() => {
    if (!selected) return setDetail(null);
    api<Detail>(`/admin/support/${selected}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selected]);
  useEffect(loadList, [loadList]);
  useEffect(loadThread, [loadThread]);
  useLive(() => {
    loadList();
    loadThread();
  }, "support");

  const go = (next: { tab?: string; t?: string | null }) => {
    const p: Record<string, string> = {};
    const nt = next.tab ?? tab;
    if (nt !== "pending") p.tab = nt;
    const t = next.t === undefined ? selected : next.t;
    if (t) p.t = t;
    setParams(p);
  };

  return (
    <div>
      <PageTitle
        title="Help chat"
        lead="Review each request first. Approve to open a chat, or decline with a reason. Close the chat when it's resolved."
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => go({ tab: k, t: null })}
            className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium motion-interactive ${
              tab === k
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground-secondary hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ul
          className={`${panel} max-h-[70vh] divide-y divide-border overflow-y-auto ${selected ? "hidden lg:block" : ""}`}
        >
          {rows === null ? (
            <li className="t-meta p-4">Loading…</li>
          ) : rows.length === 0 ? (
            <li className="t-meta p-4">{tab === "pending" ? "Nothing to review." : "Nothing here."}</li>
          ) : (
            rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => go({ t: String(r.id) })}
                  className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left motion-interactive hover:bg-surface ${
                    selected === String(r.id) ? "bg-surface" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{r.name}</span>
                    {r.unread ? (
                      <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-bold text-white">
                        {r.unread}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex gap-2 text-[0.75rem] text-muted-foreground">
                    <span>{TOPIC[r.topic]}</span>
                    {r.orderCode ? <span className="font-mono">{r.orderCode}</span> : null}
                    {r.status === "declined" ? <span>declined</span> : null}
                  </span>
                  <span className="truncate text-[0.8125rem] text-foreground-secondary">
                    {r.lastFromAdmin ? "You: " : ""}
                    {r.lastBody}
                  </span>
                  <span className="text-[0.6875rem] text-muted-foreground">{timeAgo(r.lastAt, "en-MY")}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {selected && detail ? (
          <ThreadView
            detail={detail}
            onBack={() => go({ t: null })}
            onChanged={() => {
              loadThread();
              loadList();
            }}
          />
        ) : (
          <div className={`${panel} hidden items-center justify-center p-10 lg:flex`}>
            <p className="t-meta">Choose a request.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadView({ detail, onBack, onChanged }: { detail: Detail; onBack: () => void; onChanged: () => void }) {
  const { thread, member, messages } = detail;
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/support/${thread.id}/${path}`, { method: "POST", body });
      setDeclining(false);
      setReason("");
      onChanged();
    } catch {
      setError("That didn't work. Refresh and try again.");
    } finally {
      setBusy(false);
    }
  };

  const send = async (body: string) => {
    try {
      await api(`/admin/support/${thread.id}`, { method: "POST", body: { body } });
      onChanged();
      return null;
    } catch {
      return "Could not send. Try again.";
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={onBack} className="t-meta font-medium lg:hidden">
          ← Back
        </button>
        <p className="font-semibold">{member.name}</p>
        <p className="t-meta">@{member.username}</p>
        <p className="t-meta">{member.email}</p>
        {member.college ? <p className="t-meta">{member.college}</p> : null}
        <Badge tone={thread.status === "open" ? "success" : thread.status === "pending" ? "warning" : "muted"}>
          {thread.status === "pending" ? "To review" : thread.status}
        </Badge>
        <span className="t-meta">{TOPIC[thread.topic]}</span>
        {thread.orderCode ? <span className="font-mono text-[0.8125rem]">{thread.orderCode}</span> : null}
      </div>

      {thread.status === "open" ? (
        <>
          <ChatThread
            messages={messages}
            mineIsAdmin
            locale="en-MY"
            onSend={send}
            labels={{
              placeholder: "Reply…",
              send: "Send",
              sending: "Sending…",
              hint: "Enter to send, Shift + Enter for a new line.",
              me: "You",
              them: member.name.split(" ")[0],
            }}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className={btn.small}
              disabled={busy}
              onClick={() =>
                window.confirm("Close this chat? The member can send a new request later.") && post("close")
              }
            >
              Close chat
            </button>
          </div>
        </>
      ) : (
        <div className={`${panel} p-4`}>
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id}>
                <p className="text-[0.75rem] text-muted-foreground">
                  {m.fromAdmin ? `You (${m.author ?? "admin"})` : member.name.split(" ")[0]}{" "}
                  {new Date(m.createdAt).toLocaleString("en-MY")}
                </p>
                <p className="text-[0.9375rem] whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
          {thread.reason ? (
            <p className="mt-3 text-[0.8125rem] text-foreground-secondary">Reason: {thread.reason}</p>
          ) : null}

          {thread.status === "pending" ? (
            <div className="mt-4 border-t border-border pt-4">
              {declining ? (
                <div className="space-y-3">
                  <p className="t-label">Why decline? The member will see this.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DECLINE_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[0.75rem] text-foreground-secondary hover:text-foreground"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="h-20 w-full resize-none rounded-(--radius-control) border border-border-input bg-card px-3 py-2 text-[0.875rem] focus:border-foreground focus:outline-none"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={300}
                    placeholder="Reason"
                  />
                  <div className="flex gap-2">
                    <button type="button" className={btn.small} onClick={() => setDeclining(false)} disabled={busy}>
                      Back
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center rounded-full bg-danger px-3.5 text-[0.8125rem] font-semibold text-white motion-pressable disabled:opacity-60"
                      disabled={busy || reason.trim().length < 5}
                      onClick={() => post("decision", { decision: "decline", reason: reason.trim() })}
                    >
                      Decline request
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className={btn.small} disabled={busy} onClick={() => setDeclining(true)}>
                    Decline…
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-[0.8125rem] font-semibold text-primary-foreground motion-pressable hover:bg-primary-hover disabled:opacity-60"
                    disabled={busy}
                    onClick={() => post("decision", { decision: "approve" })}
                  >
                    Approve and open chat
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      {error ? <p className="mt-2 text-[0.8125rem] text-danger">{error}</p> : null}
    </div>
  );
}
