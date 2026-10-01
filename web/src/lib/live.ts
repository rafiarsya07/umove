import { useEffect, useRef } from "react";

/**
 * Live updates. One EventSource per tab, shared by every component that
 * listens. The server only names a topic ("requests", "support" or "site");
 * each listener then refetches what it needs through the normal API.
 *
 * Staying live is the hard part, so this module never gives up:
 *   - EventSource retries by itself after a network drop, but NOT after an
 *     HTTP error (e.g. a 503 while the mini PC restarts during an update or
 *     the tunnel blinks). Then we reconnect ourselves, with a growing delay.
 *   - After any reconnect, every listener refetches once: events sent while
 *     we were away are not replayed, so this catches up on what was missed.
 *   - Phones freeze background tabs. Coming back to the tab, or the network
 *     coming back, also reconnects and catches up.
 */
export type LiveTopic = "requests" | "support" | "site";
type Listener = { topic: LiveTopic; fn: () => void };
const listeners = new Set<Listener>();
let source: EventSource | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 1000;
let everConnected = false;
let lastEventAt = 0;

const MAX_DELAY = 30_000;
/** The server pings every 25 s; nothing for this long means the stream is silently dead. */
const STALE_MS = 70_000;

function notifyAll() {
  listeners.forEach((l) => l.fn());
}

function connect() {
  if (source || typeof EventSource === "undefined" || listeners.size === 0) return;
  clearTimeout(retryTimer);
  const es = new EventSource("/api/live");
  source = es;
  const alive = () => {
    lastEventAt = Date.now();
  };
  es.addEventListener("ready", () => {
    alive();
    retryDelay = 1000;
    // A reconnect (not the first connect): catch up on anything missed.
    if (everConnected) notifyAll();
    everConnected = true;
  });
  es.addEventListener("ping", alive);
  es.addEventListener("change", (e) => {
    alive();
    const topic = ((e as MessageEvent).data || "requests") as LiveTopic;
    listeners.forEach((l) => l.topic === topic && l.fn());
  });
  es.onerror = () => {
    // CONNECTING = the browser is retrying by itself; CLOSED = it gave up (HTTP error).
    if (es.readyState === EventSource.CLOSED) scheduleReconnect();
  };
}

function scheduleReconnect() {
  source?.close();
  source = null;
  clearTimeout(retryTimer);
  if (listeners.size === 0) return;
  retryTimer = setTimeout(connect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
}

/** Back to the tab, network back, or the stream went quiet: reconnect now and catch up. */
function wake() {
  if (listeners.size === 0) return;
  const dead = !source || source.readyState === EventSource.CLOSED || Date.now() - lastEventAt > STALE_MS;
  if (dead) {
    retryDelay = 1000;
    source?.close();
    source = null;
    connect();
  }
  // Even with a healthy stream, a frozen background tab may have missed events.
  notifyAll();
}

if (typeof window !== "undefined") {
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    // A quick glance at another tab doesn't need a refetch; a longer absence does.
    else if (Date.now() - hiddenAt > 10_000) wake();
  });
  window.addEventListener("online", wake);
  // A silent dead stream (no pings) is replaced.
  setInterval(() => {
    if (source && lastEventAt && Date.now() - lastEventAt > STALE_MS && document.visibilityState === "visible") wake();
  }, 30_000);
}

function disconnectIfIdle() {
  if (listeners.size === 0) {
    clearTimeout(retryTimer);
    source?.close();
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
