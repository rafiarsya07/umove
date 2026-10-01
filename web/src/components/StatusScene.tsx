import type { CSSProperties } from "react";
import { useI18n } from "../i18n";
import type { RequestStatus } from "../lib/requests";
import { PickupIcon, PinIcon, RunnerIcon } from "./Icon";

type Viewer = "customer" | "runner" | null;

/**
 * A small animated picture of where an order is: a radar while it waits,
 * a pop when a runner takes it, a bag riding from pickup to drop-off, and
 * a check when it's delivered.
 *
 * Everything is CSS running on the viewer's phone (no images, no timers, no
 * extra requests), so it costs the server nothing however many people
 * watch. `key={status}` on the root replays the entrance animation when the
 * status changes live. Reduced-motion users get the same picture, still.
 */
export function StatusScene({
  status,
  viewer,
  runnerName,
}: {
  status: RequestStatus;
  viewer: Viewer;
  runnerName?: string;
}) {
  const { t } = useI18n();
  const s = t.scene;
  if (status === "cancelled") return null;

  const copy = (() => {
    if (status === "open") return viewer === "customer" ? s.open : s.openOther;
    if (status === "accepted") return viewer === "runner" ? s.foundRunner : s.found;
    if (status === "on_the_way") return viewer === "runner" ? s.wayRunner : s.way;
    return viewer === "runner" ? s.doneRunner : s.done;
  })();
  const title =
    runnerName && status === "accepted" && viewer === "customer" ? `${copy.title}: ${runnerName}` : copy.title;

  return (
    <div key={status} className="flex items-center gap-4" role="status" aria-live="polite">
      <div className="relative grid size-16 shrink-0 place-items-center">
        <Picture status={status} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-semibold">
          {title}
          {status === "open" ? <Dots /> : null}
        </p>
        <p className="t-meta mt-0.5 leading-snug">{copy.body}</p>
      </div>
    </div>
  );
}

/** The track for "on the way" is wider than the icon box, so it renders below the text. */
export function RideTrack() {
  return (
    <div className="relative mx-2 mt-4 flex items-center gap-2" aria-hidden="true">
      <PickupIcon className="size-5 shrink-0" />
      <div className="relative h-8 flex-1">
        <div className="um-dash absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full" />
        <div className="um-ride absolute top-1/2">
          <span
            className="um-bob absolute grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <RunnerIcon className="size-[1.125rem]" />
          </span>
        </div>
      </div>
      <PinIcon className="size-5 shrink-0" />
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden="true" className="ml-0.5 inline-flex">
      {[0, 1, 2].map((i) => (
        <span key={i} className="um-dot" style={{ animationDelay: `${i * 0.2}s` }}>
          .
        </span>
      ))}
    </span>
  );
}

const SPARKS = [
  [0, -30],
  [26, -15],
  [26, 15],
  [0, 30],
  [-26, 15],
  [-26, -15],
];

function Picture({ status }: { status: RequestStatus }) {
  if (status === "open") {
    return (
      <>
        {[0, 0.8, 1.6].map((d) => (
          <span
            key={d}
            className="um-ping absolute inset-0 rounded-full border-2 border-primary"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
        <span className="relative grid size-9 place-items-center rounded-full bg-primary-soft">
          <PinIcon className="size-5" />
        </span>
      </>
    );
  }
  if (status === "accepted") {
    return (
      <>
        <span className="um-burst absolute inset-1 rounded-full bg-primary-soft" />
        <span className="um-pop relative grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <RunnerIcon className="size-6" />
          <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full border-2 border-background bg-success">
            <Check className="size-3" />
          </span>
        </span>
      </>
    );
  }
  if (status === "on_the_way") {
    return (
      <span className="relative grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <span className="um-hop grid place-items-center">
          <RunnerIcon className="size-6 text-foreground" />
        </span>
      </span>
    );
  }
  // delivered
  return (
    <>
      {SPARKS.map(([dx, dy], i) => (
        <span
          key={i}
          className="um-fly absolute top-1/2 left-1/2 -mt-1 -ml-1 size-2 rounded-full"
          style={
            {
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              background: i % 2 ? "var(--primary)" : "var(--success)",
            } as CSSProperties
          }
        />
      ))}
      <span className="um-pop relative grid size-12 place-items-center rounded-full bg-success">
        <Check className="size-6" draw />
      </span>
    </>
  );
}

function Check({ className, draw }: { className: string; draw?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="#fff"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" className={draw ? "um-draw" : undefined} />
    </svg>
  );
}

/** A tiny live marker for lists: pulsing while waiting, bobbing on the way. */
export function StatusDot({ status }: { status: RequestStatus }) {
  if (status === "open")
    return (
      <span className="relative inline-grid size-2.5 place-items-center" aria-hidden="true">
        <span className="um-ping absolute -inset-1 rounded-full bg-primary" />
        <span className="relative size-2.5 rounded-full bg-primary" />
      </span>
    );
  const color =
    status === "accepted" || status === "on_the_way"
      ? "bg-primary"
      : status === "delivered"
        ? "bg-success"
        : "bg-border-strong";
  return <span className={`inline-block size-2.5 rounded-full ${color}`} aria-hidden="true" />;
}
