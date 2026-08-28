import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Code2 } from "lucide-react";

export default function Login() {
  const { login, t } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo(a)!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Falha ao entrar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-slide">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-fuchsia-500 flex items-center justify-center mb-4">
            <Code2 className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("login")}</h1>
          <p className="text-slate-400 mt-2 text-sm">{t("tagline")}</p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8 rounded-2xl bg-slate-900/60 border border-white/5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("email")}</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email" className="bg-slate-950/60 border-white/10 h-11 focus:ring-2 focus:ring-sky-400" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-slate-400">{t("password")}</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password" className="bg-slate-950/60 border-white/10 h-11 focus:ring-2 focus:ring-sky-400" />
          </div>
          <Button type="submit" disabled={loading} data-testid="login-submit"
            className="w-full h-11 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
            {loading ? "..." : t("login")}
          </Button>
          <div className="text-center text-sm text-slate-400">
            <Link to="/register" data-testid="link-register" className="text-sky-400 hover:text-sky-300 hover:underline">{t("register")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
