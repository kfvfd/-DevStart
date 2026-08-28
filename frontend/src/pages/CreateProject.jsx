import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const LANGUAGES = ["JavaScript", "Python", "HTML/CSS", "TypeScript", "Java", "C#", "Ruby", "Go", "PHP", "Swift"];
const FRAMEWORKS = ["HTML/CSS/JS", "React", "Vue", "Angular", "Node.js", "FastAPI", "Django", "Flask", "Next.js", "React Native", "Fetch API", "Node.js + Socket.IO", "Nenhum"];

export default function CreateProject() {
  const { t, lang } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "", description: "", level: "Iniciante",
    language: "JavaScript", framework: "HTML/CSS/JS", goal: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tpl = params.get("tpl");
    if (tpl) {
      try {
        const data = JSON.parse(decodeURIComponent(tpl));
        setForm({
          name: data.name || "",
          description: data.description || "",
          level: data.level || "Iniciante",
          language: data.language || "JavaScript",
          framework: data.framework || "HTML/CSS/JS",
          goal: data.goal || "",
        });
      } catch {}
    }
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/projects", { ...form, language_ui: lang });
      toast.success("Projeto criado!");
      nav(`/projects/${r.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao criar projeto");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-slide">
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-fuchsia-400 mb-2">{t("createProject")}</div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">{t("createProject")}</h1>
      <p className="text-slate-400 mb-8">Nossa IA vai criar um passo a passo personalizado.</p>

      <form onSubmit={submit} className="space-y-6 p-8 rounded-2xl bg-slate-900/60 border border-white/5">
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("projectName")}</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="input-project-name" placeholder="Ex: Lista de Tarefas" className="bg-slate-950/60 border-white/10 h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("description")}</Label>
          <Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-testid="input-project-desc" placeholder="Descreva brevemente o projeto" className="bg-slate-950/60 border-white/10 resize-none" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("level")}</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger data-testid="select-level" className="bg-slate-950/60 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="Iniciante">{t("beginner")}</SelectItem>
                <SelectItem value="Basico">{t("basic")}</SelectItem>
                <SelectItem value="Intermediario">{t("intermediate")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("language")}</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger data-testid="select-language" className="bg-slate-950/60 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-64">
                {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("framework")}</Label>
            <Select value={form.framework} onValueChange={(v) => setForm({ ...form, framework: v })}>
              <SelectTrigger data-testid="select-framework" className="bg-slate-950/60 border-white/10 h-11"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-64">
                {FRAMEWORKS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("goal")}</Label>
          <Textarea required rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
            data-testid="input-project-goal" placeholder="O que você quer aprender ou construir?" className="bg-slate-950/60 border-white/10 resize-none" />
        </div>
        <Button type="submit" disabled={loading} data-testid="submit-create-project"
          className="w-full h-12 rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-500 hover:opacity-90 text-slate-950 font-semibold text-base">
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando etapas com IA...</>) : (<><Wand2 className="w-4 h-4 mr-2" /> {t("generateProject")}</>)}
        </Button>
      </form>
    </div>
  );
}
