import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import DevMentorChat from "../components/DevMentorChat";
import { Check, HelpCircle, Bug, Star, Trash2, ArrowLeft, MessageCircleQuestion, ChevronRight, Loader2, Target } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDetail() {
  const { id } = useParams();
  const { t } = useApp();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [chat, setChat] = useState(null); // { prompt, mode }
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get(`/projects/${id}`);
      setProject(r.data);
      const firstNotDone = r.data.steps.findIndex((s) => !s.completed);
      setActiveIdx(firstNotDone >= 0 ? firstNotDone : 0);
    } catch {
      toast.error("Projeto não encontrado");
      nav("/dashboard");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const toggleStep = async (sid) => {
    try {
      await api.patch(`/projects/${id}/steps/${sid}/complete`);
      await load();
      toast.success("Progresso salvo!");
    } catch { toast.error("Erro ao atualizar"); }
  };

  const toggleFav = async () => {
    const r = await api.patch(`/projects/${id}/favorite`);
    setProject({ ...project, favorite: r.data.favorite });
  };

  const del = async () => {
    await api.delete(`/projects/${id}`);
    toast.success("Projeto excluído");
    nav("/dashboard");
  };

  if (loading || !project) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  const done = project.steps.filter((s) => s.completed).length;
  const total = project.steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const step = project.steps[activeIdx];

  const askMentor = (mode) => {
    let prompt = "";
    if (mode === "explain") prompt = `Não entendi esta etapa: "${step.title}". Explique com palavras simples.\n\nCódigo:\n\`\`\`\n${step.code}\n\`\`\``;
    if (mode === "help") prompt = `Preciso de ajuda para continuar nesta etapa: "${step.title}". Objetivo: ${step.objective}`;
    if (mode === "error") prompt = `Estou com um erro nesta etapa: "${step.title}". `;
    setChat({ prompt, mode });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 animate-fade-slide">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => nav("/dashboard")} data-testid="back-btn" className="hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> {t("dashboard")}
        </Button>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleFav} data-testid="fav-btn" className="rounded-full hover:bg-white/5">
            <Star className={`w-5 h-5 ${project.favorite ? "fill-amber-300 text-amber-300" : "text-slate-400"}`} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="delete-btn" className="rounded-full hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="cancel-delete">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction data-testid="confirm-delete" onClick={del} className="bg-red-500 hover:bg-red-400 text-white">{t("delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mb-8">
        <div className="text-xs font-mono uppercase tracking-[0.25em] text-sky-400 mb-2">{project.language} · {project.framework} · {project.level}</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">{project.name}</h1>
        <p className="text-slate-400 max-w-3xl">{project.description}</p>
      </div>

      <div className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t("overallProgress")}</span>
          <span className="text-xs font-mono text-slate-400">{done}/{total} {t("stepsCompleted")}</span>
        </div>
        <Progress value={pct} className="h-2 bg-slate-800" data-testid="project-progress" />
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500 px-2 mb-2">Etapas ({total})</div>
          {project.steps.map((s, i) => (
            <button key={s.id} onClick={() => setActiveIdx(i)} data-testid={`step-nav-${i}`}
              className={`w-full text-left p-3 rounded-xl border transition-colors duration-200 flex items-start gap-3 ${
                i === activeIdx ? "bg-sky-500/10 border-sky-500/30" : "bg-slate-900/40 border-white/5 hover:border-white/15"
              }`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                s.completed ? "bg-emerald-500 text-slate-950" :
                i === activeIdx ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}>
                {s.completed ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium leading-snug ${i === activeIdx ? "text-white" : "text-slate-300"}`}>{s.title}</div>
              </div>
              {i === activeIdx && <ChevronRight className="w-4 h-4 text-sky-400 flex-shrink-0" />}
            </button>
          ))}
        </aside>

        <main className="min-w-0">
          {step && (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-white/5 animate-fade-slide" key={step.id}>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-fuchsia-400 mb-3">
                {t("step")} {activeIdx + 1} · {project.steps.length}
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">{step.title}</h2>

              <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-300 mb-2">
                  <Target className="w-3.5 h-3.5" /> {t("objective")}
                </div>
                <p className="text-slate-200">{step.objective}</p>
              </div>

              <div className="mb-6">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">{t("explanation")}</div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{step.explanation}</p>
              </div>

              {step.code && (
                <div className="mb-6">
                  <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">{t("code")}</div>
                  <pre className="code-block"><code>{step.code}</code></pre>
                  {step.code_explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-950/40 border border-white/5">
                      <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-2">{t("codeExplanation")}</div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{step.code_explanation}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                <Button data-testid="btn-mark-complete" onClick={() => toggleStep(step.id)}
                  className={`rounded-full h-11 font-semibold ${
                    step.completed ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  }`}>
                  <Check className="w-4 h-4 mr-1.5" /> {step.completed ? t("markIncomplete") : t("markComplete")}
                </Button>

                <Sheet open={!!chat} onOpenChange={(o) => !o && setChat(null)}>
                  <SheetTrigger asChild>
                    <Button data-testid="btn-dont-understand" variant="outline" onClick={() => askMentor("explain")}
                      className="rounded-full h-11 bg-white/5 border-white/10 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 hover:text-fuchsia-300">
                      <HelpCircle className="w-4 h-4 mr-1.5" /> {t("dontUnderstand")}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl bg-slate-950 border-white/10 p-0 overflow-hidden">
                    <div className="h-full flex flex-col p-4">
                      {chat && <DevMentorChat projectId={project.id} stepId={step.id} initialPrompt={chat.prompt} initialMode={chat.mode} compact />}
                    </div>
                  </SheetContent>
                </Sheet>

                <Button data-testid="btn-need-help" variant="outline" onClick={() => askMentor("help")}
                  className="rounded-full h-11 bg-white/5 border-white/10 hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-300">
                  <MessageCircleQuestion className="w-4 h-4 mr-1.5" /> {t("needHelp")}
                </Button>

                <Button data-testid="btn-error" variant="outline" onClick={() => askMentor("error")}
                  className="rounded-full h-11 bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300">
                  <Bug className="w-4 h-4 mr-1.5" /> Está dando erro
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
