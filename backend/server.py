from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"].lower()
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")

# RBAC roles (ordered by privilege for reference; access is checked explicitly, never by index)
ROLES = ["user", "tester", "collaborator", "moderator", "admin"]
STAFF_ROLES = {"admin", "moderator", "collaborator"}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="DevStart API")
api = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("devstart")


# ---------- Utils ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(user_id: str) -> str:
    payload = {"uid": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        uid = data["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.setdefault("role", "user")
    return user


def require_role(*allowed_roles: str):
    """Server-side role gate. Never trust the client; role is read fresh from the DB."""
    async def checker(user=Depends(current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Acesso negado: permissão insuficiente")
        return user
    return checker


require_admin = require_role("admin")
require_staff = require_role("admin", "moderator", "collaborator")
require_mod = require_role("admin", "moderator")


# ---------- Models ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProjectCreate(BaseModel):
    name: str
    description: str
    level: Literal["Iniciante", "Basico", "Intermediario"]
    language: str
    framework: str
    goal: str
    language_ui: Literal["pt", "en", "es"] = "pt"


class Step(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    explanation: str
    objective: str
    code: str = ""
    code_explanation: str = ""
    completed: bool = False


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    level: str
    language: str
    framework: str
    goal: str
    status: Literal["in_progress", "completed"] = "in_progress"
    favorite: bool = False
    steps: List[Step] = []
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class ChatIn(BaseModel):
    message: str
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    mode: Literal["explain", "error", "help", "general"] = "general"
    model: Literal["claude", "gpt"] = "claude"
    language_ui: Literal["pt", "en", "es"] = "pt"


# ---------- Templates (10 pre-built project ideas) ----------
TEMPLATES = [
    {"name": "Lista de Tarefas (To-Do)", "description": "Um app simples para adicionar, marcar e remover tarefas.", "level": "Iniciante", "language": "JavaScript", "framework": "HTML/CSS/JS", "goal": "Aprender manipulação do DOM e armazenamento local."},
    {"name": "Calculadora", "description": "Uma calculadora com as 4 operações básicas.", "level": "Iniciante", "language": "JavaScript", "framework": "HTML/CSS/JS", "goal": "Praticar lógica, eventos de clique e funções."},
    {"name": "Relógio Digital", "description": "Um relógio que atualiza em tempo real.", "level": "Iniciante", "language": "JavaScript", "framework": "HTML/CSS/JS", "goal": "Entender setInterval e manipulação de datas."},
    {"name": "Gerador de Senhas", "description": "Um app que gera senhas seguras aleatórias.", "level": "Basico", "language": "JavaScript", "framework": "HTML/CSS/JS", "goal": "Aprender aleatoriedade e strings."},
    {"name": "Consumo de API - Clima", "description": "App que mostra o clima da cidade do usuário.", "level": "Basico", "language": "JavaScript", "framework": "Fetch API", "goal": "Aprender a consumir APIs externas."},
    {"name": "Jogo da Velha", "description": "Jogo clássico da velha para 2 jogadores.", "level": "Basico", "language": "JavaScript", "framework": "HTML/CSS/JS", "goal": "Praticar lógica de jogo e estados."},
    {"name": "Blog Pessoal", "description": "Um blog simples com posts em Markdown.", "level": "Intermediario", "language": "JavaScript", "framework": "React", "goal": "Aprender componentes e roteamento."},
    {"name": "Chat em Tempo Real", "description": "Chat simples usando WebSockets.", "level": "Intermediario", "language": "JavaScript", "framework": "Node.js + Socket.IO", "goal": "Entender comunicação em tempo real."},
    {"name": "Gerenciador de Finanças", "description": "App para registrar receitas e despesas.", "level": "Intermediario", "language": "JavaScript", "framework": "React", "goal": "Praticar estado global e gráficos."},
    {"name": "API REST de Livros", "description": "API para cadastrar e listar livros.", "level": "Intermediario", "language": "Python", "framework": "FastAPI", "goal": "Aprender criação de APIs REST."},
]


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": body.name,
        "email": body.email.lower(),
        "password": hash_password(body.password),
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_token(uid)
    return {"token": token, "user": {"id": uid, "name": body.name, "email": body.email.lower(), "role": "user"}}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = make_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user.get("role", "user")}}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ---------- Templates ----------
class TemplateIn(BaseModel):
    name: str
    description: str
    level: str
    language: str
    framework: str
    goal: str


@api.get("/templates")
async def get_templates(user=Depends(current_user)):
    tpls = await db.templates.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return tpls


# ---------- AI: generate learning path ----------
async def generate_learning_path(project: ProjectCreate) -> List[dict]:
    lang_map = {"pt": "português brasileiro", "en": "English", "es": "español"}
    lang_name = lang_map.get(project.language_ui, "português brasileiro")

    system = (
        f"Você é o DevMentor, um professor de programação para iniciantes absolutos. "
        f"Responda SEMPRE em {lang_name}. "
        f"Explique com palavras simples, sem jargão. Quando usar um termo técnico, explique-o. "
        f"Gere APENAS um JSON válido com uma lista de 8 a 12 etapas para o projeto solicitado."
    )
    prompt = (
        f"Projeto: {project.name}\n"
        f"Descrição: {project.description}\n"
        f"Nível: {project.level}\n"
        f"Linguagem: {project.language}\n"
        f"Tecnologia: {project.framework}\n"
        f"Objetivo: {project.goal}\n\n"
        f"Gere as etapas do projeto no seguinte formato JSON estrito (sem markdown, sem ```): "
        f'{{"steps":[{{"title":"...","explanation":"...","objective":"...","code":"...","code_explanation":"..."}}]}}\n'
        f"- 'title' curto (max 50 caracteres)\n"
        f"- 'explanation' com 2-3 frases simples\n"
        f"- 'objective' com 1 frase clara\n"
        f"- 'code' apenas se aplicável, use \\n para quebras\n"
        f"- 'code_explanation' linha por linha, simples\n"
        f"Comece por 'Entender o que vamos construir' e termine com 'Finalizar o projeto'."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"gen-{uuid.uuid4()}",
        system_message=system,
    ).with_model("openai", "gpt-5.4")
    try:
        resp = await chat.send_message(UserMessage(text=prompt))
        text = resp if isinstance(resp, str) else str(resp)
        # try find JSON
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
        data = json.loads(text)
        steps_raw = data.get("steps", [])
    except Exception as e:
        logger.error(f"LLM gen failed: {e}")
        steps_raw = [
            {"title": "Entender o que vamos construir", "explanation": "Vamos conhecer o projeto.", "objective": "Ter clareza do resultado final.", "code": "", "code_explanation": ""},
            {"title": "Preparar o ambiente", "explanation": "Instalar as ferramentas necessárias.", "objective": "Deixar o computador pronto para codar.", "code": "", "code_explanation": ""},
            {"title": "Finalizar o projeto", "explanation": "Revisar e testar.", "objective": "Concluir com confiança.", "code": "", "code_explanation": ""},
        ]

    steps = []
    for s in steps_raw:
        steps.append(
            {
                "id": str(uuid.uuid4()),
                "title": s.get("title", "Etapa"),
                "explanation": s.get("explanation", ""),
                "objective": s.get("objective", ""),
                "code": s.get("code", ""),
                "code_explanation": s.get("code_explanation", ""),
                "completed": False,
            }
        )
    return steps


# ---------- Projects ----------
@api.post("/projects")
async def create_project(body: ProjectCreate, user=Depends(current_user)):
    steps = await generate_learning_path(body)
    project = Project(
        user_id=user["id"],
        name=body.name,
        description=body.description,
        level=body.level,
        language=body.language,
        framework=body.framework,
        goal=body.goal,
        steps=[Step(**s) for s in steps],
    )
    doc = project.model_dump()
    await db.projects.insert_one(doc)
    await db.activities.insert_one(
        {"id": str(uuid.uuid4()), "user_id": user["id"], "type": "project_created", "project_id": project.id, "project_name": project.name, "at": now_iso()}
    )
    doc.pop("_id", None)
    return doc


@api.get("/projects")
async def list_projects(user=Depends(current_user)):
    projects = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return projects


@api.get("/projects/{pid}")
async def get_project(pid: str, user=Depends(current_user)):
    p = await db.projects.find_one({"id": pid, "user_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return p


@api.patch("/projects/{pid}/favorite")
async def toggle_favorite(pid: str, user=Depends(current_user)):
    p = await db.projects.find_one({"id": pid, "user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrado")
    fav = not p.get("favorite", False)
    await db.projects.update_one({"id": pid}, {"$set": {"favorite": fav, "updated_at": now_iso()}})
    return {"favorite": fav}


@api.delete("/projects/{pid}")
async def delete_project(pid: str, user=Depends(current_user)):
    res = await db.projects.delete_one({"id": pid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return {"ok": True}


@api.patch("/projects/{pid}/steps/{sid}/complete")
async def complete_step(pid: str, sid: str, user=Depends(current_user)):
    p = await db.projects.find_one({"id": pid, "user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Não encontrado")
    steps = p["steps"]
    completed_any = False
    for s in steps:
        if s["id"] == sid:
            s["completed"] = not s.get("completed", False)
            completed_any = s["completed"]
            break
    all_done = all(s.get("completed") for s in steps)
    status_p = "completed" if all_done else "in_progress"
    await db.projects.update_one(
        {"id": pid}, {"$set": {"steps": steps, "status": status_p, "updated_at": now_iso()}}
    )
    if completed_any:
        await db.activities.insert_one(
            {"id": str(uuid.uuid4()), "user_id": user["id"], "type": "step_completed", "project_id": pid, "project_name": p["name"], "at": now_iso()}
        )
    if all_done:
        await db.activities.insert_one(
            {"id": str(uuid.uuid4()), "user_id": user["id"], "type": "project_completed", "project_id": pid, "project_name": p["name"], "at": now_iso()}
        )
    return {"status": status_p, "step_completed": completed_any}


# ---------- Stats / Dashboard ----------
@api.get("/stats")
async def stats(user=Depends(current_user)):
    projects = await db.projects.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    total = len(projects)
    in_progress = sum(1 for p in projects if p["status"] == "in_progress")
    completed = sum(1 for p in projects if p["status"] == "completed")
    favorites = sum(1 for p in projects if p.get("favorite"))
    total_steps = sum(len(p.get("steps", [])) for p in projects)
    done_steps = sum(sum(1 for s in p.get("steps", []) if s.get("completed")) for p in projects)
    progress = round((done_steps / total_steps) * 100) if total_steps else 0
    return {
        "total": total,
        "in_progress": in_progress,
        "completed": completed,
        "favorites": favorites,
        "overall_progress": progress,
        "steps_done": done_steps,
        "steps_total": total_steps,
    }


@api.get("/activities")
async def activities(user=Depends(current_user)):
    acts = await db.activities.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(20)
    return acts


# ---------- DevMentor Chat (Streaming) ----------
def system_prompt_for(mode: str, language_ui: str) -> str:
    lang_map = {"pt": "português brasileiro", "en": "English", "es": "español"}
    lang = lang_map.get(language_ui, "português brasileiro")
    base = (
        f"Você é o DevMentor, um professor particular de programação para pessoas que estão começando. "
        f"Responda SEMPRE em {lang}. "
        f"Use palavras simples, evite jargão técnico. Quando um termo técnico for necessário, explique-o. "
        f"Seja paciente, encorajador e didático. Use exemplos do dia-a-dia. "
        f"Formate código em blocos markdown com a linguagem indicada."
    )
    if mode == "error":
        base += " O usuário está com um erro. 1) Identifique o problema. 2) Explique por que aconteceu. 3) Mostre como corrigir. 4) Explique a correção. 5) Dê uma dica para evitar no futuro."
    elif mode == "explain":
        base += " O usuário quer entender um código. Explique linha por linha, em linguagem simples."
    elif mode == "help":
        base += " O usuário precisa de ajuda para prosseguir. Dê pistas graduais, não a resposta pronta de imediato."
    return base


async def build_knowledge_context(language=None, framework=None) -> str:
    items = []
    if language or framework:
        or_conds = []
        if language:
            or_conds.append({"language": language})
        if framework:
            or_conds.append({"framework": framework})
        items = await db.knowledge.find({"status": "approved", "$or": or_conds}, {"_id": 0}).sort("approved_at", -1).to_list(4)
    if len(items) < 4:
        seen = {i["id"] for i in items}
        extra = await db.knowledge.find({"status": "approved"}, {"_id": 0}).sort("approved_at", -1).to_list(6)
        for e in extra:
            if e["id"] not in seen:
                items.append(e)
            if len(items) >= 4:
                break
    if not items:
        return ""
    lines = ["\n\nBase de conhecimento da comunidade (casos reais resolvidos e aprovados por um admin). Use quando for relevante para ajudar o aluno:"]
    for it in items:
        lines.append(f"- Problema: {it['problem']}\n  Como foi resolvido: {it['solution'][:600]}")
    return "\n".join(lines)


@api.post("/chat/stream")
async def chat_stream(body: ChatIn, user=Depends(current_user)):
    model_provider, model_name = ("anthropic", "claude-sonnet-4-6") if body.model == "claude" else ("openai", "gpt-5.4")
    session_id = f"user-{user['id']}-{body.project_id or 'general'}"

    context = ""
    proj_language, proj_framework = None, None
    if body.project_id:
        p = await db.projects.find_one({"id": body.project_id, "user_id": user["id"]}, {"_id": 0})
        if p:
            proj_language, proj_framework = p.get("language"), p.get("framework")
            context = f"\n\nProjeto atual: {p['name']} ({p['language']}/{p['framework']}). Objetivo: {p['goal']}."
            if body.step_id:
                for s in p["steps"]:
                    if s["id"] == body.step_id:
                        context += f"\nEtapa atual: {s['title']}. Código: {s.get('code','')}"
                        break

    knowledge_ctx = await build_knowledge_context(proj_language, proj_framework)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt_for(body.mode, body.language_ui) + context + knowledge_ctx,
    ).with_model(model_provider, model_name)

    # Save user message
    conv_id = f"{user['id']}-{body.project_id or 'general'}"
    await db.messages.insert_one(
        {"id": str(uuid.uuid4()), "conv_id": conv_id, "user_id": user["id"], "role": "user", "content": body.message, "at": now_iso()}
    )

    async def event_gen():
        buffer = []
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    buffer.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("stream error")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        full = "".join(buffer)
        await db.messages.insert_one(
            {"id": str(uuid.uuid4()), "conv_id": conv_id, "user_id": user["id"], "role": "assistant", "content": full, "at": now_iso()}
        )
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api.get("/chat/history")
async def chat_history(project_id: Optional[str] = None, user=Depends(current_user)):
    conv_id = f"{user['id']}-{project_id or 'general'}"
    msgs = await db.messages.find({"conv_id": conv_id}, {"_id": 0}).sort("at", 1).to_list(500)
    return msgs


@api.get("/")
async def root():
    return {"ok": True, "name": "DevStart API"}


# ---------- Tickets (Help system - Phase 2) ----------
class TicketCreate(BaseModel):
    project_id: Optional[str] = None
    step_id: Optional[str] = None
    problem: str


class TicketMessageIn(BaseModel):
    content: str


class TicketStatusIn(BaseModel):
    status: Literal["waiting", "in_progress", "resolved"]


async def get_ticket_access(tid: str, user):
    tk = await db.tickets.find_one({"id": tid}, {"_id": 0})
    if not tk:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    if tk["user_id"] != user["id"] and user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return tk


async def create_notification(user_id: str, ntype: str, ticket_id: str, message: str):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype,
        "ticket_id": ticket_id, "message": message, "read": False, "at": now_iso(),
    })


@api.post("/tickets")
async def create_ticket(body: TicketCreate, user=Depends(current_user)):
    project_name, step_title = None, None
    if body.project_id:
        p = await db.projects.find_one({"id": body.project_id, "user_id": user["id"]}, {"_id": 0})
        if p:
            project_name = p["name"]
            if body.step_id:
                for s in p["steps"]:
                    if s["id"] == body.step_id:
                        step_title = s["title"]
                        break
    tid = str(uuid.uuid4())
    doc = {
        "id": tid,
        "user_id": user["id"],
        "user_name": user["name"],
        "project_id": body.project_id,
        "project_name": project_name,
        "step_id": body.step_id,
        "step_title": step_title,
        "problem": body.problem,
        "status": "waiting",
        "assignee_id": None,
        "assignee_name": None,
        "rating": None,
        "good_example": False,
        "approved": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.tickets.insert_one(doc)
    await db.ticket_messages.insert_one({
        "id": str(uuid.uuid4()), "ticket_id": tid,
        "sender_id": user["id"], "sender_name": user["name"], "sender_role": user.get("role", "user"),
        "content": body.problem, "at": now_iso(),
    })
    doc.pop("_id", None)
    return doc


@api.get("/tickets/mine")
async def my_tickets(user=Depends(current_user)):
    return await db.tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)


@api.get("/tickets/stats")
async def ticket_stats(staff=Depends(require_staff)):
    return {
        "waiting": await db.tickets.count_documents({"status": "waiting"}),
        "in_progress": await db.tickets.count_documents({"status": "in_progress"}),
        "resolved": await db.tickets.count_documents({"status": "resolved"}),
    }


@api.get("/tickets")
async def list_tickets(status_q: Optional[str] = Query(None, alias="status"), mine: bool = False, staff=Depends(require_staff)):
    q = {}
    if status_q:
        q["status"] = status_q
    if mine:
        q["assignee_id"] = staff["id"]
    return await db.tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/tickets/{tid}")
async def get_ticket(tid: str, user=Depends(current_user)):
    tk = await get_ticket_access(tid, user)
    msgs = await db.ticket_messages.find({"ticket_id": tid}, {"_id": 0}).sort("at", 1).to_list(1000)
    return {"ticket": tk, "messages": msgs}


@api.post("/tickets/{tid}/messages")
async def post_ticket_message(tid: str, body: TicketMessageIn, user=Depends(current_user)):
    tk = await get_ticket_access(tid, user)
    msg = {
        "id": str(uuid.uuid4()), "ticket_id": tid,
        "sender_id": user["id"], "sender_name": user["name"], "sender_role": user.get("role", "user"),
        "content": body.content, "at": now_iso(),
    }
    await db.ticket_messages.insert_one(msg)
    updates = {"updated_at": now_iso()}
    if user.get("role") in STAFF_ROLES and tk["status"] == "waiting":
        updates["status"] = "in_progress"
        if not tk.get("assignee_id"):
            updates["assignee_id"] = user["id"]
            updates["assignee_name"] = user["name"]
    await db.tickets.update_one({"id": tid}, {"$set": updates})
    # Notify the other participant so they come back to the conversation
    if user["id"] == tk["user_id"]:
        recipient = updates.get("assignee_id") or tk.get("assignee_id")
    else:
        recipient = tk["user_id"]
    if recipient and recipient != user["id"]:
        await create_notification(recipient, "ticket_reply", tid, f"{user['name']} respondeu ao seu ticket")
    msg.pop("_id", None)
    return msg


@api.patch("/tickets/{tid}/claim")
async def claim_ticket(tid: str, staff=Depends(require_staff)):
    tk = await db.tickets.find_one({"id": tid})
    if not tk:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    await db.tickets.update_one({"id": tid}, {"$set": {
        "assignee_id": staff["id"], "assignee_name": staff["name"],
        "status": "in_progress", "updated_at": now_iso(),
    }})
    return {"ok": True}


@api.patch("/tickets/{tid}/status")
async def set_ticket_status(tid: str, body: TicketStatusIn, user=Depends(current_user)):
    await get_ticket_access(tid, user)
    upd = {"status": body.status, "updated_at": now_iso()}
    if body.status == "resolved":
        upd["resolved_at"] = now_iso()
    await db.tickets.update_one({"id": tid}, {"$set": upd})
    return {"status": body.status}


# ---------- Phase 3: AI improvement loop ----------
class RatingIn(BaseModel):
    rating: Literal["up", "down"]


@api.patch("/tickets/{tid}/rate")
async def rate_ticket(tid: str, body: RatingIn, user=Depends(current_user)):
    tk = await db.tickets.find_one({"id": tid})
    if not tk:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    if tk["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Apenas o autor do ticket pode avaliar")
    if tk["status"] != "resolved":
        raise HTTPException(status_code=400, detail="Avalie apenas tickets resolvidos")
    await db.tickets.update_one({"id": tid}, {"$set": {"rating": body.rating, "updated_at": now_iso()}})
    return {"rating": body.rating}


@api.post("/tickets/{tid}/good-example")
async def mark_good_example(tid: str, staff=Depends(require_staff)):
    tk = await db.tickets.find_one({"id": tid}, {"_id": 0})
    if not tk:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    existing = await db.knowledge.find_one({"ticket_id": tid}, {"_id": 0})
    if existing:
        return existing
    msgs = await db.ticket_messages.find({"ticket_id": tid}, {"_id": 0}).sort("at", 1).to_list(1000)
    solution = "\n\n".join(
        f"{m['sender_name']}: {m['content']}" for m in msgs if m.get("sender_role") in STAFF_ROLES
    )
    title = tk.get("step_title") or (tk.get("project_name") or tk["problem"][:60])
    doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": tid,
        "title": title,
        "problem": tk["problem"],
        "solution": solution,
        "language": None,
        "framework": None,
        "status": "pending",
        "created_by": staff["name"],
        "approved_by": None,
        "created_at": now_iso(),
        "approved_at": None,
        "reviewed": False,
        "reviewed_by": None,
        "reviewed_at": None,
    }
    if tk.get("project_id"):
        p = await db.projects.find_one({"id": tk["project_id"]}, {"_id": 0, "language": 1, "framework": 1})
        if p:
            doc["language"] = p.get("language")
            doc["framework"] = p.get("framework")
    await db.knowledge.insert_one(doc)
    await db.tickets.update_one({"id": tid}, {"$set": {"good_example": True, "updated_at": now_iso()}})
    doc.pop("_id", None)
    return doc


# ---------- Notifications ----------
class NotifReadIn(BaseModel):
    ids: Optional[List[str]] = None


@api.get("/notifications")
async def list_notifications(user=Depends(current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(50)


@api.get("/notifications/unread_count")
async def unread_count(user=Depends(current_user)):
    return {"count": await db.notifications.count_documents({"user_id": user["id"], "read": False})}


@api.post("/notifications/read")
async def mark_read(body: NotifReadIn, user=Depends(current_user)):
    q = {"user_id": user["id"]}
    if body.ids:
        q["id"] = {"$in": body.ids}
    await db.notifications.update_many(q, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Admin: RBAC-protected routes ----------
class RoleUpdate(BaseModel):
    role: Literal["user", "tester", "collaborator", "moderator", "admin"]


@api.get("/admin/users")
async def admin_list_users(admin=Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", 1).to_list(1000)
    counts = {}
    for u in users:
        u.setdefault("role", "user")
        counts[u["role"]] = counts.get(u["role"], 0) + 1
    return {"users": users, "counts": counts, "roles": ROLES}


@api.patch("/admin/users/{uid}/role")
async def admin_update_role(uid: str, body: RoleUpdate, admin=Depends(require_admin)):
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if target["email"] == ADMIN_EMAIL and body.role != "admin":
        raise HTTPException(status_code=400, detail="A conta proprietária não pode ser rebaixada")
    if target.get("role") == "admin" and body.role != "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Deve existir pelo menos um admin")
    await db.users.update_one({"id": uid}, {"$set": {"role": body.role}})
    return {"id": uid, "role": body.role}


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, admin=Depends(require_admin)):
    target = await db.users.find_one({"id": uid})
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if target["email"] == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="A conta proprietária não pode ser removida")
    if uid == admin["id"]:
        raise HTTPException(status_code=400, detail="Você não pode remover sua própria conta")
    await db.users.delete_one({"id": uid})
    await db.projects.delete_many({"user_id": uid})
    await db.activities.delete_many({"user_id": uid})
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(admin=Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_projects = await db.projects.count_documents({})
    completed_projects = await db.projects.count_documents({"status": "completed"})
    total_templates = await db.templates.count_documents({})
    by_role = {}
    for r in ROLES:
        by_role[r] = await db.users.count_documents({"role": r})
    recent = await db.activities.find({}, {"_id": 0}).sort("at", -1).to_list(15)
    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "in_progress_projects": total_projects - completed_projects,
        "total_templates": total_templates,
        "users_by_role": by_role,
        "recent_activities": recent,
    }


@api.post("/admin/templates")
async def admin_create_template(body: TemplateIn, admin=Depends(require_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/admin/templates/{tid}")
async def admin_update_template(tid: str, body: TemplateIn, admin=Depends(require_admin)):
    res = await db.templates.update_one({"id": tid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    doc = await db.templates.find_one({"id": tid}, {"_id": 0})
    return doc


@api.delete("/admin/templates/{tid}")
async def admin_delete_template(tid: str, admin=Depends(require_admin)):
    res = await db.templates.delete_one({"id": tid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return {"ok": True}


# ---------- Admin: AI knowledge base (Phase 3) ----------
@api.get("/admin/knowledge")
async def admin_list_knowledge(status_q: Optional[str] = Query(None, alias="status"), admin=Depends(require_admin)):
    q = {}
    if status_q:
        q["status"] = status_q
    items = await db.knowledge.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {
        "items": items,
        "counts": {
            "pending": await db.knowledge.count_documents({"status": "pending"}),
            "approved": await db.knowledge.count_documents({"status": "approved"}),
        },
    }


@api.patch("/admin/knowledge/{kid}/approve")
async def admin_approve_knowledge(kid: str, admin=Depends(require_admin)):
    kn = await db.knowledge.find_one({"id": kid}, {"_id": 0})
    if not kn:
        raise HTTPException(status_code=404, detail="Conhecimento não encontrado")
    await db.knowledge.update_one({"id": kid}, {"$set": {
        "status": "approved", "approved_by": admin["name"], "approved_at": now_iso(),
    }})
    if kn.get("ticket_id"):
        await db.tickets.update_one({"id": kn["ticket_id"]}, {"$set": {"approved": True}})
    return {"ok": True, "status": "approved"}


@api.delete("/admin/knowledge/{kid}")
async def admin_delete_knowledge(kid: str, admin=Depends(require_admin)):
    kn = await db.knowledge.find_one({"id": kid}, {"_id": 0})
    if not kn:
        raise HTTPException(status_code=404, detail="Conhecimento não encontrado")
    await db.knowledge.delete_one({"id": kid})
    if kn.get("ticket_id"):
        await db.tickets.update_one({"id": kn["ticket_id"]}, {"$set": {"good_example": False, "approved": False}})
    return {"ok": True}


# ---------- Moderation: community content review queue (moderator + admin) ----------
@api.get("/moderation/knowledge")
async def mod_list_knowledge(status_q: Optional[str] = Query(None, alias="status"), mod=Depends(require_mod)):
    q = {}
    if status_q:
        q["status"] = status_q
    items = await db.knowledge.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {
        "items": items,
        "counts": {
            "pending": await db.knowledge.count_documents({"status": "pending"}),
            "reviewed": await db.knowledge.count_documents({"status": "pending", "reviewed": True}),
            "approved": await db.knowledge.count_documents({"status": "approved"}),
        },
    }


@api.patch("/moderation/knowledge/{kid}/review")
async def mod_review_knowledge(kid: str, mod=Depends(require_mod)):
    kn = await db.knowledge.find_one({"id": kid})
    if not kn:
        raise HTTPException(status_code=404, detail="Conhecimento não encontrado")
    reviewed = not kn.get("reviewed", False)
    await db.knowledge.update_one({"id": kid}, {"$set": {
        "reviewed": reviewed,
        "reviewed_by": mod["name"] if reviewed else None,
        "reviewed_at": now_iso() if reviewed else None,
    }})
    return {"ok": True, "reviewed": reviewed}


@api.delete("/moderation/knowledge/{kid}")
async def mod_reject_knowledge(kid: str, mod=Depends(require_mod)):
    kn = await db.knowledge.find_one({"id": kid}, {"_id": 0})
    if not kn:
        raise HTTPException(status_code=404, detail="Conhecimento não encontrado")
    await db.knowledge.delete_one({"id": kid})
    if kn.get("ticket_id"):
        await db.tickets.update_one({"id": kn["ticket_id"]}, {"$set": {"good_example": False, "approved": False}})
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_on_startup():
    # Unique email index
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"index create: {e}")

    # Seed owner admin idempotently, securely from env
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": ADMIN_NAME,
            "email": ADMIN_EMAIL,
            "password": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded owner admin: {ADMIN_EMAIL}")
    else:
        updates = {}
        if existing.get("role") != "admin":
            updates["role"] = "admin"
        if not verify_password(ADMIN_PASSWORD, existing["password"]):
            updates["password"] = hash_password(ADMIN_PASSWORD)
        if updates:
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": updates})
            logger.info(f"Updated owner admin: {list(updates.keys())}")

    # Backfill role for any legacy users missing it
    await db.users.update_many({"role": {"$exists": False}}, {"$set": {"role": "user"}})

    # Seed project templates if collection empty
    if await db.templates.count_documents({}) == 0:
        for t in TEMPLATES:
            doc = {**t, "id": str(uuid.uuid4()), "created_at": now_iso()}
            await db.templates.insert_one(doc)
        logger.info(f"Seeded {len(TEMPLATES)} templates")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
