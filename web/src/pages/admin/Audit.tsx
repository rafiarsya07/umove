import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PageTitle, panel } from "./AdminLayout";

type Row = { id: number; actor: string | null; action: string; target: string | null; at: string };

const LABEL: Record<string, string> = {
  "role.runner.approve": "Approved a runner",
  "role.runner.reject": "Rejected a runner",
  "user.suspended": "Suspended a user",
  "user.active": "Restored a user",
  "request.cancel": "Cancelled a request",
};

/** Every admin action, newest first. The log is append-only in the database. */
export default function Audit() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    api<Row[]>("/admin/audit")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <div>
      <PageTitle title="Audit log" lead="Every admin action, newest first. Entries can't be edited or deleted." />
      {rows === null ? (
        <p className="t-meta">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="t-meta">No admin actions yet.</p>
      ) : (
        <ul className={`${panel} divide-y divide-border`}>
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[0.875rem]">
              <span className="font-semibold">@{r.actor ?? "?"}</span>
              <span>{LABEL[r.action] ?? r.action}</span>
              <span className="t-meta truncate text-[0.75rem]">{r.target}</span>
              <span className="t-meta ml-auto text-[0.75rem]">{new Date(r.at).toLocaleString("en-MY")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
