import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AdminMaintenanceNotice, BroadcastBar, MaintenanceScreen } from "./components/SiteNotices";
import { useSession } from "./lib/session";
import { useStatus } from "./lib/status";
import AdminBroadcasts from "./pages/admin/Broadcasts";
import AdminMaintenance from "./pages/admin/Maintenance";
import AdminPlaces from "./pages/admin/Places";
import AccountLayout from "./pages/AccountLayout";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import AdminApplications from "./pages/admin/Applications";
import AdminAudit from "./pages/admin/Audit";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import AdminRequests from "./pages/admin/Requests";
import AdminUsers from "./pages/admin/Users";
import AdminSupport from "./pages/admin/Support";
import Faq from "./pages/Faq";
import Help from "./pages/Help";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import Requests from "./pages/Requests";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Runner from "./pages/Runner";
import Settings from "./pages/Settings";

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
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
