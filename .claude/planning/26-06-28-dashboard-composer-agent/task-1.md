# Task 1: Scaffold the agent + tools + renderer

**Status**: Completed (scaffold)
**Last Updated**: 26-06-28

## Goal
Stand up the dashboard composer agent end-to-end with a rule-based fallback so it
works before the OpenAI key exists.

## Checklist
- [x] Widget catalog (`catalog.py`) — fixed set the agent chooses from
- [x] Schemas (`schemas.py`) — `WidgetSpec`, `DashboardPlan`
- [x] Tools (`tools.py`) — data getters + `compute_data_signals` + `list_widget_catalog`
- [x] Sample data (`sample_data.py`) — ports frontend `projects.ts`
- [x] Agent (`agent.py`) — LangGraph ReAct + OpenAI, lazy imports, structured output
- [x] Service (`service.py`) — agent-or-fallback; deterministic rule-based plan
- [x] Route (`router.py`) — `GET /api/projects/{id}/dashboard`; registered in `main.py`
- [x] `core/llm.py` wired to OpenAI; `.env(.example)` + pyproject deps
- [x] Frontend types + `getDashboardPlan` + `DynamicDashboard` + wired into `/projects/[id]`
- [x] Backend syntax check passes

## Acceptance
- [x] App imports/compiles without LLM deps installed
- [ ] `GET /api/projects/mchp/dashboard` returns a plan (fallback) — verify after `pip install -e .`
