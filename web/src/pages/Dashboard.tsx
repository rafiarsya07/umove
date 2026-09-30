import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { ringgit, timeAgo } from "../lib/format";
import { useLive } from "../lib/live";
import type { MyRequest } from "../lib/requests";
import { AlertIcon, ChevronRightIcon, PlusIcon, RunnerIcon, StarIcon } from "../components/Icon";
import { Avatar, VerifiedMark } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { useSession } from "../lib/session";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  if (!user) return null;
  const d = t.dashboard;
  const first = user.name.split(" ")[0];

  const stats: { label: string; value: string; icon: ComponentType<{ className?: string }> }[] = [
    { label: d.statRequests, value: String(user.stats.requests), icon: PlusIcon },
    { label: d.statRuns, value: String(user.stats.runs), icon: RunnerIcon },
    {
      label: d.statRating,
      value:
        user.stats.rating !== null
          ? user.stats.rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : "–",
      icon: StarIcon,
    },
  ];

  const runnerText = { none: d.runnerNone, rejected: d.runnerNone, pending: d.runnerPending, active: d.runnerActive }[
    user.roles.runner
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-page-title">{fmt(d.welcome, { name: first })}</h1>
        <p className="t-body mt-1 text-muted-foreground">{d.lead}</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border rounded-(--radius-surface) border border-border">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-4 sm:p-5">
            <Icon className="size-5 text-muted-foreground" />
            <p className="mt-3 font-display text-[1.625rem] leading-none font-bold tabular-nums">{value}</p>
            <p className="t-meta mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to={`/u/${user.username}`}
          className="group flex items-center gap-3 rounded-(--radius-surface) border border-border p-4 motion-interactive hover:border-border-strong hover:bg-surface sm:col-span-2"
        >
          <Avatar name={user.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold">{user.name}</span>
            <span className="t-meta flex gap-3 truncate">
              <span>@{user.username}</span>
              {user.college ? <span>{user.college}</span> : null}
            </span>
          </span>
          <span className="text-[0.8125rem] font-semibold text-primary-strong">{t.settings.viewProfile}</span>
        </Link>
        <Link
          to="/requests/new"
          className="group flex items-center gap-3 rounded-(--radius-surface) border border-border p-4 motion-interactive hover:border-border-strong hover:bg-surface"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PlusIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-semibold">{d.quickPost}</span>
            <span className="t-meta block">{t.requests.newLead}</span>
          </span>
        </Link>
        <Link
          to="/settings#roles"
          className="group flex items-center gap-3 rounded-(--radius-surface) border border-border p-4 motion-interactive hover:border-border-strong hover:bg-surface"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            {user.roles.runner === "active" ? <VerifiedMark className="size-5" /> : <AlertIcon className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold">{d.quickRunner}</span>
            <span className="t-meta block">{runnerText}</span>
          </span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Link>
      </div>

      <MyActivity />
    </div>
  );
}

/** The user's own requests and runs, active ones first, updated live. */
function MyActivity() {
  const { t, locale } = useI18n();
  const r = t.requests;
  const [rows, setRows] = useState<MyRequest[] | null>(null);
  const load = useCallback(() => {
    api<MyRequest[]>("/requests/mine")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);
  useLive(load);

  const groups: { title: string; items: MyRequest[] }[] = [
    { title: r.mine, items: (rows ?? []).filter((x) => x.mine === "customer") },
    { title: r.myRuns, items: (rows ?? []).filter((x) => x.mine === "runner") },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="t-section-title mb-3">{g.title}</h2>
          {rows === null ? (
            <p className="t-meta">{t.common.loading}</p>
          ) : g.items.length === 0 ? (
            <p className="t-meta">{r.nothingYet}</p>
          ) : (
            <ul className="divide-y divide-border rounded-(--radius-surface) border border-border">
              {g.items.slice(0, 8).map((x) => (
                <li key={x.code}>
                  <Link
                    to={`/requests/${x.code}`}
                    className="flex items-center gap-3 px-4 py-3 motion-interactive hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">{x.details}</span>
                      <span className="t-meta flex gap-3 text-[0.75rem]">
                        <span>{r.status[x.status]}</span>
                        <span>{timeAgo(x.createdAt, locale)}</span>
                      </span>
                    </span>
                    <span className="text-[0.875rem] font-semibold tabular-nums">{ringgit(x.tipSen)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
