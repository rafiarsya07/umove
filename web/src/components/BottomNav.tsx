import type { ComponentType } from "react";
import { NavLink } from "react-router";
import { useI18n } from "../i18n";
import { useSession } from "../lib/session";
import { HomeIcon, PlusIcon, RequestsIcon, SettingsIcon, UserIcon } from "./Icon";

type Item = { to: string; label: string; Icon: ComponentType<{ className?: string }>; end?: boolean; accent?: boolean };

/** Phone navigation: Home, Runner, Post, Account, Settings. */
export function BottomNav() {
  const { t } = useI18n();
  const { user } = useSession();

  const items: Item[] = [
    { to: "/", label: t.nav.home, Icon: HomeIcon, end: true },
    { to: "/requests", label: t.nav.requests, Icon: RequestsIcon, end: true },
    { to: "/requests/new", label: t.nav.tabPost, Icon: PlusIcon, accent: true, end: true },
    { to: user ? "/dashboard" : "/login", label: t.nav.account, Icon: UserIcon, end: !user },
    { to: "/settings", label: t.nav.settings, Icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label={t.nav.menu}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map(({ to, label, Icon, end, accent }, i) => (
          <li key={i} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-15 flex-col items-center justify-center gap-0.5 motion-interactive ${
                  isActive && !accent ? "text-foreground" : "text-muted-foreground"
                }`
              }
            >
              <span className="flex size-7 items-center justify-center">
                {accent ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                ) : (
                  <Icon className="size-[1.375rem]" />
                )}
              </span>
              <span className="max-w-full truncate px-1 text-[0.6875rem] font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
