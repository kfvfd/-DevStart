import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Plus, Sparkles, Star, CircleCheck, Activity, Loader2, Flame } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent, testid }) => (
  <div data-testid={testid} className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 card-hover">
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">{label}</span>
      <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center`}>
        <Icon className="w-4 h-4" strokeWidth={2.2} />
      </div>
    </div>
    <div className="text-4xl font-bold tracking-tight">{value}</div>
  </div>
);

export default function Dashboard() {
  const { t, user } = useApp();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/stats").then((r) => setStats(r.data)),
      api.get("/projects").then((r) => setProjects(r.data)),
      api.get("/activities").then((r) => setActs(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto p-8 flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-slide">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-sky-400 mb-2">{t("dashboard")}</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {t("welcome")}, <span className="bg-gradient-to-r from-sky-400 to-fuchsia-400 bg-clip-text text-transparent">{user?.name}</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <Button data-testid="btn-create-project" onClick={() => nav("/projects/new")}
            className="rounded-full h-11 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> {t("createProject")}
          </Button>
          <Button data-testid="btn-explore" variant="outline" onClick={() => nav("/explore")}
            className="rounded-full h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
            <Sparkles className="w-4 h-4 mr-1.5" /> {t("exploreIdeas")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard testid="stat-in-progress" icon={Flame} label={t("inProgress")} value={stats.in_progress} accent="bg-sky-500/15 text-sky-300" />
        <StatCard testid="stat-completed" icon={CircleCheck} label={t("completed")} value={stats.completed} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard testid="stat-favorites" icon={Star} label={t("favorites")} value={stats.favorites} accent="bg-amber-400/15 text-amber-300" />
        <StatCard testid="stat-progress" icon={Activity} label={t("overallProgress")} value={`${stats.overall_progress}%`} accent="bg-fuchsia-500/15 text-fuchsia-300" />
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{t("overallProgress")}</span>
          <span className="text-xs font-mono text-slate-400">{stats.steps_done} {t("of")} {stats.steps_total} {t("stepsCompleted")}</span>
        </div>
        <Progress value={stats.overall_progress} className="h-2 bg-slate-800" data-testid="overall-progress-bar" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">{t("myProjects")}</h2>
          {projects.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-dashed border-white/10 text-center">
              <p className="text-slate-400 mb-4">{t("noActivities")}</p>
              <Button onClick={() => nav("/projects/new")} data-testid="empty-create-btn" className="rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
                <Plus className="w-4 h-4 mr-1.5" /> {t("createProject")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => {
                const done = p.steps.filter((s) => s.completed).length;
                const total = p.steps.length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} data-testid={`project-${p.id}`}
                    className="block p-5 rounded-2xl bg-slate-900/60 border border-white/5 card-hover">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {p.favorite && <Star className="w-4 h-4 fill-amber-300 text-amber-300" />}
                          <h3 className="font-semibold text-lg">{p.name}</h3>
                        </div>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-1">{p.description}</p>
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full ${
                        p.status === "completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"
                      }`}>
                        {p.status === "completed" ? t("completed") : t("inProgress")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="h-1.5 bg-slate-800 flex-1" />
                      <span className="text-xs font-mono text-slate-400 w-14 text-right">{done}/{total}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 font-mono">
                      <span>{p.language}</span>·<span>{p.framework}</span>·<span>{p.level}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">{t("recentActivities")}</h2>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
            {acts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">{t("noActivities")}</p>
            ) : (
              <ul className="space-y-4">
                {acts.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      a.type === "project_completed" ? "bg-emerald-400" :
                      a.type === "project_created" ? "bg-sky-400" : "bg-fuchsia-400"
                    }`} />
                    <div>
                      <div className="text-slate-300 leading-snug">{a.project_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {a.type === "project_created" ? t("createProject") :
                         a.type === "project_completed" ? t("completed") : t("step")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
