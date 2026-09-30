import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ChatThread, type ChatMessage } from "../components/ChatThread";
import { ChatIcon } from "../components/Icon";
import { useI18n } from "../i18n";
import { ApiError, api } from "../lib/api";
import { useLive } from "../lib/live";

/** Help: a private chat with the UMOVE team (members only, inside AccountLayout). */
export default function Help() {
  const { t, locale } = useI18n();
  const h = t.help;
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);

  const load = useCallback(() => {
    api<ChatMessage[]>("/me/support")
      .then(setMessages)
      .catch(() => setMessages((m) => m ?? []));
  }, []);
  useEffect(load, [load]);
  useLive(load, "support");

  const send = async (body: string) => {
    try {
      const m = await api<ChatMessage>("/me/support", { method: "POST", body: { body } });
      setMessages((list) => [...(list ?? []), m]);
      return null;
    } catch (err) {
      return err instanceof ApiError && err.code === "too_fast" ? h.errTooFast : t.settings.errGeneric;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-page-title">{h.title}</h1>
      <p className="t-body mt-1 text-foreground-secondary">{h.lead}</p>
      <Link to="/#faq" className="mt-2 inline-block text-[0.875rem] font-semibold text-primary-strong hover:underline">
        {h.faqLink}
      </Link>
      <div className="mt-6">
        {messages === null ? (
          <p className="t-meta">{t.common.loading}</p>
        ) : (
          <ChatThread
            messages={messages}
            mineIsAdmin={false}
            locale={locale}
            onSend={send}
            labels={{ placeholder: h.placeholder, send: h.send, sending: h.sending, hint: h.hint, me: h.you, them: h.team }}
            empty={
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <ChatIcon className="size-8" />
                <p className="mt-3 font-semibold">{h.emptyTitle}</p>
                <p className="t-meta mt-1 max-w-sm">{h.emptyBody}</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
