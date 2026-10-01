import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { Footer } from "./components/Footer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { resilient } from "./lib/recover";
import { useI18n } from "./i18n";
import { Header } from "./components/Header";
import { AdminMaintenanceNotice, BroadcastBar, MaintenanceScreen } from "./components/SiteNotices";
import { useSession } from "./lib/session";
import { useStatus } from "./lib/status";
import Home from "./pages/Home";

// Pages load on demand so the first visit is light; right after the first
// paint the browser fetches the rest in the background (prefetchPages), so
// moving between pages is instant instead of waiting for code each time.
const pages = {
  AdminBroadcasts: () => import("./pages/admin/Broadcasts"),
  AdminMaintenance: () => import("./pages/admin/Maintenance"),
  AdminPlaces: () => import("./pages/admin/Places"),
  AccountLayout: () => import("./pages/AccountLayout"),
  Apply: () => import("./pages/Apply"),
  Dashboard: () => import("./pages/Dashboard"),
  AdminApplications: () => import("./pages/admin/Applications"),
  AdminAudit: () => import("./pages/admin/Audit"),
  AdminLayout: () => import("./pages/admin/AdminLayout"),
  AdminOverview: () => import("./pages/admin/Overview"),
  AdminRequests: () => import("./pages/admin/Requests"),
  AdminUsers: () => import("./pages/admin/Users"),
  AdminSupport: () => import("./pages/admin/Support"),
  Faq: () => import("./pages/Faq"),
  Legal: () => import("./pages/Legal"),
  Help: () => import("./pages/Help"),
  Login: () => import("./pages/Login"),
  NewRequest: () => import("./pages/NewRequest"),
  RequestDetail: () => import("./pages/RequestDetail"),
  Requests: () => import("./pages/Requests"),
  NotFound: () => import("./pages/NotFound"),
  Profile: () => import("./pages/Profile"),
  Runner: () => import("./pages/Runner"),
  Settings: () => import("./pages/Settings"),
};
const AdminBroadcasts = lazy(resilient(pages.AdminBroadcasts));
const AdminMaintenance = lazy(resilient(pages.AdminMaintenance));
const AdminPlaces = lazy(resilient(pages.AdminPlaces));
const AccountLayout = lazy(resilient(pages.AccountLayout));
const Apply = lazy(resilient(pages.Apply));
const Dashboard = lazy(resilient(pages.Dashboard));
const AdminApplications = lazy(resilient(pages.AdminApplications));
const AdminAudit = lazy(resilient(pages.AdminAudit));
const AdminLayout = lazy(resilient(pages.AdminLayout));
const AdminOverview = lazy(resilient(pages.AdminOverview));
const AdminRequests = lazy(resilient(pages.AdminRequests));
const AdminUsers = lazy(resilient(pages.AdminUsers));
const AdminSupport = lazy(resilient(pages.AdminSupport));
const Faq = lazy(resilient(pages.Faq));
const Legal = lazy(resilient(pages.Legal));
const Help = lazy(resilient(pages.Help));
const Login = lazy(resilient(pages.Login));
const NewRequest = lazy(resilient(pages.NewRequest));
const RequestDetail = lazy(resilient(pages.RequestDetail));
const Requests = lazy(resilient(pages.Requests));
const NotFound = lazy(resilient(pages.NotFound));
const Profile = lazy(resilient(pages.Profile));
const Runner = lazy(resilient(pages.Runner));
const Settings = lazy(resilient(pages.Settings));

const MEMBER_PAGES = [
  "Requests",
  "RequestDetail",
  "NewRequest",
  "Dashboard",
  "AccountLayout",
  "Settings",
  "Help",
  "Faq",
  "Runner",
  "Profile",
  "Login",
  "Apply",
  "Legal",
] as const;
const ADMIN_PAGES = (Object.keys(pages) as (keyof typeof pages)[]).filter((k) => k.startsWith("Admin"));

function prefetchPages(isAdmin: boolean) {
  const list = isAdmin ? [...MEMBER_PAGES, ...ADMIN_PAGES] : MEMBER_PAGES;
  const run = () => list.forEach((k) => void pages[k]().catch(() => {}));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}

/** Top of the page on navigation; to the anchor when the link has one. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** A crash in one page shows a reload card instead of a blank screen. */
function Safe({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  return (
    <ErrorBoundary title={t.common.crashTitle} body={t.common.crashBody} action={t.common.reload} resetKey={pathname}>
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const { user, loading } = useSession();
  const { status } = useStatus();
  useEffect(() => {
    if (!loading) prefetchPages(Boolean(user?.isAdmin));
  }, [loading, user?.isAdmin]);
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <>
        <ScrollManager />
        <Safe>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="applications" element={<AdminApplications />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="broadcasts" element={<AdminBroadcasts />} />
                <Route path="places" element={<AdminPlaces />} />
                <Route path="maintenance" element={<AdminMaintenance />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>
            </Routes>
          </Suspense>
        </Safe>
      </>
    );
  }

  // Maintenance (or server unreachable): everyone but admins sees one calm screen.
  // Sign-in stays reachable so an admin can get in.
  if (status.maintenance.on && !loading && !user?.isAdmin) {
    if (pathname !== "/login") return <MaintenanceScreen />;
    // Only the sign-in card while UMOVE is closed: the rest of the site isn't reachable anyway.
    return (
      <div className="flex min-h-dvh items-center bg-background text-foreground">
        <Safe>
          <Suspense fallback={<PageLoading />}>
            <Login />
          </Suspense>
        </Safe>
      </div>
    );
  }

  // The whole app sits on its own white surface. The page background is set
  // too, but some browser dark modes and extensions repaint <html>/<body>;
  // an element with an explicit background is left alone.
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ScrollManager />
      <AdminMaintenanceNotice />
      <Header />
      <BroadcastBar />
      <main className="flex-1">
        <Safe>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/runner" element={<Runner />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/privacy" element={<Legal kind="privacy" />} />
              <Route path="/terms" element={<Legal kind="terms" />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/requests/:code" element={<RequestDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route element={<AccountLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/requests/new" element={<NewRequest />} />
                <Route path="/apply/:role" element={<Apply />} />
                <Route path="/help" element={<Help />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Safe>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

/** Shown for a moment while a page's code loads; quiet on purpose. */
function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
