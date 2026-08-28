import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";

const AppContext = createContext(null);

const translations = {
  pt: {
    appName: "DevStart",
    tagline: "Sua jornada de programação começa aqui.",
    login: "Entrar",
    register: "Criar conta",
    logout: "Sair",
    email: "E-mail",
    password: "Senha",
    name: "Nome",
    dashboard: "Painel",
    myProjects: "Meus Projetos",
    devmentor: "DevMentor",
    explore: "Explorar Ideias",
    createProject: "Criar novo projeto",
    exploreIdeas: "Explorar ideias de projetos",
    inProgress: "Em andamento",
    completed: "Concluídos",
    favorites: "Favoritos",
    overallProgress: "Progresso geral",
    recentActivities: "Atividades recentes",
    noActivities: "Nenhuma atividade ainda. Crie seu primeiro projeto!",
    projectName: "Nome do projeto",
    description: "Descrição",
    level: "Nível",
    language: "Linguagem de programação",
    framework: "Tecnologia / Framework",
    goal: "Objetivo do projeto",
    beginner: "Iniciante",
    basic: "Básico",
    intermediate: "Intermediário",
    generateProject: "Gerar meu projeto",
    step: "Etapa",
    objective: "Objetivo",
    explanation: "Explicação",
    code: "Código",
    codeExplanation: "Explicação do código",
    markComplete: "Marcar como concluída",
    markIncomplete: "Marcar como não concluída",
    dontUnderstand: "Não entendi",
    needHelp: "Preciso de ajuda",
    typeMessage: "Escreva sua dúvida...",
    send: "Enviar",
    thinking: "Pensando...",
    startProject: "Começar este projeto",
    welcome: "Bem-vindo(a)",
    heroTitle: "Aprenda a programar criando projetos reais",
    heroSubtitle: "Do zero ao seu primeiro app, com um professor de IA ao seu lado.",
    getStarted: "Começar grátis",
    features: "Por que DevStart?",
    of: "de",
    stepsCompleted: "etapas concluídas",
    delete: "Excluir",
    confirm: "Confirmar",
    cancel: "Cancelar",
    favorite: "Favoritar",
    adminPanel: "Painel Admin",
    usersTab: "Usuários",
    templatesTab: "Templates",
    globalStats: "Estatísticas Globais",
    roleLabel: "Função",
    edit: "Editar",
    add: "Adicionar",
    save: "Salvar",
    totalUsers: "Total de usuários",
    totalProjects: "Total de projetos",
    completedProjects: "Projetos concluídos",
    activeProjects: "Projetos ativos",
    totalTemplates: "Templates",
    usersByRole: "Usuários por função",
    newTemplate: "Novo template",
    editTemplate: "Editar template",
    noUsers: "Nenhum usuário encontrado",
    owner: "Proprietário",
    you: "Você",
    deleteUserConfirm: "Remover este usuário e todos os seus dados?",
    role_user: "Usuário",
    role_tester: "Testador",
    role_collaborator: "Colaborador",
    role_moderator: "Moderador",
    role_admin: "Admin",
  },
  en: {
    appName: "DevStart",
    tagline: "Your coding journey starts here.",
    login: "Log in",
    register: "Sign up",
    logout: "Log out",
    email: "Email",
    password: "Password",
    name: "Name",
    dashboard: "Dashboard",
    myProjects: "My Projects",
    devmentor: "DevMentor",
    explore: "Explore Ideas",
    createProject: "Create new project",
    exploreIdeas: "Explore project ideas",
    inProgress: "In progress",
    completed: "Completed",
    favorites: "Favorites",
    overallProgress: "Overall progress",
    recentActivities: "Recent activities",
    noActivities: "No activities yet. Create your first project!",
    projectName: "Project name",
    description: "Description",
    level: "Level",
    language: "Programming language",
    framework: "Technology / Framework",
    goal: "Project goal",
    beginner: "Beginner",
    basic: "Basic",
    intermediate: "Intermediate",
    generateProject: "Generate my project",
    step: "Step",
    objective: "Objective",
    explanation: "Explanation",
    code: "Code",
    codeExplanation: "Code explanation",
    markComplete: "Mark as completed",
    markIncomplete: "Mark as not completed",
    dontUnderstand: "I don't understand",
    needHelp: "I need help",
    typeMessage: "Type your question...",
    send: "Send",
    thinking: "Thinking...",
    startProject: "Start this project",
    welcome: "Welcome",
    heroTitle: "Learn to code by building real projects",
    heroSubtitle: "From zero to your first app, with an AI teacher by your side.",
    getStarted: "Get started free",
    features: "Why DevStart?",
    of: "of",
    stepsCompleted: "steps completed",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
    favorite: "Favorite",
    adminPanel: "Admin Panel",
    usersTab: "Users",
    templatesTab: "Templates",
    globalStats: "Global Stats",
    roleLabel: "Role",
    edit: "Edit",
    add: "Add",
    save: "Save",
    totalUsers: "Total users",
    totalProjects: "Total projects",
    completedProjects: "Completed projects",
    activeProjects: "Active projects",
    totalTemplates: "Templates",
    usersByRole: "Users by role",
    newTemplate: "New template",
    editTemplate: "Edit template",
    noUsers: "No users found",
    owner: "Owner",
    you: "You",
    deleteUserConfirm: "Remove this user and all their data?",
    role_user: "User",
    role_tester: "Tester",
    role_collaborator: "Collaborator",
    role_moderator: "Moderator",
    role_admin: "Admin",
  },
  es: {
    appName: "DevStart",
    tagline: "Tu viaje de programación empieza aquí.",
    login: "Iniciar sesión",
    register: "Registrarse",
    logout: "Salir",
    email: "Correo",
    password: "Contraseña",
    name: "Nombre",
    dashboard: "Panel",
    myProjects: "Mis Proyectos",
    devmentor: "DevMentor",
    explore: "Explorar Ideas",
    createProject: "Crear nuevo proyecto",
    exploreIdeas: "Explorar ideas de proyectos",
    inProgress: "En progreso",
    completed: "Completados",
    favorites: "Favoritos",
    overallProgress: "Progreso general",
    recentActivities: "Actividades recientes",
    noActivities: "Aún no hay actividades. ¡Crea tu primer proyecto!",
    projectName: "Nombre del proyecto",
    description: "Descripción",
    level: "Nivel",
    language: "Lenguaje de programación",
    framework: "Tecnología / Framework",
    goal: "Objetivo del proyecto",
    beginner: "Principiante",
    basic: "Básico",
    intermediate: "Intermedio",
    generateProject: "Generar mi proyecto",
    step: "Etapa",
    objective: "Objetivo",
    explanation: "Explicación",
    code: "Código",
    codeExplanation: "Explicación del código",
    markComplete: "Marcar como completada",
    markIncomplete: "Marcar como no completada",
    dontUnderstand: "No entiendo",
    needHelp: "Necesito ayuda",
    typeMessage: "Escribe tu duda...",
    send: "Enviar",
    thinking: "Pensando...",
    startProject: "Empezar este proyecto",
    welcome: "Bienvenido(a)",
    heroTitle: "Aprende a programar creando proyectos reales",
    heroSubtitle: "Desde cero hasta tu primera app, con un profesor de IA a tu lado.",
    getStarted: "Empezar gratis",
    features: "¿Por qué DevStart?",
    of: "de",
    stepsCompleted: "etapas completadas",
    delete: "Eliminar",
    confirm: "Confirmar",
    cancel: "Cancelar",
    favorite: "Favorito",
    adminPanel: "Panel Admin",
    usersTab: "Usuarios",
    templatesTab: "Plantillas",
    globalStats: "Estadísticas Globales",
    roleLabel: "Rol",
    edit: "Editar",
    add: "Agregar",
    save: "Guardar",
    totalUsers: "Total de usuarios",
    totalProjects: "Total de proyectos",
    completedProjects: "Proyectos completados",
    activeProjects: "Proyectos activos",
    totalTemplates: "Plantillas",
    usersByRole: "Usuarios por rol",
    newTemplate: "Nueva plantilla",
    editTemplate: "Editar plantilla",
    noUsers: "No se encontraron usuarios",
    owner: "Propietario",
    you: "Tú",
    deleteUserConfirm: "¿Eliminar este usuario y todos sus datos?",
    role_user: "Usuario",
    role_tester: "Probador",
    role_collaborator: "Colaborador",
    role_moderator: "Moderador",
    role_admin: "Admin",
  },
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem("devstart_lang") || "pt");
  const [loading, setLoading] = useState(true);

  const t = useCallback((key) => translations[lang]?.[key] || translations.pt[key] || key, [lang]);

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem("devstart_lang", l);
  };

  useEffect(() => {
    const token = localStorage.getItem("devstart_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem("devstart_token"); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("devstart_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (name, email, password) => {
    const r = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("devstart_token", r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("devstart_token");
    setUser(null);
  };

  return (
    <AppContext.Provider value={{ user, lang, t, changeLang, login, register, logout, loading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
