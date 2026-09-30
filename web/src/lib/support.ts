import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useLive } from "./live";
import { useSession } from "./session";

export type SupportMessage = { id: number; fromAdmin: boolean; body: string; createdAt: string; author: string | null };

/** Unread replies from the UMOVE team, kept fresh by the live stream. */
export function useSupportUnread(): number {
  const { user } = useSession();
  const [n, setN] = useState(0);
  const load = useCallback(() => {
    if (!user) return setN(0);
    api<{ unread: number }>("/me/support/unread")
      .then((r) => setN(r.unread))
      .catch(() => {});
  }, [user]);
  useEffect(load, [load]);
  useLive(load, "support");
  return n;
}
