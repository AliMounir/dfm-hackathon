# Dashboard Composer Agent — Context & Key Files

**Last Updated**: 26-06-28

## Backend (`backend/app/domains/dashboard/`)

- `schemas.py` — `WidgetType`, `WidgetSpec`, `DashboardPlan` (the agent's output).
- `catalog.py` — `WIDGET_CATALOG`: the fixed set of widgets the agent chooses from.
- `sample_data.py` — structured project data (ports `frontend/src/lib/projects.ts`). TODO: real exports.
- `tools.py` — the agent's tools (plain fns; no LangChain import here). `TOOL_FUNCTIONS` registry.
- `agent.py` — LangGraph `create_react_agent` + OpenAI; lazy imports; `compose_dashboard()`.
- `service.py` — `DashboardService.compose()`: agent if key set, else `_fallback()` rule-based plan.
- `router.py` — `GET /api/projects/{id}/dashboard`.

Supporting:
- `app/core/llm.py` — `get_chat_model()` → `ChatOpenAI` (lazy import).
- `app/core/config.py` — `llm_provider/llm_model/openai_api_key`, `llm_configured` property.
- `app/main.py` — registers `dashboard_router`.
- `backend/.env(.example)` — `LLM_PROVIDER=openai`, `LLM_MODEL=gpt-4o-mini`, `OPENAI_API_KEY=`.
- `backend/pyproject.toml` — adds `langchain-core`, `langchain-openai`, `langgraph`.

## Frontend (`frontend/src/features/dashboard/`)

- `lib/types.ts` — `DashboardPlan` / `WidgetSpec` (mirror backend; snake_case fields).
- `api/dashboard.ts` — `getDashboardPlan(projectId)` (returns null if backend down).
- `components/dynamic-dashboard.tsx` — renders widgets by `type` in priority order, each with the agent's rationale; recharts for trends.
- `frontend/src/app/projects/[id]/page.tsx` — fetches the plan and renders `<DynamicDashboard>`.

## Key decisions

- **Constrained-to-catalog generation** so the frontend always has a renderer.
- **Lazy LLM imports + rule-based fallback** so the app builds/runs before the
  OpenAI key and deps are installed.
- **Backend returns snake_case** (no camelCase alias on `AppBaseModel`); frontend
  dashboard types use snake_case (`data_key`, `generated_by`). Note: the existing
  `Project` data (from `lib/projects.ts`) stays camelCase (`qualityIssues`, etc.).

## Integration points

- Reads project structure from `sample_data.py` (→ later: `data/projects/<id>/`).
- Endpoint consumed by the project detail page; renderer reuses the `Project` shape.

## To run

```bash
# backend
cd backend && pip install -e . && cp .env.example .env   # add OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
# frontend (in another terminal)
cd frontend && npm install && npm run dev
# open http://localhost:3000/projects/mchp
```
