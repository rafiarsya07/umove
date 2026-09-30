import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AdminMaintenanceNotice, BroadcastBar, MaintenanceScreen } from "./components/SiteNotices";
import { useSession } from "./lib/session";
import { useStatus } from "./lib/status";
import Home from "./pages/Home";

// Pages load on demand; only the home page ships in the first bundle.
const AdminBroadcasts = lazy(() => import("./pages/admin/Broadcasts"));
const AdminMaintenance = lazy(() => import("./pages/admin/Maintenance"));
const AdminPlaces = lazy(() => import("./pages/admin/Places"));
const AccountLayout = lazy(() => import("./pages/AccountLayout"));
const Apply = lazy(() => import("./pages/Apply"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminApplications = lazy(() => import("./pages/admin/Applications"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminRequests = lazy(() => import("./pages/admin/Requests"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSupport = lazy(() => import("./pages/admin/Support"));
const Faq = lazy(() => import("./pages/Faq"));
const Help = lazy(() => import("./pages/Help"));
const Login = lazy(() => import("./pages/Login"));
const NewRequest = lazy(() => import("./pages/NewRequest"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const Runner = lazy(() => import("./pages/Runner"));
const Settings = lazy(() => import("./pages/Settings"));

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

export default function App() {
  const { pathname } = useLocation();
  const { user, loading } = useSession();
  const { status } = useStatus();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <>
        <ScrollManager />
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
      </>
    );
  }

  // Maintenance (or server unreachable): everyone but admins sees one calm screen.
  // Sign-in stays reachable so an admin can get in.
  if (status.maintenance.on && !loading && !user?.isAdmin && pathname !== "/login") {
    return <MaintenanceScreen />;
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
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/runner" element={<Runner />} />
            <Route path="/faq" element={<Faq />} />
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
