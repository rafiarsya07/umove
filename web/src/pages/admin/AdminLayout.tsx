import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router";
import { LogoMark } from "../../components/Logo";
import { api } from "../../lib/api";
import { useLive } from "../../lib/live";
import { useSession } from "../../lib/session";

export type Stats = {
  users: number;
  newUsers7d: number;
  runners: number;
  pending: number;
  open: number;
  active: number;
  delivered7d: number;
  suspended: number;
  support: number;
};

/**
 * The admin panel: its own shell, separate from the member app.
 * English only by design. The server checks ADMIN_EMAILS on every call;
 * this layout only decides what to show.
 */
export default function AdminLayout() {
  const { user, loading, signOut } = useSession();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<{ pending: number; support: number } | null>(null);

  const loadCounts = useCallback(() => {
    if (user?.isAdmin)
      api<Stats>("/admin/stats")
        .then((s) => setCounts({ pending: s.pending, support: s.support }))
        .catch(() => {});
  }, [user?.isAdmin]);
  useEffect(loadCounts, [loadCounts]);
  useLive(loadCounts, "support");

  if (loading) return <p className="t-meta p-8">Loading…</p>;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;

  const items = [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/applications", label: "Applications", count: counts?.pending },
    { to: "/admin/support", label: "Help chat", count: counts?.support },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/requests", label: "Requests" },
    { to: "/admin/audit", label: "Audit log" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-foreground lg:flex-row">
      <aside className="shrink-0 bg-foreground text-background lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col">
        <div className="flex h-15 items-center gap-2.5 px-5">
          <LogoMark className="size-8" />
          <span className="font-display text-[1.125rem] font-bold tracking-tight">UMOVE</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.6875rem] font-semibold">Admin</span>
          <Link to="/" className="ml-auto text-[0.8125rem] text-white/75 hover:text-white lg:hidden">
            Open app
          </Link>
        </div>
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pt-2"
        >
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center justify-between gap-3 rounded-(--radius-control) px-3 py-2 text-[0.875rem] font-medium whitespace-nowrap motion-interactive ${
                  isActive ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
                }`
              }
            >
              {i.label}
              {i.count ? (
                <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-bold text-white">
                  {i.count}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 lg:block">
          <p className="truncate px-3 text-[0.8125rem] font-semibold">{user.name}</p>
          <p className="truncate px-3 text-[0.75rem] text-white/55">{user.email}</p>
          <div className="mt-3 flex gap-1">
            <Link
              to="/"
              className="flex-1 rounded-(--radius-control) px-3 py-2 text-[0.8125rem] text-white/75 hover:bg-white/8 hover:text-white"
            >
              Open app
            </Link>
            <button
              type="button"
              onClick={() => void signOut().then(() => navigate("/"))}
              className="rounded-(--radius-control) px-3 py-2 text-[0.8125rem] text-white/75 hover:bg-white/8 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="t-page-title">{title}</h1>
      {lead ? <p className="t-body mt-1 text-muted-foreground">{lead}</p> : null}
    </div>
  );
}

export const panel = "rounded-(--radius-surface) border border-border bg-card";
