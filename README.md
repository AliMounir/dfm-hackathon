# Doctors for Madagascar — M&E Data Assistant

An AI-supported **Monitoring & Evaluation (M&E) Data Assistant** for Doctors for
Madagascar (Ärzte für Madagaskar). It turns raw health and project data —
project indicators, TB cohort data, DHIS2 service data, REDCap exports — into
actionable insights for project management, reporting, quality improvement and
research. Most output is **French-first** and aligned with health standards such
as WHO guidance.

## Three functions

1. **Data quality checking** — review structured M&E exports, detect issues
   (missing values, implausible entries, reporting errors) and explain, in
   French, why each matters and how to correct it.
2. **Healthcare gap & risk exploration** — link service utilisation (DHIS2) with
   climate / seasonality / accessibility to find seasonal risk windows and gaps.
3. **Insight generation & impact storytelling** — turn indicators into
   summaries, visualisation suggestions and audience-tailored impact stories.

## Monorepo layout

```
.
├── frontend/   # Next.js 16 app (App Router, Tailwind, recharts) — the UI
│   └── src/
│       ├── app/         # routes: /, /projects/[id], /data-quality, /health-gaps,
│       │                #         /insights, /chat, /files
│       ├── components/  # shared + shadcn ui/
│       ├── features/    # feature-per-folder: projects, data-quality, health-gaps,
│       │                #   insights, chat, files, shared
│       └── lib/         # projects data (TS contract) + utils
├── backend/    # FastAPI service (domain-per-folder) — see backend/README.md
│   └── app/domains/  # projects, data_quality, health_gaps, insights, chat, files
├── supabase/   # SQL schema for Storage bucket + upload metadata/workflow tables
└── data/       # M&E project data (one folder per project), shared by both
    └── projects/  # mchp, soameva, miray-tb-*, mafy, tia-longo, profess
```

> **Status: placeholder scaffold.** The structure, routes, components, and API
> endpoints are wired and consistent across both stacks; the real M&E logic and
> LLM wiring are marked `TODO(DfM)`.

## Getting started

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local   # paste Supabase values before testing uploads
npm run dev          # http://localhost:3000
```

Supabase uploads:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Paste API values into `frontend/.env.local`.
4. Use the upload button in the left sidebar.

The upload UI posts files to the Next.js route `POST /api/uploads`, which stores
source files in Supabase Storage and writes rows to `projects`,
`upload_batches`, `project_files`, and `upload_workflow_steps`. The bucket is
private; the service-role key stays server-side.

Useful Supabase-backed prototype routes:

- `GET /api/projects`
- `POST /api/projects`
- `POST /api/uploads`
- `GET /api/projects/:projectId/files`
- `PATCH /api/upload-batches/:batchId/steps`
- `GET /api/supabase/health`

After adding `frontend/.env.local`, visit
`http://localhost:3000/api/supabase/health` to confirm the Supabase URL,
service-role key, private bucket, and required tables are reachable.

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or: uv venv && source .venv/bin/activate
pip install -e .                                     # or: uv sync
cp .env.example .env                                 # add an LLM key when wiring the assistant
uvicorn app.main:app --reload --port 8000            # http://localhost:8000/docs
```

The frontend and backend share the data model: `frontend/src/lib/projects.ts`
(TypeScript) mirrors `backend/app/shared/schemas.py` (Pydantic).
