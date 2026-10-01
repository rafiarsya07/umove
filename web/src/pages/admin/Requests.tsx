import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Badge, btn, type BadgeTone } from "../../components/ui";
import { api } from "../../lib/api";
import { ringgit } from "../../lib/format";
import { useLive } from "../../lib/live";
import { PageTitle, panel } from "./AdminLayout";

type Row = {
  id: number;
  code: string;
  details: string;
  pickup: string;
  dropoff: string;
  tipSen: number;
  status: string;
  createdAt: string;
  customer: string;
  runner: string | null;
  /** Waiting for an admin: the text looked like a banned item, bad word, link or phone number. */
  held: boolean;
  holdReason: string | null;
  /** Closed by itself after 3 hours with no runner. */
  expired: boolean;
};

const FILTERS = ["all", "held", "open", "accepted", "on_the_way", "delivered", "cancelled"];
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
    if (!window.confirm(`Cancel ${r.code}? Both sides will see it as cancelled.`)) return;
    try {
      await api(`/admin/requests/${r.id}/cancel`, { method: "POST" });
      load();
    } catch {
      setError("That request can't be cancelled any more.");
    }
  };

  const approve = async (r: Row) => {
    try {
      await api(`/admin/requests/${r.id}/approve`, { method: "POST" });
      load();
    } catch {
      setError("That request is no longer waiting.");
    }
  };

  return (
    <div>
      <PageTitle
        title="Requests"
        lead="Every request on UMOVE. Held ones wait for you before they reach the board: approve them if they're fine, cancel them if not."
      />
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
                  <span className="mr-2 font-mono text-[0.8125rem] text-muted-foreground">{r.code}</span>
                  {r.details}
                </p>
                <p className="t-meta flex flex-wrap gap-x-3">
                  <span className="truncate">
                    {r.pickup} → {r.dropoff}
                  </span>
                  <span>
                    @{r.customer}
                    {r.runner ? ` → @${r.runner}` : ""}
                  </span>
                  <span>{new Date(r.createdAt).toLocaleString("en-MY")}</span>
                </p>
                {r.held && r.holdReason ? (
                  <p className="mt-1 text-[0.8125rem] font-medium text-warning">Flagged for {r.holdReason}</p>
                ) : null}
              </div>
              <span className="font-semibold tabular-nums">{ringgit(r.tipSen)}</span>
              {r.held ? (
                <Badge tone="warning">held</Badge>
              ) : (
                <Badge tone={TONE[r.status] ?? "muted"}>{r.expired ? "expired" : r.status.replace(/_/g, " ")}</Badge>
              )}
              {r.held ? (
                <button type="button" className={`${btn.small} border-primary text-primary`} onClick={() => approve(r)}>
                  Approve
                </button>
              ) : null}
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
