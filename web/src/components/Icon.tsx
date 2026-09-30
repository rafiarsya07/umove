import type { ReactNode } from "react";

/**
 * UMove icons. Drawn for UMove, not taken from a stock set:
 * a confident 1.75 ink line, plus ONE orange accent shape per icon
 * (a handle, a wheel, a check). The accent always uses --primary, so the
 * icons carry the brand even at 20px.
 *
 * All icons are decorative (aria-hidden); the accessible name lives on the
 * control around them.
 */
type IconProps = { className?: string };

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const accent = { fill: "var(--primary)", stroke: "none" } as const;

function Svg({ className = "size-6", children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line}>
      {children}
    </svg>
  );
}

/* ---- Services --------------------------------------------------------- */

/** Runner: a takeaway bag with an orange handle tag and speed lines. */
export const RunnerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 9h11l-1.1 10.6a1.6 1.6 0 01-1.6 1.4h-5.6a1.6 1.6 0 01-1.6-1.4z" />
    <path d="M12 9V7.5a2.5 2.5 0 015 0V9" />
    <circle cx="14.5" cy="14.5" r="2.1" {...accent} />
    <path d="M2 11.5h4M3 15h3.5M2 18.5h4.5" />
  </Svg>
);

/** Ride: a small hatchback with orange wheels. */
export const RideIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 16.5v-3.2c0-.7.4-1.3 1-1.6l2.2-1 2-3.2A2 2 0 019.9 6.6h4.6a2 2 0 011.6.8l2.6 3.4 1.9.6c.8.3 1.4 1 1.4 1.9v3.2" />
    <path d="M8.2 10.7h10.3" />
    <path d="M9.5 16.5h5" />
    <circle cx="6.8" cy="16.8" r="2.3" {...accent} />
    <circle cx="17.2" cy="16.8" r="2.3" {...accent} />
  </Svg>
);

/** Market: a price tag with an orange eyelet. */
export const MarketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12.3V5a1.5 1.5 0 011.5-1.5h7.3l8.2 8.2a1.6 1.6 0 010 2.3l-6.9 6.9a1.6 1.6 0 01-2.3 0z" />
    <circle cx="8.3" cy="8.3" r="2" {...accent} />
    <path d="M11 14.5l3.5-3.5" />
  </Svg>
);

/* ---- Runner perks ---------------------------------------------------- */

/** Schedule: a clock with an orange hand. */
export const ScheduleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5" />
    <path d="M12 12l3.4 2" stroke="var(--primary)" strokeWidth={2.4} />
  </Svg>
);

/** Keep 100%: a wallet with an orange clasp. */
export const KeepIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18.5 7.5V6A1.5 1.5 0 0017 4.5H5.5a2 2 0 000 4" />
    <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
    <rect x="14.5" y="11.5" width="6" height="4" rx="1.2" {...accent} />
  </Svg>
);

/** Alerts: a bell with an orange ping. */
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2 2 0 004 0" />
    <circle cx="18" cy="5.5" r="2.6" {...accent} />
  </Svg>
);

/* ---- UI --------------------------------------------------------------- */

export const ArrowRightIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" strokeWidth={2} />
  </Svg>
);

export const ArrowDownIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M12 5v14M6 13l6 6 6-6" strokeWidth={2} />
  </Svg>
);

export const ChevronDownIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M6 9l6 6 6-6" strokeWidth={2} />
  </Svg>
);

export const CheckIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.4} />
  </Svg>
);

/** Steps: three stacked stops on a route, the last one orange. */
export const StepsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="6" cy="18" r="2.2" />
    <circle cx="18" cy="12" r="2.4" {...accent} />
    <path d="M8.2 6H13a3 3 0 013 3v.6M8.2 18H13a3 3 0 003-3v-.6" />
  </Svg>
);

/** Question: a speech bubble with an orange dot under the mark. */
export const QuestionIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 11.5A7.5 7.5 0 018.8 18l-4.3 1.3 1.3-3.9A7.5 7.5 0 1120 11.5z" />
    <path d="M10.2 9.4a1.9 1.9 0 113 1.5c-.7.5-1.2.9-1.2 1.7" />
    <circle cx="12" cy="15" r="1.2" {...accent} />
  </Svg>
);

export const SettingsIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Svg>
);

export const UserIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </Svg>
);

export const HomeIcon = ({ className = "size-[1.375rem]" }: IconProps) => (
  <Svg className={className}>
    <path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5h-3.5v-6h-6v6H5.5A1.5 1.5 0 014 19z" />
  </Svg>
);

export const PlusIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" strokeWidth={2.2} />
  </Svg>
);

export const ChevronRightIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M9 6l6 6-6 6" strokeWidth={2} />
  </Svg>
);

export const LogoutIcon = ({ className = "size-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M14 4.5H6.5a2 2 0 00-2 2v11a2 2 0 002 2H14M10 12h10M16.5 8.5L20 12l-3.5 3.5" />
  </Svg>
);

export const GlobeIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z" />
  </Svg>
);

export const SunIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Svg>
);

export const MoonIcon = ({ className = "size-[1.125rem]" }: IconProps) => (
  <Svg className={className}>
    <path d="M19.5 14.5A7.5 7.5 0 019.5 4.5a7.5 7.5 0 1010 10z" />
  </Svg>
);

export const StarIcon = ({ className = "size-3.5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
  </svg>
);

export const PinIcon = ({ className = "size-4" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 22s-7-6-7-11.5a7 7 0 0114 0C19 16 12 22 12 22z" fill="var(--primary)" />
    <circle cx="12" cy="10.5" r="2.6" fill="var(--primary-foreground)" />
  </svg>
);
