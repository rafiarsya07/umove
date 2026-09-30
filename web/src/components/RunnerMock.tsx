import { useI18n } from "../i18n";
import { DropoffIcon, PickupIcon } from "./Icon";

/**
 * What a runner sees: a request on the live board, with the fee up front.
 * Decorative (aria-hidden).
 */
export function RunnerMock() {
  const { t } = useI18n();
  const r = t.runner;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[22rem]">
      <div className="overflow-hidden rounded-(--radius-surface) border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[0.8125rem] font-semibold">{r.mockLabel}</span>
          <span className="text-[0.75rem] text-muted-foreground">{r.mockWhen}</span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.9375rem] leading-snug font-semibold">{r.mockDetails}</p>
            <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.875rem] font-bold text-primary-strong tabular-nums">
              {r.mockFee}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-[0.8125rem]">
            <PickupIcon className="size-4" />
            <span className="text-foreground-secondary">{r.mockPickup}</span>
            <DropoffIcon className="size-4" />
            <span className="font-medium">{r.mockDropoff}</span>
          </div>
          <span className="mt-4 flex h-10 items-center justify-center rounded-full bg-primary text-[0.875rem] font-semibold text-primary-foreground">
            {r.mockTake}
          </span>
        </div>
      </div>
    </div>
  );
}
