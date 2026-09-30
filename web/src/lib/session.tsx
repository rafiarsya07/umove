import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "./api";
import { resetLive } from "./live";

/**
 * The signed-in user, loaded from the API (GET /api/me). Sign-in happens on
 * the server with Google; the browser only ever holds an HttpOnly cookie.
 */

export type RoleStatus = "none" | "pending" | "active" | "rejected";
export type Roles = { runner: RoleStatus; driver: RoleStatus; seller: RoleStatus };

export type Me = {
  name: string;
  username: string;
  email: string;
  college: string;
  bio: string;
  whatsapp: string | null;
  joined: string;
  isAdmin: boolean;
  roles: Roles;
  stats: { requests: number; runs: number; rating: number | null; ratingCount: number };
};

type Ctx = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: Me) => void;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<Me>("/me");
      setUserState(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUserState(null);
    resetLive();
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, setUser: setUserState, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
