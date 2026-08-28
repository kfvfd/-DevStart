import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Loader2, LifeBuoy, ChevronRight, Inbox } from "lucide-react";

const STAFF = ["admin", "moderator", "collaborator"];
const STATUS = {
  waiting: { key: "statusWaiting", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30", dot: "bg-amber-400" },
  in_progress: { key: "statusInProgress", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
  resolved: { key: "statusResolved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
};

function TicketRow({ tk, t }) {
  const s = STATUS[tk.status] || STATUS.waiting;
  return (
    <Link to={`/tickets/${tk.id}`} data-testid={`ticket-row-${tk.id}`}
      className="block p-5 rounded-2xl bg-slate-900/60 border border-white/5 card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border ${s.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {t(s.key)}
            </span>
            {tk.project_name && <span className="text-xs font-mono text-slate-500 truncate">{tk.project_name}{tk.step_title ? ` · ${tk.step_title}` : ""}</span>}
          </div>
          <p className="text-slate-200 line-clamp-2">{tk.problem}</p>
          <div className="text-xs text-slate-500 mt-2 font-mono">
            {tk.user_name} · {tk.assignee_name ? `${t("assignedTo")}: ${tk.assignee_name}` : t("unassigned")}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
      </div>
    </Link>
  );
}

function List({ fetcher, t }) {
  const [items, setItems] = useState(null);
  useEffect(() => { fetcher().then((r) => setItems(r.data)); }, [fetcher]);
  if (!items) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;
  if (items.length === 0) return (
    <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-900/40 border border-dashed border-white/10">
      <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />{t("noTickets")}
    </div>
  );
  return <div className="space-y-3">{items.map((tk) => <TicketRow key={tk.id} tk={tk} t={t} />)}</div>;
}

export default function Tickets() {
  const { t, user } = useApp();
  const isStaff = STAFF.includes(user?.role);
  const [stats, setStats] = useState(null);
  useEffect(() => { if (isStaff) api.get("/tickets/stats").then((r) => setStats(r.data)); }, [isStaff]);

  const mine = useCallback(() => api.get("/tickets/mine"), []);
  const queue = useCallback(() => api.get("/tickets"), []);
  const assigned = useCallback(() => api.get("/tickets?mine=true"), []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-slide" data-testid="tickets-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center"><LifeBuoy className="w-5 h-5" /></div>
        <div className="text-xs font-mono uppercase tracking-[0.25em] text-sky-400">{isStaff ? t("helpCenter") : t("myTickets")}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-8">{isStaff ? t("helpCenter") : t("myTickets")}</h1>

      {isStaff ? (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div data-testid="ticket-stat-waiting" className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="text-xs text-amber-300 font-mono uppercase tracking-wider mb-1">{t("statusWaiting")}</div>
                <div className="text-3xl font-bold">{stats.waiting}</div>
              </div>
              <div data-testid="ticket-stat-progress" className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="text-xs text-sky-300 font-mono uppercase tracking-wider mb-1">{t("statusInProgress")}</div>
                <div className="text-3xl font-bold">{stats.in_progress}</div>
              </div>
              <div data-testid="ticket-stat-resolved" className="p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="text-xs text-emerald-300 font-mono uppercase tracking-wider mb-1">{t("statusResolved")}</div>
                <div className="text-3xl font-bold">{stats.resolved}</div>
              </div>
            </div>
          )}
          <Tabs defaultValue="queue">
            <TabsList className="bg-slate-900/60 border border-white/5 rounded-full p-1 mb-6">
              <TabsTrigger value="queue" data-testid="tab-queue" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950">{t("ticketQueue")}</TabsTrigger>
              <TabsTrigger value="assigned" data-testid="tab-assigned" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950">{t("myAssignments")}</TabsTrigger>
              <TabsTrigger value="mine" data-testid="tab-mine" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950">{t("myTickets")}</TabsTrigger>
            </TabsList>
            <TabsContent value="queue"><List fetcher={queue} t={t} /></TabsContent>
            <TabsContent value="assigned"><List fetcher={assigned} t={t} /></TabsContent>
            <TabsContent value="mine"><List fetcher={mine} t={t} /></TabsContent>
          </Tabs>
        </>
      ) : (
        <List fetcher={mine} t={t} />
      )}
    </div>
  );
}
