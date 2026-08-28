import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "./ui/dropdown-menu";
import { Bell, LifeBuoy } from "lucide-react";

export default function NotificationBell() {
  const { t } = useApp();
  const nav = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  const loadCount = useCallback(() => {
    api.get("/notifications/unread_count").then((r) => setCount(r.data.count)).catch(() => {});
  }, []);

  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, 30000);
    const onVis = () => { if (document.visibilityState === "visible") loadCount(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", loadCount);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", loadCount);
    };
  }, [loadCount]);

  const onOpen = (o) => {
    if (o) api.get("/notifications").then((r) => setItems(r.data)).catch(() => {});
  };

  const go = async (n) => {
    await api.post("/notifications/read", { ids: [n.id] }).catch(() => {});
    loadCount();
    if (n.ticket_id) nav(`/tickets/${n.ticket_id}`);
  };

  const markAll = async () => {
    await api.post("/notifications/read", {}).catch(() => {});
    loadCount();
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  return (
    <DropdownMenu onOpenChange={onOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="notif-bell" className="relative rounded-full h-9 w-9 hover:bg-white/5">
          <Bell className="w-5 h-5 text-slate-300" />
          {count > 0 && (
            <span data-testid="notif-badge" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-fuchsia-500 text-[10px] font-bold text-white flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-sm font-medium">{t("notifications")}</span>
          {count > 0 && <button data-testid="notif-mark-all" onClick={markAll} className="text-xs text-sky-400 hover:text-sky-300">{t("markAllRead")}</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">{t("noNotifications")}</div>
          ) : items.map((n) => (
            <button key={n.id} data-testid={`notif-item-${n.id}`} onClick={() => go(n)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors duration-150 border-b border-white/5 last:border-0 ${n.read ? "opacity-50" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center flex-shrink-0">
                <LifeBuoy className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-snug min-w-0">{n.message}</p>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
