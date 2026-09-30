import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { BottomNav } from "./components/BottomNav";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import AccountLayout from "./pages/AccountLayout";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
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
  // The whole app sits on its own white surface. The page background is set
  // too, but some browser dark modes and extensions repaint <html>/<body>;
  // an element with an explicit background is left alone.
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ScrollManager />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runner" element={<Runner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route element={<AccountLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
