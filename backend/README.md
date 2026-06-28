# Backend — Doctors for Madagascar M&E Data Assistant

FastAPI service for the DfM Monitoring & Evaluation Data Assistant. It turns raw
health/project data (project indicators, TB cohort data, DHIS2 service data,
REDCap exports) into actionable insights, organised around three functions:

1. **Data quality checking** (`data_quality`) — review exports, detect issues,
   and explain in French why each matters and how to fix it.
2. **Healthcare gap & risk exploration** (`health_gaps`) — link utilisation
   (DHIS2) with seasonality/climate/accessibility to find risk windows.
3. **Insight generation & impact storytelling** (`insights`) — summaries,
   visualisation suggestions, and WHO-aligned situation explanations / stories.

Supporting domains: `projects` (M&E projects/areas), `files` (data-export
uploads), `chat` (the conversational assistant, French-first).

> Status: **placeholder scaffold.** Routers, schemas and services are wired and
> import cleanly; the real logic is marked with `TODO(DfM)`.

## Stack

- Python 3.12, FastAPI + Uvicorn, Pydantic v2 (+ pydantic-settings)
- LLM: Anthropic Claude by default (provider-configurable), wired in
  `app/core/llm.py` — see `TODO(DfM)`
- Supabase: source-file storage and upload workflow metadata. The current
  prototype upload route lives in the Next.js app at `frontend/src/app/api/uploads`
  so the browser never sees the service-role key.
- Ruff (lint/format) + pytest

## Setup & run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or: uv venv && source .venv/bin/activate
pip install -e .                                     # or: uv sync
cp .env.example .env                                 # add an LLM key when wiring the assistant
uvicorn app.main:app --reload --port 8000
```

For upload persistence, also run `../supabase/schema.sql` in Supabase and fill
the Supabase env values in `backend/.env` / `frontend/.env.local`.

Health check: `curl localhost:8000/health` → `{"status":"ok",...}`
OpenAPI docs: <http://localhost:8000/docs>

The frontend (Next.js in the `frontend/` folder) calls these endpoints; set its
API base URL accordingly. CORS allows `http://localhost:3000` by default
(`CORS_ORIGINS`).

## Layout

```
app/
├── main.py            # FastAPI app, CORS, router registration, /health
├── core/              # config (env) + llm wrapper
├── db/                # database session placeholder (prototype reads ../data)
├── shared/            # shared schemas (LocalizedText, Metric, QualityIssue, …)
└── domains/           # one folder per domain: router + schemas + service
    ├── projects/      # M&E projects (discovered from ../data/projects)
    ├── data_quality/  # function 1
    ├── health_gaps/   # function 2
    ├── insights/      # function 3
    ├── chat/          # conversational assistant (French-first)
    └── files/         # data-export uploads
```

Shared schemas mirror the frontend's TypeScript contract in
`frontend/src/lib/projects.ts` so the two stacks stay in sync.

## Endpoints (prefix `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/projects` | List M&E projects |
| GET  | `/api/projects/{id}` | Full project detail |
| GET  | `/api/data-quality/{id}` | Quality issues (explained, FR) |
| GET  | `/api/health-gaps/{id}` | Utilisation trends + risk windows |
| GET  | `/api/insights/{id}` | Metrics, insights, story |
| POST | `/api/insights/story` | Generate an audience-tailored story |
| POST | `/api/chat` | Ask a question about a project |
| GET/POST | `/api/files/{id}` | List / upload data exports |
