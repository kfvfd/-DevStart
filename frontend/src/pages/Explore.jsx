import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

const LEVEL_STYLE = {
  Iniciante: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Basico: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Intermediario: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

export default function Explore() {
  const { t } = useApp();
  const nav = useNavigate();
  const [tpls, setTpls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/templates").then((r) => setTpls(r.data)).finally(() => setLoading(false));
  }, []);

  const start = (tpl) => {
    const q = encodeURIComponent(JSON.stringify(tpl));
    nav(`/projects/new?tpl=${q}`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-slide">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-fuchsia-400 mb-2">{t("explore")}</div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">{t("exploreIdeas")}</h1>
      <p className="text-slate-400 mb-10 max-w-2xl">Escolha um projeto pronto e comece a codar em segundos. Nossa IA cria as etapas personalizadas para você.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tpls.map((tpl, i) => (
          <div key={i} data-testid={`template-${i}`}
            className="group p-6 rounded-2xl bg-slate-900/60 border border-white/5 card-hover relative overflow-hidden noise">
            <div className={`inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${LEVEL_STYLE[tpl.level]} mb-4`}>
              {tpl.level}
            </div>
            <h3 className="text-xl font-semibold mb-2">{tpl.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4 min-h-[3rem]">{tpl.description}</p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-5">
              <span>{tpl.language}</span>·<span>{tpl.framework}</span>
            </div>
            <Button onClick={() => start(tpl)} data-testid={`template-start-${i}`}
              className="w-full rounded-full bg-white/5 border border-white/10 hover:bg-sky-500 hover:text-slate-950 hover:border-sky-500 text-white font-medium group/btn">
              {t("startProject")} <ArrowRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
