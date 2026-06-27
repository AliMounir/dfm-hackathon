# Dynamic Dashboard Composer Agent — Implementation Plan

**Created**: 26-06-28
**Last Updated**: 26-06-28
**Status**: In Progress (Phase 1 scaffolded)

## 1. The "Why"

**Feature**: When a coordinator opens an M&E project, an agent looks at that
project's data and the catalog of already-built widgets, and decides **which
graphs/cards/lists to show, in what order, and why** — so the dashboard adapts
to what matters for each project instead of a fixed layout.

**The user problem**: M&E staff open a project and face the same generic layout
regardless of what's actually going on. They have to hunt for the signal (a
seasonal dip, a declining site, an untrustworthy field) themselves. We want the
tool to *lead with what matters* for this project, in French, WHO-aligned.

**Success looks like**: open a project → the most decision-relevant widgets are
already on top, each with a one-line "why this is shown", powered by the project's
real data.

## 2. UX

Open project → `GET /api/projects/{id}/dashboard` returns a `DashboardPlan` →
frontend renders the widgets in priority order, each annotated with the agent's
rationale. Bilingual (FR-first) with an EN toggle. Falls back to a rule-based
plan when no OpenAI key is set, and to a static note if the backend is down.

## 3. Technical approach

- **Constrained generation**: the agent may only pick widget `type`s from a fixed
  catalog (`backend/app/domains/dashboard/catalog.py`). It selects + configures +
  ranks; it cannot invent UI. The frontend has a renderer per catalog type.
- **Agent**: LangGraph `create_react_agent` + LangChain tools, OpenAI model
  (`gpt-4o-mini` default), structured output → `DashboardPlan`.
- **Tools** (`tools.py`): get_project_summary, get_metrics, get_monthly_trends,
  get_site_breakdown, get_quality_issues, get_insights, compute_data_signals
  (the "importance" analysis), list_widget_catalog.
- **Robustness**: deterministic rule-based fallback (`service.py`) so the endpoint
  works before the key is added and if the agent errors. LangChain imports are
  lazy so the app runs before deps are installed.
- **Data**: tools read `sample_data.py` (ports `frontend/src/lib/projects.ts`).
  TODO: replace with real parsing of `data/projects/<id>/` exports.

## 4. Phases

- **Phase 1 (done)**: backend agent + tools + catalog + schemas + endpoint +
  rule-based fallback; frontend `DashboardPlan` types + `DynamicDashboard`
  renderer wired into `/projects/[id]`; OpenAI `.env` + deps.
- **Phase 2**: add the OpenAI key, validate agent output end-to-end, tune the
  system prompt + widget ranking, add LangSmith tracing.
- **Phase 3**: replace sample data with real export parsing; unify with the
  data_quality / health_gaps / insights domain services; persist/caching.

## 5. Testing

- Backend: unit-test `compute_data_signals` + `_fallback` plan ordering; endpoint
  test with no key (fallback) and mocked agent.
- Frontend: render each widget type from a plan fixture; verify priority ordering.

## 6. Risks

- Agent picks a widget whose data is empty → renderer must no-op gracefully.
- Structured-output support varies by langgraph version → handled with a
  `response_format` try + `with_structured_output` fallback.
- Cost/latency → `gpt-4o-mini` default; cache plans per project later.
