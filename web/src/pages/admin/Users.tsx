import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Badge, btn } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { PageTitle, panel } from "./AdminLayout";

type Row = {
  id: string;
  name: string;
  username: string;
  email: string;
  whatsapp: string | null;
  college: string;
  status: "active" | "suspended";
  runner: string | null;
  joined: string;
  requests: number;
  runs: number;
};

export default function Users() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((query: string) => {
    api<Row[]>(`/admin/users?q=${encodeURIComponent(query)}`)
      .then(setRows)
      .catch(() => setError("Could not load users."));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  const setStatus = async (u: Row, status: Row["status"]) => {
    setError(null);
    try {
      await api(`/admin/users/${u.id}/status`, { method: "POST", body: { status } });
      load(q);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "self"
          ? "You can't suspend yourself."
          : code === "protected"
            ? "Admins can't be suspended from the panel."
            : "That action failed.",
      );
    }
  };

  /** Runners can't rename themselves; they ask in Help chat and an admin does it here. */
  const rename = async (u: Row) => {
    const name = window.prompt(`New name for @${u.username}`, u.name)?.trim();
    if (!name || name === u.name) return;
    setError(null);
    try {
      await api(`/admin/users/${u.id}/name`, { method: "POST", body: { name } });
      load(q);
    } catch {
      setError("Couldn't rename. Names are 1 to 40 characters.");
    }
  };

  return (
    <div>
      <PageTitle title="Users" lead="Search by name, username or email. Suspending signs the person out everywhere." />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users…"
        maxLength={60}
        className="mb-4 h-11 w-full max-w-md rounded-(--radius-control) border border-border-input bg-card px-3 text-[0.9375rem] focus:border-foreground focus:outline-none"
      />
      {error ? <p className="mb-4 text-[0.875rem] text-danger">{error}</p> : null}
      {rows === null ? (
        <p className="t-meta">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="t-meta">No users found.</p>
      ) : (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-[0.875rem]">
            <thead className="border-b border-border text-[0.75rem] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">User</th>
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                <th className="px-4 py-2.5 font-semibold">Runner</th>
                <th className="px-4 py-2.5 font-semibold tabular-nums">Requests / runs</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <Link to={`/u/${u.username}`} className="font-semibold hover:underline">
                      {u.name}
                    </Link>
                    <p className="t-meta text-[0.75rem]">
                      @{u.username}
                      {u.college ? ` · ${u.college}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{u.email}</p>
                    <p className="t-meta text-[0.75rem]">{u.whatsapp ?? "–"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.runner === "active" ? (
                      <Badge tone="success">Runner</Badge>
                    ) : u.runner === "pending" ? (
                      <Badge tone="warning">Pending</Badge>
                    ) : (
                      <span className="t-meta">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {u.requests} / {u.runs}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "active" ? "muted" : "danger"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" className={`${btn.small} mr-1.5`} onClick={() => rename(u)}>
                      Rename
                    </button>
                    {u.status === "active" ? (
                      <button type="button" className={btn.small} onClick={() => setStatus(u, "suspended")}>
                        Suspend
                      </button>
                    ) : (
                      <button type="button" className={btn.small} onClick={() => setStatus(u, "active")}>
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
