import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { ArrowRight, Sparkles, GraduationCap, Bug, Rocket } from "lucide-react";

export default function Landing() {
  const { t, user } = useApp();

  const features = [
    { icon: GraduationCap, color: "text-sky-400", bg: "bg-sky-500/10", title: t("appName"), desc: t("heroSubtitle") },
    { icon: Bug, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", title: "DevMentor AI", desc: "Explica erros e códigos em linguagem simples." },
    { icon: Rocket, color: "text-emerald-400", bg: "bg-emerald-500/10", title: "10+ Projetos", desc: "Templates prontos para começar hoje mesmo." },
  ];

  return (
    <div className="relative">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl animate-fade-slide">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
            <span className="text-xs font-mono uppercase tracking-widest text-fuchsia-300">Powered by AI</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            {t("heroTitle").split(" ").slice(0, -3).join(" ")}{" "}
            <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
              {t("heroTitle").split(" ").slice(-3).join(" ")}
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">{t("heroSubtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to={user ? "/dashboard" : "/register"}>
              <Button size="lg" data-testid="cta-get-started"
                className="rounded-full h-12 px-7 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-base group">
                {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/explore">
              <Button size="lg" variant="outline" data-testid="cta-explore"
                className="rounded-full h-12 px-7 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-base">
                {t("exploreIdeas")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-sky-400 mb-4">{t("features")}</div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="relative p-8 rounded-2xl bg-slate-900/60 border border-white/5 card-hover overflow-hidden noise">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} strokeWidth={2} />
                </div>
                <div className="text-xl font-semibold mb-2">{f.title}</div>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
