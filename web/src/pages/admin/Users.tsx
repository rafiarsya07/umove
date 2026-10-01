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
  /** Can't post requests after no-show reports from different runners. */
  postBlocked: boolean;
  /** Different runners who reported this member as a no-show (since the last unblock). */
  noShows: number;
  /** Runner role paused after flags from three different requesters. */
  runnerPaused: boolean;
  runnerFlags: number;
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

  /** After no-show reports: let them post again (clears the count). */
  const unblock = async (u: Row) => {
    if (!window.confirm(`Let @${u.username} post requests again? Their no-show count goes back to 0.`)) return;
    setError(null);
    try {
      await api(`/admin/users/${u.id}/unblock`, { method: "POST" });
      load(q);
    } catch {
      setError("That action failed.");
    }
  };

  /** Paused runner: let them take requests again (clears their flags). */
  const unpause = async (u: Row) => {
    if (!window.confirm(`Let @${u.username} take requests again? Their runner flags go back to 0.`)) return;
    setError(null);
    try {
      await api(`/admin/users/${u.id}/unpause-runner`, { method: "POST" });
      load(q);
    } catch {
      setError("That action failed.");
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
      <PageTitle
        title="Users"
        lead="Search by name, username or email. Suspending signs the person out everywhere. Members reported as a no-show by two different runners can't post until you unblock them. Runners flagged by three different requesters are paused until you unpause them."
      />
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
                    <p className="t-meta flex gap-2 text-[0.75rem]">
                      <span>@{u.username}</span>
                      {u.college ? <span>{u.college}</span> : null}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{u.email}</p>
                    <p className="t-meta text-[0.75rem]">{u.whatsapp ?? "–"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.runner === "active" && u.runnerPaused ? (
                      <Badge tone="danger">Paused</Badge>
                    ) : u.runner === "active" ? (
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
                    <span className="flex flex-wrap gap-1">
                      <Badge tone={u.status === "active" ? "muted" : "danger"}>{u.status}</Badge>
                      {u.postBlocked ? <Badge tone="danger">Can't post</Badge> : null}
                      {u.runnerFlags > 0 ? (
                        <Badge tone="warning">
                          {u.runnerFlags} runner flag{u.runnerFlags > 1 ? "s" : ""}
                        </Badge>
                      ) : null}
                      {u.noShows > 0 ? (
                        <Badge tone="warning">
                          {u.noShows} no-show{u.noShows > 1 ? "s" : ""}
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.runnerPaused || u.runnerFlags > 0 ? (
                      <button type="button" className={`${btn.small} mr-1.5`} onClick={() => unpause(u)}>
                        {u.runnerPaused ? "Unpause runner" : "Clear flags"}
                      </button>
                    ) : null}
                    {u.postBlocked || u.noShows > 0 ? (
                      <button type="button" className={`${btn.small} mr-1.5`} onClick={() => unblock(u)}>
                        {u.postBlocked ? "Unblock" : "Clear no-shows"}
                      </button>
                    ) : null}
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
