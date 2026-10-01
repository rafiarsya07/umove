import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";
import { useLive } from "./live";
import type { BoardItem } from "./requests";

/** "offline": the API could not be reached (down, restarting, not running). */
export type BoardError = "offline" | "error" | null;

/** True when the failure means the server is unreachable rather than a real error. */
export function isOffline(e: unknown) {
  return e instanceof ApiError && (e.status === 0 || e.status >= 500 || e.code === "bad_response");
}

const RETRY_MS = 8000;
/** Last board seen in this tab: shown at once when you come back, then refreshed. */
let lastBoard: BoardItem[] | null = null;

/** The open requests, kept fresh by the live stream; retries while the server is unreachable. */
export function useBoard() {
  const [items, setItems] = useState<BoardItem[] | null>(lastBoard);
  const [error, setError] = useState<BoardError>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(() => {
    clearTimeout(timer.current);
    api<BoardItem[]>("/requests")
      .then((rows) => {
        lastBoard = rows;
        setItems(rows);
        setError(null);
      })
      .catch((e) => {
        const offline = isOffline(e);
        setError(offline ? "offline" : "error");
        if (offline) timer.current = setTimeout(load, RETRY_MS);
      });
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, [load]);
  useLive(load);
  return { items, error, reload: load };
}
