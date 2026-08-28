import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Check, Trash2, BookOpen, ExternalLink } from "lucide-react";

export default function Moderation() {
  const { t } = useApp();
  const [data, setData] = useState({ items: [], counts: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get("/moderation/knowledge?status=pending").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id) => {
    try { const r = await api.patch(`/moderation/knowledge/${id}/review`); toast.success(r.data.reviewed ? t("reviewedLabel") : t("awaitingReview")); load(); }
    catch { toast.error("Erro"); }
  };
  const reject = async (id) => {
    try { await api.delete(`/moderation/knowledge/${id}`); toast.success(t("reject")); load(); }
    catch { toast.error("Erro"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-slide" data-testid="moderation-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
        <div className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400">{t("moderationNav")}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">{t("moderationTitle")}</h1>
      <p className="text-slate-400 mb-8 max-w-2xl">{t("moderationSubtitle")}</p>

      <div className="flex gap-3 mb-6 text-xs font-mono">
        <span className="px-3 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">{t("pendingTab")}: {data.counts.pending || 0}</span>
        <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">{t("reviewedLabel")}: {data.counts.reviewed || 0}</span>
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{t("approvedTab")}: {data.counts.approved || 0}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>
      ) : data.items.length === 0 ? (
        <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-900/40 border border-dashed border-white/10">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />{t("noKnowledge")}
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((k) => (
            <div key={k.id} data-testid={`mod-knowledge-${k.id}`} className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold">{k.title}</h3>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full border flex-shrink-0 ${k.reviewed ? "bg-sky-500/15 text-sky-300 border-sky-500/30" : "bg-amber-400/15 text-amber-300 border-amber-400/30"}`}>
                  {k.reviewed ? t("reviewedLabel") : t("awaitingReview")}
                </span>
              </div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">{t("problemLabel")}</div>
              <p className="text-sm text-slate-300 mb-3">{k.problem}</p>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">{t("solutionLabel")}</div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{k.solution}</p>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>{t("createdByLabel")}: {k.created_by}{k.language ? ` · ${k.language}` : ""}</span>
                  {k.ticket_id && (
                    <Link to={`/tickets/${k.ticket_id}`} data-testid={`mod-open-ticket-${k.id}`} className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {t("openTicket")}
                    </Link>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button data-testid={`review-knowledge-${k.id}`} onClick={() => review(k.id)}
                    className={`rounded-full h-9 font-semibold ${k.reviewed ? "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10" : "bg-sky-500 hover:bg-sky-400 text-slate-950"}`}>
                    <Check className="w-4 h-4 mr-1.5" />{k.reviewed ? t("unmarkReviewed") : t("markReviewed")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`reject-knowledge-${k.id}`}
                        className="rounded-full h-9 w-9 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("reject")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">{k.title}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full bg-white/5 border-white/10 hover:bg-white/10">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction data-testid={`confirm-reject-knowledge-${k.id}`} onClick={() => reject(k.id)}
                          className="rounded-full bg-red-500 hover:bg-red-400 text-white">{t("confirm")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
