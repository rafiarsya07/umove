import type { ComponentType, ReactNode } from "react";
import { initialOf } from "../lib/format";
import { StarIcon } from "./Icon";

/** The segmented control used by the language and theme settings. */
export function Segment({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 }) {
  return (
    <span
      className={`grid w-full gap-0.5 rounded-full bg-muted p-0.5 sm:inline-grid sm:w-auto ${
        columns === 2 ? "grid-cols-2" : "grid-cols-3"
      }`}
    >
      {children}
    </span>
  );
}

export function segmentClass(selected: boolean): string {
  return `min-h-8 rounded-full px-3.5 py-1 text-[0.8125rem] leading-tight font-medium motion-interactive ${
    selected ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
  }`;
}

/** One settings group: title on the left (on top on a phone), controls beside it. */
export function SettingsRow({
  id,
  title,
  lead,
  children,
}: {
  id?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-4 py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-[1rem] font-semibold">{title}</h2>
        {lead ? <p className="t-meta mt-1 leading-relaxed">{lead}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A section title with its icon in a soft tile. */
export function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-surface text-foreground ring-1 ring-border"
        >
          <Icon className="size-5" />
        </span>
        <span className="t-section-title">{title}</span>
      </h2>
      {action}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "size-16 text-[1.5rem] sm:size-20 sm:text-[1.75rem]"
      : size === "sm"
        ? "size-7 text-[0.75rem]"
        : "size-10 text-[1rem]";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-foreground font-display font-bold text-background ${cls}`}
    >
      {initialOf(name)}
    </span>
  );
}

export function Stars({ value, className = "size-3.5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={`${className} ${i <= Math.round(value) ? "text-star" : "text-border-strong"}`} />
      ))}
    </span>
  );
}

/** Small orange check disc, used for "verified". */
export function VerifiedMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="8" fill="var(--primary)" />
      <path
        d="M4.8 8.2l2.1 2.1 4.3-4.5"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The Google "G" in Google's own colours, as their sign-in guidelines ask. */
export function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export const btn = {
  primary:
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-[0.9375rem] font-semibold whitespace-nowrap text-primary-foreground motion-pressable hover:bg-primary-hover",
  ink: "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 text-[0.9375rem] font-semibold whitespace-nowrap text-background motion-pressable hover:opacity-90",
  outline:
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-border-strong px-5 text-[0.9375rem] font-semibold whitespace-nowrap motion-pressable hover:bg-surface",
  small:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border-strong px-3.5 text-[0.8125rem] font-semibold whitespace-nowrap motion-pressable hover:bg-surface",
};
