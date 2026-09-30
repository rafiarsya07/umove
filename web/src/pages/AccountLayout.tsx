import { Navigate, Outlet, useLocation } from "react-router";
import { Container } from "../components/Container";
import { useI18n } from "../i18n";
import { useSession } from "../lib/session";

/** Member-only pages. A visitor is sent to sign in and brought back. */
export default function AccountLayout() {
  const { t } = useI18n();
  const { user, loading } = useSession();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <Container className="max-w-4xl py-10">
        <p className="t-meta">{t.common.loading}</p>
      </Container>
    );
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  return (
    <Container className="max-w-4xl py-8 sm:py-10">
      <Outlet />
    </Container>
  );
}
