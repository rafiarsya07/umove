import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { useLive } from "../../lib/live";
import { TelegramAlerts } from "../../components/TelegramAlerts";
import { PageTitle, panel, type Stats } from "./AdminLayout";

export default function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  const load = () => {
    api<Stats>("/admin/stats")
      .then(setS)
      .catch(() => {});
  };
  useEffect(load, []);
  useLive(load);
  useLive(load, "support");

  const tiles: { label: string; value: number | undefined; to: string; hint?: string }[] = [
    { label: "Pending applications", value: s?.pending, to: "/admin/applications" },
    { label: "Help requests to review", value: s?.supportPending, to: "/admin/support" },
    { label: "Open requests", value: s?.open, to: "/admin/requests?status=open" },
    { label: "Requests in progress", value: s?.active, to: "/admin/requests?status=on_the_way" },
    { label: "Delivered (7 days)", value: s?.delivered7d, to: "/admin/requests?status=delivered" },
    { label: "Users", value: s?.users, to: "/admin/users", hint: s ? `+${s.newUsers7d} this week` : undefined },
    { label: "Active runners", value: s?.runners, to: "/admin/users" },
    { label: "Suspended users", value: s?.suspended, to: "/admin/users" },
  ];

  return (
    <div>
      <PageTitle title="Overview" lead="UMOVE right now. Updates live." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`${panel} p-4 motion-interactive hover:border-border-strong`}>
            <p className="t-meta">{t.label}</p>
            <p className="mt-2 font-display text-[1.75rem] leading-none font-bold tabular-nums">{t.value ?? "–"}</p>
            {t.hint ? <p className="t-meta mt-1 text-[0.75rem]">{t.hint}</p> : null}
          </Link>
        ))}
      </div>
      <TelegramAlerts className="mt-6 max-w-2xl" />
    </div>
  );
}
