import { Link } from "react-router";
import { useI18n } from "../i18n";

/**
 * The UMove mark: a "U" drawn as a route. It starts at an orange pin,
 * goes down and around, and leaves as an arrow: a request, picked up,
 * and delivered. Ink tile, paper line; it inverts with the theme.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="var(--foreground)" />
      <path
        d="M10 10.5v6.5a6 6 0 0 0 12 0V9.5"
        fill="none"
        stroke="var(--background)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.6 12.4L22 9l3.4 3.4"
        fill="none"
        stroke="var(--background)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.6" r="2.6" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      aria-label={t.nav.homeAria}
      className={`inline-flex shrink-0 items-center gap-2 text-foreground ${className}`}
    >
      <LogoMark className="size-8" />
      <span className="font-display text-[1.3125rem] leading-none font-bold tracking-[-0.04em]">UMove</span>
    </Link>
  );
}
