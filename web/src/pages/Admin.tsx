import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { btn } from "../components/ui";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

type Application = {
  userId: string;
  role: string;
  name: string;
  username: string;
  email: string;
  whatsapp: string | null;
  college: string;
  applied: string;
};

/**
 * Admin: approve or reject runner applications. English only by design.
 * The server checks ADMIN_EMAILS on every call; hiding this page is only
 * a convenience.
 */
export default function Admin() {
  const { user } = useSession();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Application[]>("/admin/applications")
      .then(setApps)
      .catch(() => setError("Could not load applications."));
  }, []);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin, load]);

  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;

  const decide = async (a: Application, decision: "approve" | "reject") => {
    setBusy(a.userId);
    try {
      await api(`/admin/applications/${a.userId}/${a.role}`, { method: "POST", body: { decision } });
      setApps((list) => list?.filter((x) => !(x.userId === a.userId && x.role === a.role)) ?? null);
    } catch {
      setError("That action failed. Refresh and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="t-page-title">Admin</h1>
      <p className="t-body mt-1 text-muted-foreground">
        Runner applications. Check the person on WhatsApp (and their matric card) before approving.
      </p>

      {error ? <p className="mt-4 text-[0.875rem] text-danger">{error}</p> : null}

      <div className="mt-6">
        {apps === null ? (
          <p className="t-meta">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="t-meta">No pending applications.</p>
        ) : (
          <ul className="divide-y divide-border rounded-(--radius-surface) border border-border">
            {apps.map((a) => (
              <li key={`${a.userId}-${a.role}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold">
                    {a.name} <span className="t-meta font-normal">@{a.username}</span>
                  </p>
                  <p className="t-meta">
                    {a.role} · {a.email} · {a.whatsapp ?? "no WhatsApp"} {a.college ? `· ${a.college}` : ""}
                  </p>
                  <p className="t-meta text-[0.75rem]">Applied {new Date(a.applied).toLocaleString("en-MY")}</p>
                </div>
                <div className="flex gap-2">
                  {a.whatsapp ? (
                    <a
                      className={btn.small}
                      href={`https://wa.me/${a.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className={`${btn.small} disabled:opacity-60`}
                    disabled={busy === a.userId}
                    onClick={() => decide(a, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center rounded-full bg-foreground px-3.5 text-[0.8125rem] font-semibold text-background motion-pressable hover:opacity-90 disabled:opacity-60"
                    disabled={busy === a.userId}
                    onClick={() => decide(a, "approve")}
                  >
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
