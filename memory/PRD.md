# DevStart — PRD

## Original Problem Statement
Web app "DevStart" for beginner programmers to learn coding by building projects.
Core: Dashboard, AI-generated step-by-step project learning paths, DevMentor AI tutor.
User preferences: AI models Claude Sonnet 4.6 + GPT 5.4; Email/Password auth; Dark mode vibrant UI; PT/EN/ES; 5-10 templates + AI generation.
User language: Portuguese (pt-BR) — respond in PT.

## RBAC Requirement (added)
- Roles: user, tester, collaborator, moderator, admin.
- Owner admin seeded securely from backend env (ADMIN_EMAIL/ADMIN_PASSWORD).
- Regular users can NEVER escalate their own role (no self-escalation endpoint).
- All admin routes/actions verified server-side (require_admin dependency), not just hidden in UI.

## Architecture
- Backend: FastAPI (/app/backend/server.py), MongoDB (motor). JWT Bearer auth (pyjwt + bcrypt).
- Frontend: React + React Router + Context (AppContext), Tailwind + Shadcn UI. i18n via in-context translations (PT/EN/ES).
- LLM: emergentintegrations LlmChat (Claude Sonnet 4.6 / GPT 5.4) via EMERGENT_LLM_KEY.

## DB Schemas
- users: {id, name, email, password(bcrypt), role, created_at}
- projects: {id, user_id, name, description, level, language, framework, goal, status, favorite, steps[], created_at, updated_at}
- templates: {id, name, description, level, language, framework, goal, created_at}
- activities, messages: activity feed + chat history

## Implemented (2026-06)
- [DONE] Core scaffold: auth (register/login/me), projects CRUD, AI step generation, DevMentor streaming chat, templates, stats, activities.
- [DONE] Phase 1 RBAC:
  - 5 roles; new users default "user".
  - Owner admin seeded idempotently on startup from env (yagoadd@gmail.com).
  - require_admin server-side gate on all /api/admin/* routes.
  - Admin endpoints: list/manage users, change roles, delete users, global stats, template CRUD.
  - Guards: owner cannot be demoted/deleted; can't remove last admin; can't delete self.
  - Templates migrated to DB (seeded from constant); Explore reads from DB.
  - Frontend /admin panel (Stats / Users / Templates tabs), admin-only nav link + route guard.
- [DONE] Fixed corrupted backend/.env (CORS_ORIGINS/EMERGENT_LLM_KEY were on one line).

## Backlog / Next
- P1 Phase 2: Ticket/help system — "Pedir ajuda" from a project step creates a ticket (user, project, step, problem, status: waiting/in-progress/resolved); collaborators/moderators can claim & chat within ticket.
- P1 Phase 3: AI improvement loop — resolution rating (👍/👎), mark "good example for AI", admin approval → becomes AI knowledge base entry injected into DevMentor context.
- P2: Per-role dashboards/capabilities (tester feedback form, collaborator/moderator queues).
- P2: Favorites view, project detail polish, i18n coverage for all pages.
