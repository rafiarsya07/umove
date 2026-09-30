import { useI18n } from "../i18n";
import { RunnerIcon } from "./Icon";
import { Avatar, Stars, VerifiedMark } from "./ui";

/**
 * A request as it will look in UMove, used as the hero picture.
 * Static on purpose: no animation. Decorative (aria-hidden).
 */
export function RequestPreview({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const p = t.preview;
  const current = 2;

  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-border bg-card p-5 shadow-[0_24px_48px_-28px_rgb(17_17_19/0.28)] ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.75rem] font-semibold text-primary-strong">
          {p.label}
        </span>
        <span className="t-meta text-[0.75rem]">#128</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-foreground ring-1 ring-border">
          <RunnerIcon className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1rem] font-semibold">{p.item}</span>
          <span className="t-meta block truncate">{p.route}</span>
        </span>
        <span className="text-right">
          <span className="t-meta block text-[0.75rem]">{p.tip}</span>
          <span className="block font-display text-[1.25rem] leading-none font-bold tabular-nums">RM3</span>
        </span>
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-1.5">
        {p.steps.map((s, i) => (
          <li key={s}>
            <span
              className={`block h-1.5 rounded-full ${i < current ? "bg-foreground" : i === current ? "bg-primary" : "bg-muted"}`}
            />
            <span
              className={`mt-1.5 block truncate text-[0.6875rem] ${i === current ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <Avatar name={p.runner} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[0.875rem] font-semibold">
            {p.runner}
            <VerifiedMark className="size-3.5" />
          </span>
          <span className="t-meta flex items-center gap-1.5 text-[0.75rem] whitespace-nowrap">
            <Stars value={5} className="size-3" /> 4.9 · {p.runs}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#25d366] px-3 py-1.5 text-[0.75rem] font-semibold text-[#0b1f14]">
          {p.chat}
        </span>
      </div>
    </div>
  );
}
