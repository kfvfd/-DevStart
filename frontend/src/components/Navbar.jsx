import { Link, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import NotificationBell from "./NotificationBell";
import { Code2, LayoutDashboard, Sparkles, LogOut, MessageCircleQuestion, Shield, LifeBuoy } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "./ui/dropdown-menu";

export default function Navbar() {
  const { user, logout, lang, changeLang, t } = useApp();
  const navigate = useNavigate();
  const loc = useLocation();

  const langLabel = { pt: "PT", en: "EN", es: "ES" }[lang];

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/explore", label: t("explore"), icon: Sparkles, testid: "nav-explore" },
    { to: "/devmentor", label: t("devmentor"), icon: MessageCircleQuestion, testid: "nav-devmentor" },
    { to: "/tickets", label: t("helpNav"), icon: LifeBuoy, testid: "nav-tickets" },
  ];
  if (user?.role === "admin") {
    nav.push({ to: "/admin", label: t("adminPanel"), icon: Shield, testid: "nav-admin" });
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group" data-testid="brand-link">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-fuchsia-500 flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
            <Code2 className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">Dev<span className="text-sky-400">Start</span></span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => {
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} data-testid={n.testid}
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors duration-200 ${
                    active ? "bg-sky-500/15 text-sky-300" : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                  <n.icon className="w-4 h-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="lang-switcher" className="rounded-full text-xs font-mono h-9 px-3 hover:bg-white/5">
                {langLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
              <DropdownMenuItem data-testid="lang-pt" onClick={() => changeLang("pt")}>Português</DropdownMenuItem>
              <DropdownMenuItem data-testid="lang-en" onClick={() => changeLang("en")}>English</DropdownMenuItem>
              <DropdownMenuItem data-testid="lang-es" onClick={() => changeLang("es")}>Español</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="user-menu" className="rounded-full h-9 gap-2 hover:bg-white/5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-slate-950">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-sm">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                <DropdownMenuItem data-testid="logout-btn" onClick={() => { logout(); navigate("/"); }}>
                  <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" data-testid="nav-login-btn" onClick={() => navigate("/login")}
                className="rounded-full h-9 hover:bg-white/5">{t("login")}</Button>
              <Button size="sm" data-testid="nav-register-btn" onClick={() => navigate("/register")}
                className="rounded-full h-9 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">{t("register")}</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
