import { useEffect, useRef } from "react";

/**
 * Live updates. One EventSource per tab, shared by every component that
 * listens. The server only says "requests changed"; each listener then
 * refetches what it needs through the normal API.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function connect() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/live");
  source.addEventListener("change", () => listeners.forEach((l) => l()));
  // The browser reconnects by itself after a network drop or server restart.
}

function disconnectIfIdle() {
  if (listeners.size === 0 && source) {
    source.close();
    source = null;
  }
}

export function useLive(onChange: () => void) {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    const l = () => ref.current();
    listeners.add(l);
    connect();
    return () => {
      listeners.delete(l);
      disconnectIfIdle();
    };
  }, []);
}
