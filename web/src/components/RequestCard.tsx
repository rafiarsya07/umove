import { Link } from "react-router";
import { fmt, useI18n } from "../i18n";
import { CheckIcon, DropoffIcon, PickupIcon } from "./Icon";
import { ringgit, timeAgo } from "../lib/format";
import type { BoardItem } from "../lib/requests";

/** One open request on the board. The tip is the headline; the route sits under it. */
export function RequestCard({ item }: { item: BoardItem }) {
  const { t, locale } = useI18n();
  return (
    <Link
      to={`/requests/${item.code}`}
      className="group flex h-full flex-col rounded-(--radius-surface) border border-border bg-card p-4 motion-interactive hover:border-border-strong hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold">{item.details}</p>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.875rem] font-bold text-primary-strong tabular-nums">
          {ringgit(item.tipSen)}
        </span>
      </div>
      <div className="mt-3 mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-[0.8125rem]">
        <PickupIcon className="size-4" />
        <span className="flex min-w-0 items-center gap-1 text-foreground-secondary">
          <span className="truncate">{item.pickup}</span>
          {item.listed ? (
            <span title={t.requests.placeListed} className="shrink-0 text-primary">
              <CheckIcon className="size-3.5" />
              <span className="sr-only">{t.requests.placeListed}</span>
            </span>
          ) : null}
        </span>
        <DropoffIcon className="size-4" />
        <span className="truncate font-medium">{item.dropoff}</span>
      </div>
      <p className="t-meta mt-auto flex justify-between gap-3 border-t border-border pt-3 text-[0.75rem]">
        <span className="truncate">{fmt(t.requests.by, { name: item.customer.name })}</span>
        <span className="shrink-0">{timeAgo(item.createdAt, locale)}</span>
      </p>
    </Link>
  );
}

export function RequestGrid({ items }: { items: BoardItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.code}>
          <RequestCard item={item} />
        </li>
      ))}
    </ul>
  );
}
