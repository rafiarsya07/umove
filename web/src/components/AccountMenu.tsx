import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Link, useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { useSession } from "../lib/session";
import { useSupportUnread } from "../lib/support";
import { ChatIcon, ChevronDownIcon, LogoutIcon, SettingsIcon } from "./Icon";
import { Avatar } from "./ui";

/**
 * Visitor: a Settings icon (language and theme are a page, not a popover)
 * and "Sign in". Member: an avatar menu with Dashboard, Profile, Settings
 * and Sign out.
 */
export function AccountMenu() {
  const { t } = useI18n();
  const { user, loading, signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) return <span className="inline-block size-9" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link
          to="/settings"
          aria-label={t.nav.settings}
          title={t.nav.settings}
          className="hidden size-9 items-center justify-center rounded-full text-foreground-secondary motion-interactive hover:bg-surface hover:text-foreground md:inline-flex"
        >
          <SettingsIcon />
        </Link>
        <Link
          to="/login"
          className="inline-flex h-9 items-center rounded-full px-3 text-[0.875rem] font-semibold text-foreground-secondary motion-interactive hover:bg-surface hover:text-foreground"
        >
          {t.nav.signIn}
        </Link>
      </div>
    );
  }

  return <MemberMenu open={open} setOpen={setOpen} menuRef={ref} />;
}

/** The signed-in menu. A component of its own so the unread count only runs for members. */
function MemberMenu({
  open,
  setOpen,
  menuRef: ref,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  menuRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useI18n();
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const unread = useSupportUnread();
  if (!user) return null;
  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-[0.875rem] text-foreground-secondary motion-interactive hover:bg-surface hover:text-foreground";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o: boolean) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.nav.account}
        className="inline-flex h-9 items-center gap-1 rounded-full py-1 pr-2 pl-1 text-foreground-secondary motion-interactive hover:bg-surface hover:text-foreground"
      >
        <span className="relative">
          <Avatar name={user.name} size="sm" />
          {unread ? (
            <span className="absolute -top-1 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[0.625rem] leading-4 font-bold text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </span>
        <ChevronDownIcon className="size-3.5" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-(--radius-surface) border border-border bg-card py-1 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.25)]"
        >
          <div className="border-b border-border px-3 pt-2 pb-2.5">
            <p className="truncate text-[0.875rem] font-semibold">{user.name}</p>
            <p className="t-meta truncate">@{user.username}</p>
          </div>
          <div className="py-1">
            <Link to="/dashboard" role="menuitem" onClick={() => setOpen(false)} className={item}>
              {t.nav.dashboard}
            </Link>
            <Link to={`/u/${user.username}`} role="menuitem" onClick={() => setOpen(false)} className={item}>
              {t.nav.profile}
            </Link>
            <Link to="/settings" role="menuitem" onClick={() => setOpen(false)} className={item}>
              <SettingsIcon className="size-4" />
              {t.nav.settings}
            </Link>
            <Link to="/help" role="menuitem" onClick={() => setOpen(false)} className={item}>
              <ChatIcon className="size-4" />
              <span className="flex-1">{t.help.nav}</span>
              {unread ? (
                <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-bold text-primary-foreground">
                  {unread}
                </span>
              ) : null}
            </Link>
            {user.isAdmin ? (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`${item} font-semibold text-primary-strong`}
              >
                {t.nav.admin} panel
              </Link>
            ) : null}
          </div>
          <div className="border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut().then(() => navigate("/"));
              }}
              className={item}
            >
              <LogoutIcon />
              {t.nav.signOut}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
