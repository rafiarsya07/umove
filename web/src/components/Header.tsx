import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { useI18n } from "../i18n";
import { AccountMenu } from "./AccountMenu";
import { Container } from "./Container";
import { PlusIcon } from "./Icon";
import { Logo } from "./Logo";

const HIDE_AFTER = 120;
const THRESHOLD = 6;

/**
 * Logo, two destinations, the account area, and one action.
 * Slides away on scroll down and returns on scroll up (transform only),
 * never while something inside it has focus.
 */
export function Header() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < THRESHOLD) return;
      lastY = y;
      if (reduced.matches || y < HIDE_AFTER || ref.current?.matches(":focus-within")) {
        setHidden(false);
        return;
      }
      setHidden(delta > 0);
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  const nav = [
    { to: "/requests", label: t.nav.requests, end: false },
    { to: "/runner", label: t.nav.runner, end: false },
    { to: "/#how", label: t.nav.how, end: true },
  ];

  return (
    <header
      ref={ref}
      data-hidden={hidden ? "true" : undefined}
      className="sticky top-0 z-40 border-b border-border bg-background transition-transform duration-200 ease-out data-[hidden=true]:-translate-y-full motion-reduce:transition-none"
    >
      <Container>
        <div className="flex h-15 items-center gap-6">
          <Logo />

          <nav aria-label={t.nav.menu} className="hidden items-center gap-1 md:flex">
            {nav.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-[0.875rem] font-medium motion-interactive hover:bg-surface hover:text-foreground ${
                    isActive && !link.to.includes("#") ? "text-foreground" : "text-foreground-secondary"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <AccountMenu />
            <Link
              to="/requests/new"
              className="hidden h-9 items-center gap-1.5 rounded-full bg-primary pr-4 pl-3 text-[0.875rem] font-semibold text-primary-foreground motion-pressable hover:bg-primary-hover sm:inline-flex"
            >
              <PlusIcon className="size-4" />
              {t.nav.post}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
