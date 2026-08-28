import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, CheckCircle2, Hand, RotateCcw, Shield } from "lucide-react";

const STAFF = ["admin", "moderator", "collaborator"];
const STATUS = {
  waiting: { key: "statusWaiting", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  in_progress: { key: "statusInProgress", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  resolved: { key: "statusResolved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const { t, user } = useApp();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const isStaff = STAFF.includes(user?.role);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/tickets/${id}`);
      setData(r.data);
    } catch {
      toast.error("Ticket não encontrado");
      nav("/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${id}/messages`, { content: text });
      setText("");
      await load();
    } catch {
      toast.error("Erro");
    } finally {
      setSending(false);
    }
  };

  const claim = async () => { await api.patch(`/tickets/${id}/claim`); await load(); toast.success(t("statusInProgress")); };
  const setStatus = async (s) => { await api.patch(`/tickets/${id}/status`, { status: s }); await load(); };

  if (loading || !data) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;
  const tk = data.ticket;
  const st = STATUS[tk.status] || STATUS.waiting;

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 animate-fade-slide" data-testid="ticket-detail">
      <Button variant="ghost" onClick={() => nav("/tickets")} data-testid="back-tickets" className="hover:bg-white/5 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1.5" />{t("backToTickets")}
      </Button>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border ${st.cls}`} data-testid="ticket-status">{t(st.key)}</span>
          <span className="text-xs font-mono text-slate-500">#{tk.id.slice(0, 8)}</span>
        </div>
        {tk.project_name && <div className="text-xs font-mono text-sky-400 mb-2">{tk.project_name}{tk.step_title ? ` · ${tk.step_title}` : ""}</div>}
        <p className="text-slate-200">{tk.problem}</p>
        <div className="text-xs text-slate-500 mt-3 font-mono">{tk.user_name} · {tk.assignee_name ? `${t("assignedTo")}: ${tk.assignee_name}` : t("unassigned")}</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {isStaff && !tk.assignee_id && tk.status !== "resolved" && (
          <Button data-testid="claim-btn" onClick={claim} className="rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
            <Hand className="w-4 h-4 mr-1.5" />{t("claim")}
          </Button>
        )}
        {tk.status !== "resolved" ? (
          <Button data-testid="resolve-btn" onClick={() => setStatus("resolved")} className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />{t("markResolved")}
          </Button>
        ) : (
          <Button data-testid="reopen-btn" variant="outline" onClick={() => setStatus("in_progress")} className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
            <RotateCcw className="w-4 h-4 mr-1.5" />{t("reopen")}
          </Button>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {data.messages.map((m) => {
          const own = m.sender_id === user?.id;
          const staff = STAFF.includes(m.sender_role);
          return (
            <div key={m.id} data-testid={`ticket-msg-${m.id}`} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl border ${own ? "bg-sky-500/10 border-sky-500/20" : "bg-slate-900/60 border-white/5"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {staff && <Shield className="w-3 h-3 text-fuchsia-400" />}
                  <span className={`text-xs font-medium ${staff ? "text-fuchsia-300" : "text-slate-400"}`}>{m.sender_name}</span>
                </div>
                <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {tk.status !== "resolved" && (
        <div className="flex gap-2 items-end sticky bottom-4">
          <Textarea data-testid="ticket-reply-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("sendReply")}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="bg-slate-900/80 border-white/10 resize-none min-h-[52px] backdrop-blur-xl" />
          <Button data-testid="ticket-send-btn" onClick={send} disabled={sending || !text.trim()}
            className="rounded-full h-[52px] w-[52px] bg-sky-500 hover:bg-sky-400 text-slate-950 flex-shrink-0 p-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
