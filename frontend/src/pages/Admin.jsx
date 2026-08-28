import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Shield, Users, LayoutTemplate, BarChart3, Trash2, Pencil, Plus, Loader2, Crown,
} from "lucide-react";

const ROLES = ["user", "tester", "collaborator", "moderator", "admin"];
const ROLE_STYLE = {
  user: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  tester: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  collaborator: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  moderator: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  admin: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

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

function UsersTab({ t, currentUser }) {
  const [data, setData] = useState({ users: [], counts: {} });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get("/admin/users").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (uid, role) => {
    try {
      await api.patch(`/admin/users/${uid}/role`, { role });
      toast.success(t("save"));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const removeUser = async (uid) => {
    try {
      await api.delete(`/admin/users/${uid}`);
      toast.success(t("delete"));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  return (
    <div data-testid="admin-users-tab" className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-mono uppercase tracking-wider text-slate-500 border-b border-white/5">
        <div className="col-span-4">{t("name")}</div>
        <div className="col-span-4">{t("email")}</div>
        <div className="col-span-3">{t("roleLabel")}</div>
        <div className="col-span-1 text-right"></div>
      </div>
      {data.users.map((u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <div key={u.id} data-testid={`admin-user-row-${u.id}`}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors duration-150">
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-slate-950 flex-shrink-0">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <span className="font-medium truncate">{u.name}</span>
              {isSelf && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">{t("you")}</span>}
            </div>
            <div className="col-span-4 text-sm text-slate-400 truncate font-mono">{u.email}</div>
            <div className="col-span-3">
              <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                <SelectTrigger data-testid={`role-select-${u.id}`}
                  className={`h-9 rounded-full border text-xs font-medium ${ROLE_STYLE[u.role]} bg-transparent`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} data-testid={`role-option-${u.id}-${r}`}>{t(`role_${r}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 flex justify-start md:justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`delete-user-${u.id}`} disabled={isSelf}
                    className="rounded-full h-9 w-9 text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">{t("deleteUserConfirm")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full bg-white/5 border-white/10 hover:bg-white/10">{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction data-testid={`confirm-delete-user-${u.id}`} onClick={() => removeUser(u.id)}
                      className="rounded-full bg-red-500 hover:bg-red-400 text-white">{t("confirm")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
      {data.users.length === 0 && <div className="py-16 text-center text-slate-500">{t("noUsers")}</div>}
    </div>
  );
}

const EMPTY_TPL = { name: "", description: "", level: "Iniciante", language: "", framework: "", goal: "" };

function TemplatesTab({ t }) {
  const [tpls, setTpls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_TPL);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/templates").then((r) => setTpls(r.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY_TPL); setOpen(true); };
  const openEdit = (tpl) => { setEditing(tpl); setForm({ ...tpl }); setOpen(true); };

  const submit = async () => {
    setSaving(true);
    try {
      if (editing) await api.patch(`/admin/templates/${editing.id}`, form);
      else await api.post("/admin/templates", form);
      toast.success(t("save"));
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/templates/${id}`);
      toast.success(t("delete"));
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro");
    }
  };

  const field = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  return (
    <div data-testid="admin-templates-tab">
      <div className="flex justify-end mb-5">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-template-btn" onClick={openNew}
              className="rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> {t("newTemplate")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? t("editTemplate") : t("newTemplate")}</DialogTitle>
              <DialogDescription className="text-slate-400">{t("exploreIdeas")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input data-testid="tpl-name" placeholder={t("projectName")} value={form.name} onChange={field("name")} className="bg-slate-950/60 border-white/10" />
              <Textarea data-testid="tpl-desc" placeholder={t("description")} value={form.description} onChange={field("description")} className="bg-slate-950/60 border-white/10" />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}>
                  <SelectTrigger data-testid="tpl-level" className="bg-slate-950/60 border-white/10"><SelectValue placeholder={t("level")} /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="Iniciante">{t("beginner")}</SelectItem>
                    <SelectItem value="Basico">{t("basic")}</SelectItem>
                    <SelectItem value="Intermediario">{t("intermediate")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input data-testid="tpl-language" placeholder={t("language")} value={form.language} onChange={field("language")} className="bg-slate-950/60 border-white/10" />
              </div>
              <Input data-testid="tpl-framework" placeholder={t("framework")} value={form.framework} onChange={field("framework")} className="bg-slate-950/60 border-white/10" />
              <Textarea data-testid="tpl-goal" placeholder={t("goal")} value={form.goal} onChange={field("goal")} className="bg-slate-950/60 border-white/10" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-full hover:bg-white/5">{t("cancel")}</Button>
              <Button data-testid="save-template-btn" onClick={submit} disabled={saving || !form.name}
                className="rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tpls.map((tpl) => (
          <div key={tpl.id} data-testid={`admin-template-${tpl.id}`}
            className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 card-hover">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold">{tpl.name}</h3>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" data-testid={`edit-template-${tpl.id}`} onClick={() => openEdit(tpl)}
                  className="h-8 w-8 rounded-full text-slate-500 hover:text-sky-400 hover:bg-sky-500/10">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`delete-template-${tpl.id}`}
                      className="h-8 w-8 rounded-full text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-900 border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">{tpl.name}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full bg-white/5 border-white/10 hover:bg-white/10">{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction data-testid={`confirm-delete-template-${tpl.id}`} onClick={() => remove(tpl.id)}
                        className="rounded-full bg-red-500 hover:bg-red-400 text-white">{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2 mb-3">{tpl.description}</p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>{tpl.language}</span>·<span>{tpl.framework}</span>·<span>{tpl.level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ t }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-sky-400" /></div>;

  return (
    <div data-testid="admin-stats-tab" className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="admin-stat-users" icon={Users} label={t("totalUsers")} value={stats.total_users} accent="bg-sky-500/15 text-sky-300" />
        <StatCard testid="admin-stat-projects" icon={LayoutTemplate} label={t("totalProjects")} value={stats.total_projects} accent="bg-fuchsia-500/15 text-fuchsia-300" />
        <StatCard testid="admin-stat-completed" icon={BarChart3} label={t("completedProjects")} value={stats.completed_projects} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard testid="admin-stat-templates" icon={LayoutTemplate} label={t("totalTemplates")} value={stats.total_templates} accent="bg-amber-400/15 text-amber-300" />
      </div>
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5">
        <h3 className="text-sm font-medium mb-5">{t("usersByRole")}</h3>
        <div className="space-y-4">
          {ROLES.map((r) => {
            const count = stats.users_by_role[r] || 0;
            const pct = stats.total_users ? Math.round((count / stats.total_users) * 100) : 0;
            return (
              <div key={r} data-testid={`role-bar-${r}`} className="flex items-center gap-4">
                <span className={`text-xs font-medium w-28 px-2 py-1 rounded-full border text-center ${ROLE_STYLE[r]}`}>{t(`role_${r}`)}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-400 to-fuchsia-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-mono text-slate-400 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { t, user } = useApp();

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-slide" data-testid="admin-panel">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center">
          <Crown className="w-5 h-5" />
        </div>
        <div className="text-xs font-mono uppercase tracking-[0.25em] text-fuchsia-400">{t("adminPanel")}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-8">
        <span className="bg-gradient-to-r from-fuchsia-400 to-sky-400 bg-clip-text text-transparent">{t("adminPanel")}</span>
      </h1>

      <Tabs defaultValue="stats">
        <TabsList className="bg-slate-900/60 border border-white/5 rounded-full p-1 mb-8">
          <TabsTrigger value="stats" data-testid="tab-stats" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950 gap-2">
            <BarChart3 className="w-4 h-4" /> {t("globalStats")}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950 gap-2">
            <Users className="w-4 h-4" /> {t("usersTab")}
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates" className="rounded-full data-[state=active]:bg-sky-500 data-[state=active]:text-slate-950 gap-2">
            <LayoutTemplate className="w-4 h-4" /> {t("templatesTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stats"><StatsTab t={t} /></TabsContent>
        <TabsContent value="users"><UsersTab t={t} currentUser={user} /></TabsContent>
        <TabsContent value="templates"><TemplatesTab t={t} /></TabsContent>
      </Tabs>
    </div>
  );
}
