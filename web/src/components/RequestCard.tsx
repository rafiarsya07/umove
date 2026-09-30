import { Link } from "react-router";
import { fmt, useI18n } from "../i18n";
import { ringgit, timeAgo } from "../lib/format";
import type { BoardItem } from "../lib/requests";

/** One open request on the board. The tip is the headline; the route sits under it. */
export function RequestCard({ item }: { item: BoardItem }) {
  const { t, locale } = useI18n();
  return (
    <Link
      to={`/requests/${item.id}`}
      className="group flex h-full flex-col rounded-(--radius-surface) border border-border bg-card p-4 motion-interactive hover:border-border-strong hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-[0.9375rem] leading-snug font-semibold">{item.details}</p>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.875rem] font-bold text-primary-strong tabular-nums">
          {ringgit(item.tipSen)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-[0.8125rem]">
        <span className="mt-1.5 size-2 rounded-full border-2 border-foreground-secondary" aria-hidden="true" />
        <span className="truncate text-foreground-secondary">{item.pickup}</span>
        <span className="mt-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
        <span className="truncate font-medium">{item.dropoff}</span>
      </div>
      <p className="t-meta mt-auto border-t border-border pt-3 text-[0.75rem]">
        {fmt(t.requests.by, { name: item.customer.name })} · {timeAgo(item.createdAt, locale)}
      </p>
    </Link>
  );
}

export function RequestGrid({ items }: { items: BoardItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <RequestCard item={item} />
        </li>
      ))}
    </ul>
  );
}
