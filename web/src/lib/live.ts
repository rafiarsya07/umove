import { useEffect, useRef } from "react";

/**
 * Live updates. One EventSource per tab, shared by every component that
 * listens. The server only names a topic ("requests" or "support"); each
 * listener then refetches what it needs through the normal API.
 */
export type LiveTopic = "requests" | "support";
type Listener = { topic: LiveTopic; fn: () => void };
const listeners = new Set<Listener>();
let source: EventSource | null = null;

function connect() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/live");
  source.addEventListener("change", (e) => {
    const topic = ((e as MessageEvent).data || "requests") as LiveTopic;
    listeners.forEach((l) => l.topic === topic && l.fn());
  });
  // The browser reconnects by itself after a network drop or server restart.
}

function disconnectIfIdle() {
  if (listeners.size === 0 && source) {
    source.close();
    source = null;
  }
}

/** Reconnect so the stream knows who is signed in (call after sign in / out). */
export function resetLive() {
  source?.close();
  source = null;
  if (listeners.size) connect();
}

export function useLive(onChange: () => void, topic: LiveTopic = "requests") {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    const l: Listener = { topic, fn: () => ref.current() };
    listeners.add(l);
    connect();
    return () => {
      listeners.delete(l);
      disconnectIfIdle();
    };
  }, [topic]);
}
