import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Badge, btn, type BadgeTone } from "../../components/ui";
import { api } from "../../lib/api";
import { ringgit } from "../../lib/format";
import { useLive } from "../../lib/live";
import { PageTitle, panel } from "./AdminLayout";

type Row = {
  id: number;
  details: string;
  pickup: string;
  dropoff: string;
  tipSen: number;
  status: string;
  createdAt: string;
  customer: string;
  runner: string | null;
};

const FILTERS = ["all", "open", "accepted", "on_the_way", "delivered", "cancelled"];
const TONE: Record<string, BadgeTone> = {
  open: "live",
  accepted: "warning",
  on_the_way: "warning",
  delivered: "success",
  cancelled: "muted",
};

export default function Requests() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Row[]>(`/admin/requests${status === "all" ? "" : `?status=${status}`}`)
      .then(setRows)
      .catch(() => setError("Could not load requests."));
  }, [status]);
  useEffect(load, [load]);
  useLive(load);

  const cancel = async (r: Row) => {
    if (!window.confirm(`Cancel request #${r.id}? Both sides will see it as cancelled.`)) return;
    try {
      await api(`/admin/requests/${r.id}/cancel`, { method: "POST" });
      load();
    } catch {
      setError("That request can't be cancelled any more.");
    }
  };

  return (
    <div>
      <PageTitle title="Requests" lead="Every request on UMOVE. Cancel anything that breaks the rules." />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setParams(f === "all" ? {} : { status: f })}
            className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium motion-interactive ${
              status === f
                ? "bg-foreground text-background"
                : "border border-border bg-card text-foreground-secondary hover:text-foreground"
            }`}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {error ? <p className="mb-4 text-[0.875rem] text-danger">{error}</p> : null}
      {rows === null ? (
        <p className="t-meta">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="t-meta">Nothing here.</p>
      ) : (
        <ul className={`${panel} divide-y divide-border`}>
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold">
                  #{r.id} · {r.details}
                </p>
                <p className="t-meta truncate">
                  {r.pickup} → {r.dropoff} · @{r.customer}
                  {r.runner ? ` → @${r.runner}` : ""} · {new Date(r.createdAt).toLocaleString("en-MY")}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{ringgit(r.tipSen)}</span>
              <Badge tone={TONE[r.status] ?? "muted"}>{r.status.replace(/_/g, " ")}</Badge>
              {["open", "accepted", "on_the_way"].includes(r.status) ? (
                <button type="button" className={btn.small} onClick={() => cancel(r)}>
                  Cancel
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
