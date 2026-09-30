import { useI18n } from "../i18n";
import { CheckIcon } from "./Icon";
import { LogoMark } from "./Logo";

/**
 * A Telegram-style chat with the UMove bot: the alert a runner gets.
 * Decorative (aria-hidden).
 */
export function RunnerMock() {
  const { t } = useI18n();
  const r = t.runner;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[22rem]">
      <div className="overflow-hidden rounded-(--radius-surface) border border-border bg-card">
        {/* chat header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <LogoMark className="size-9" />
          <span className="leading-tight">
            <span className="block text-[0.875rem] font-semibold">{r.bot}</span>
            <span className="block text-[0.75rem] text-muted-foreground">{r.botStatus}</span>
          </span>
        </div>

        {/* chat body */}
        <div className="space-y-3 bg-(--tg-bg) px-3 py-4">
          <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-card p-3">
            <p className="text-[0.8125rem] font-bold">{r.msgTitle}</p>
            <p className="mt-1 text-[0.8125rem]">{r.msgBody}</p>
            <p className="mt-1 text-[0.75rem] text-muted-foreground">{r.msgTip}</p>
          </div>
          <div className="grid max-w-[88%] grid-cols-2 gap-1.5">
            <span className="rounded-xl bg-primary py-2 text-center text-[0.8125rem] font-bold text-primary-foreground">
              {r.accept}
            </span>
            <span className="rounded-xl bg-card/70 py-2 text-center text-[0.8125rem] font-semibold text-foreground-secondary">
              {r.skip}
            </span>
          </div>
          <div className="ml-auto flex max-w-[80%] items-start gap-2 rounded-2xl rounded-tr-md bg-(--chat-out) p-3 text-(--chat-out-foreground)">
            <CheckIcon className="mt-0.5 size-4 shrink-0" />
            <p className="text-[0.8125rem]">{r.accepted}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
