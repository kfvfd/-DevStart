import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Code2 } from "lucide-react";

export default function Register() {
  const { register, t } = useApp();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success(t("welcome") + "!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao criar conta");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-slide">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-emerald-400 flex items-center justify-center mb-4">
            <Code2 className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("register")}</h1>
          <p className="text-slate-400 mt-2 text-sm">{t("tagline")}</p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8 rounded-2xl bg-slate-900/60 border border-white/5">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("name")}</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="register-name" className="bg-slate-950/60 border-white/10 h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("email")}</Label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="register-email" className="bg-slate-950/60 border-white/10 h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("password")}</Label>
            <Input required type="password" minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="register-password" className="bg-slate-950/60 border-white/10 h-11" />
          </div>
          <Button type="submit" disabled={loading} data-testid="register-submit"
            className="w-full h-11 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-semibold">
            {loading ? "..." : t("register")}
          </Button>
          <div className="text-center text-sm text-slate-400">
            <Link to="/login" data-testid="link-login" className="text-fuchsia-400 hover:text-fuchsia-300 hover:underline">{t("login")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
