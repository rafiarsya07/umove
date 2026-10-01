import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { ringgit, timeAgo } from "../lib/format";
import { useLive } from "../lib/live";
import type { MyRequest } from "../lib/requests";
import { AlertIcon, ChevronRightIcon, PlusIcon, RunnerIcon, StarIcon } from "../components/Icon";
import { RideTrack, StatusDot, StatusScene } from "../components/StatusScene";
import { Avatar, VerifiedMark } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { useSession } from "../lib/session";

const ACTIVE = new Set(["open", "accepted", "on_the_way"]);
const card = "rounded-(--radius-surface) border border-border";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { user, refresh } = useSession();
  const [rows, setRows] = useState<MyRequest[] | null>(null);
  const prev = useRef<MyRequest[] | null>(null);
  const load = useCallback(() => {
    api<MyRequest[]>("/requests/mine")
      .then((next) => {
        // A request was finished or posted: the numbers at the top changed too.
        const done = (l: MyRequest[]) => l.filter((x) => x.status === "delivered").length;
        const old = prev.current;
        if (old && (done(old) !== done(next) || old.length !== next.length)) void refresh();
        prev.current = next;
        setRows(next);
      })
      .catch(() => setRows((p) => p ?? []));
  }, [refresh]);
  useEffect(load, [load]);
  useLive(load);

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
  const active = (rows ?? []).filter((x) => ACTIVE.has(x.status));

  return (
    <div className="space-y-8">
      {/* Who you are, in one line */}
      <div className="flex items-center gap-4">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <h1 className="t-page-title truncate">{fmt(d.welcome, { name: first })}</h1>
          <p className="t-meta mt-0.5 flex flex-wrap gap-x-3">
            <span>@{user.username}</span>
            {user.college ? <span>{user.college}</span> : null}
            <Link to={`/u/${user.username}`} className="font-semibold text-primary-strong hover:underline">
              {d.viewProfile}
            </Link>
          </p>
        </div>
      </div>

      {/* What's moving right now, with the same animation as the request page */}
      {active.length > 0 ? (
        <section>
          <h2 className="t-section-title mb-3">{d.active}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {active.slice(0, 4).map((x) => (
              <li key={x.code}>
                <Link
                  to={`/requests/${x.code}`}
                  className={`${card} block p-4 motion-interactive hover:border-border-strong hover:bg-surface`}
                >
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[0.9375rem] font-semibold">{x.details}</span>
                    <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">{ringgit(x.tipSen)}</span>
                  </div>
                  <StatusScene status={x.status} viewer={x.mine} />
                  {x.status === "on_the_way" ? <RideTrack /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Numbers */}
      <div className={`${card} grid grid-cols-3 divide-x divide-border`}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="min-w-0 px-3 py-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <p className="font-display text-[1.5rem] leading-none font-bold tabular-nums">{value}</p>
            </div>
            <p className="mt-2 text-[0.75rem] leading-tight text-muted-foreground sm:text-[0.8125rem]">{label}</p>
          </div>
        ))}
      </div>

      {/* Shortcuts */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/requests/new"
          className={`${card} flex h-full items-center gap-3 p-4 motion-interactive hover:border-border-strong hover:bg-surface`}
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PlusIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold">{d.quickPost}</span>
            <span className="t-meta line-clamp-2 block">{t.requests.newLead}</span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
        <Link
          to={user.roles.runner === "active" ? "/requests" : "/settings#roles"}
          className={`${card} flex h-full items-center gap-3 p-4 motion-interactive hover:border-border-strong hover:bg-surface`}
        >
          <span
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${
              user.roles.runner === "active" ? "bg-primary-soft text-primary" : "bg-muted text-foreground"
            }`}
          >
            {user.roles.runner === "active" ? <VerifiedMark className="size-5" /> : <AlertIcon className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold">{d.quickRunner}</span>
            <span className="t-meta block">{runnerText}</span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <History rows={rows} />
    </div>
  );
}

/** Everything else the user posted or delivered, newest first. */
function History({ rows }: { rows: MyRequest[] | null }) {
  const { t, locale } = useI18n();
  const r = t.requests;
  const groups: { title: string; items: MyRequest[] }[] = [
    { title: r.mine, items: (rows ?? []).filter((x) => x.mine === "customer") },
    { title: r.myRuns, items: (rows ?? []).filter((x) => x.mine === "runner") },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {groups.map((g) => (
        <section key={g.title} className="min-w-0">
          <h2 className="t-section-title mb-3">{g.title}</h2>
          {rows === null ? (
            <div className={`${card} h-28 animate-pulse bg-surface`} />
          ) : g.items.length === 0 ? (
            <p className={`${card} t-meta border-dashed px-4 py-5 text-center`}>{r.nothingYet}</p>
          ) : (
            <ul className={`${card} divide-y divide-border overflow-hidden`}>
              {g.items.slice(0, 8).map((x) => (
                <li key={x.code}>
                  <Link
                    to={`/requests/${x.code}`}
                    className="flex items-center gap-3 px-4 py-3 motion-interactive hover:bg-surface"
                  >
                    <StatusDot status={x.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">{x.details}</span>
                      <span className="t-meta flex flex-wrap gap-x-3 text-[0.75rem]">
                        <span>{r.status[x.status]}</span>
                        <span>{timeAgo(x.createdAt, locale)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">{ringgit(x.tipSen)}</span>
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
