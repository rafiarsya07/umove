import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Container } from "../components/Container";
import { Logo } from "../components/Logo";
import { GoogleMark } from "../components/ui";
import { fmt, useI18n } from "../i18n";
import { useSession } from "../lib/session";

/** Google sign-in, and nothing else. The whole flow runs on the server. */
export default function Login() {
  const { t } = useI18n();
  const { user, loading, signOut } = useSession();
  const [params] = useSearchParams();
  const [leaving, setLeaving] = useState(false);
  const l = t.login;
  // "Admin sign in" (e.g. from the maintenance screen) while signed in with a
  // member account: offer to switch instead of bouncing back to the same screen.
  const wantsAdmin = params.get("next") === "/admin";
  const wrongAccount = !loading && user && !user.isAdmin && wantsAdmin;

  if (!loading && user && !wrongAccount) return <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} replace />;

  const errorKey = params.get("error") as keyof typeof l.errors | null;
  const error = errorKey && errorKey in l.errors ? l.errors[errorKey] : null;
  const next = params.get("next");
  const href = `/api/auth/google${next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <Container className="max-w-md py-10 sm:py-16">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Logo />
        <h1 className="t-page-title mt-6">{l.title}</h1>
        <p className="t-body mt-1 text-muted-foreground">{l.lead}</p>

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-(--radius-control) bg-warning-soft px-3 py-2.5 text-[0.875rem] text-warning"
          >
            {error}
          </p>
        ) : null}

        {wrongAccount ? (
          <div className="mt-5 rounded-(--radius-control) border border-border bg-surface px-3 py-3 text-[0.875rem]">
            <p>{fmt(l.notAdmin, { name: user.name })}</p>
            <button
              type="button"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                await signOut();
                setLeaving(false);
              }}
              className="mt-2 font-semibold text-primary-strong hover:underline disabled:opacity-60"
            >
              {l.switchAccount}
            </button>
          </div>
        ) : null}

        <a
          href={href}
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-(--radius-control) border border-border-input bg-card text-[0.9375rem] font-semibold motion-pressable hover:bg-surface"
        >
          <GoogleMark />
          {l.google}
        </a>

        <p className="t-meta mt-6 border-t border-border pt-4 text-[0.75rem]">{l.agree}</p>
      </div>
    </Container>
  );
}
