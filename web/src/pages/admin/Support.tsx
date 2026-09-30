import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ChatThread, type ChatMessage } from "../../components/ChatThread";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import { useLive } from "../../lib/live";
import { PageTitle, panel } from "./AdminLayout";

type Thread = {
  userId: string;
  name: string;
  username: string;
  email: string;
  lastBody: string;
  lastFromAdmin: boolean;
  lastAt: string;
  unread: number;
};
type Detail = {
  member: { name: string; username: string; email: string; college: string; joined: string };
  messages: ChatMessage[];
};

/** Help chat inbox: every member thread, newest first; open one to reply. Updates live. */
export default function Support() {
  const [params, setParams] = useSearchParams();
  const open = params.get("u");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  const loadList = useCallback(() => {
    api<Thread[]>("/admin/support")
      .then(setThreads)
      .catch(() => setThreads([]));
  }, []);
  const loadThread = useCallback(() => {
    if (!open) return setDetail(null);
    api<Detail>(`/admin/support/${open}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [open]);
  useEffect(loadList, [loadList]);
  useEffect(loadThread, [loadThread]);
  useLive(() => {
    loadList();
    loadThread();
  }, "support");

  const send = async (body: string) => {
    try {
      await api(`/admin/support/${open}`, { method: "POST", body: { body } });
      loadThread();
      loadList();
      return null;
    } catch {
      return "Could not send. Try again.";
    }
  };

  return (
    <div>
      <PageTitle title="Help chat" lead="Messages from members. Replies appear in their Help page right away; they also get an email." />
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <ul className={`${panel} max-h-[70vh] divide-y divide-border overflow-y-auto ${open ? "hidden lg:block" : ""}`}>
          {threads === null ? (
            <li className="t-meta p-4">Loading…</li>
          ) : threads.length === 0 ? (
            <li className="t-meta p-4">No messages yet.</li>
          ) : (
            threads.map((th) => (
              <li key={th.userId}>
                <button
                  type="button"
                  onClick={() => setParams({ u: th.userId })}
                  className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left motion-interactive hover:bg-surface ${
                    open === th.userId ? "bg-surface" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{th.name}</span>
                    {th.unread ? (
                      <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-bold text-white">
                        {th.unread}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-[0.8125rem] text-foreground-secondary">
                    {th.lastFromAdmin ? "You: " : ""}
                    {th.lastBody}
                  </span>
                  <span className="text-[0.6875rem] text-muted-foreground">{timeAgo(th.lastAt, "en-MY")}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        {open && detail ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <button type="button" onClick={() => setParams({})} className="t-meta font-medium lg:hidden">
                ← All chats
              </button>
              <p className="font-semibold">{detail.member.name}</p>
              <p className="t-meta">@{detail.member.username}</p>
              <p className="t-meta">{detail.member.email}</p>
              {detail.member.college ? <p className="t-meta">{detail.member.college}</p> : null}
            </div>
            <ChatThread
              messages={detail.messages}
              mineIsAdmin
              locale="en-MY"
              onSend={send}
              labels={{
                placeholder: "Reply…",
                send: "Send",
                sending: "Sending…",
                hint: "Enter to send, Shift + Enter for a new line.",
                me: "You",
                them: detail.member.name.split(" ")[0],
              }}
            />
          </div>
        ) : (
          <div className={`${panel} hidden items-center justify-center p-10 lg:flex`}>
            <p className="t-meta">Choose a chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
