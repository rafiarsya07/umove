import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLive } from "./live";
import { useSession } from "./session";

/**
 * Site status: maintenance mode and the broadcasts this viewer should see.
 * Refreshed on load, when an admin changes something (live "site" event),
 * when the tab regains focus, and every 5 minutes (scheduled broadcasts).
 * While the site is down it re-checks every 20 seconds.
 */
export type Broadcast = {
  id: number;
  title: string;
  body: string;
  tone: "info" | "warning" | "success";
  audience: "all" | "members" | "runners";
  linkPath: string | null;
};
export type Maintenance = {
  on: boolean;
  /** "offline": the server can't be reached; "maintenance": switched on by hand. */
  reason?: "offline" | "maintenance";
  message: string | null;
  until: string | null;
};
type Status = { maintenance: Maintenance; broadcasts: Broadcast[] };

const OK: Status = { maintenance: { on: false, message: null, until: null }, broadcasts: [] };
const Ctx = createContext<{ status: Status; reload: () => void }>({ status: OK, reload: () => {} });

export function StatusProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [status, setStatus] = useState<Status>(OK);

  const reload = useCallback(() => {
    fetch("/api/status", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : Promise.reject()))
      .then(setStatus)
      .catch(() => {
        /* keep the last known status; pages show their own offline state */
      });
  }, []);

  useEffect(reload, [reload, user?.username]);
  useLive(reload, "site");
  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && reload();
    const onMaint = () => reload();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("umove:maintenance", onMaint);
    const every = setInterval(reload, status.maintenance.on ? 20_000 : 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("umove:maintenance", onMaint);
      clearInterval(every);
    };
  }, [reload, status.maintenance.on]);

  return <Ctx.Provider value={{ status, reload }}>{children}</Ctx.Provider>;
}

export const useStatus = () => useContext(Ctx);
