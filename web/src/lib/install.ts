import { useEffect, useState } from "react";

/**
 * "Install app" support. Chrome, Edge and Samsung Internet (Android, Windows,
 * macOS, Linux, ChromeOS) fire `beforeinstallprompt`; we keep it so the
 * Settings button can open the real install dialog. iPhone/iPad Safari has
 * no such event, so we show the Share → Add to Home Screen steps instead.
 */
type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: PromptEvent | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export type InstallState = "installed" | "prompt" | "ios" | "manual";

function current(): InstallState {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (deferred) return "prompt";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

export function useInstall() {
  const [state, setState] = useState<InstallState>(() => (typeof window === "undefined" ? "manual" : current()));
  useEffect(() => {
    const f = () => setState(current());
    subs.add(f);
    f();
    return () => void subs.delete(f);
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    notify();
  };
  return { state, install };
}
