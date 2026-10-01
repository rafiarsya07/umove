/**
 * Self-healing for the two failures a deployed single-page app actually hits:
 *
 * 1. A new version was released while this tab was open. The old page asks
 *    for code chunks that no longer exist (404), so a page never loads. The
 *    fix is a fresh load of the site, done once, automatically.
 * 2. A flaky connection drops a chunk download. One quiet retry fixes it.
 *
 * The "reload once" guard lives in sessionStorage with a time stamp, so a
 * truly broken release can never put a phone into a reload loop.
 */
const KEY = "umove-reloaded-at";
const WINDOW_MS = 60_000;

export function reloadOnce(): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
  } catch {
    /* storage blocked: still allow one reload per page life */
  }
  if (Date.now() - last < WINDOW_MS) return false;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

export function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically|ChunkLoadError|Unable to preload CSS/i.test(
    msg,
  );
}

/** Wrap a lazy page import: retry once after a short pause, then reload the site once. */
export function resilient<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch(
      (err) =>
        new Promise<T>((resolve, reject) => {
          setTimeout(() => {
            load()
              .then(resolve)
              .catch((err2) => {
                if (isChunkError(err2) && reloadOnce()) return; // the page is reloading
                reject(err2 ?? err);
              });
          }, 600);
        }),
    );
}

if (typeof window !== "undefined") {
  // Vite reports a failed preload of a chunk's dependencies here.
  window.addEventListener("vite:preloadError", (e) => {
    if (reloadOnce()) e.preventDefault();
  });
}
