# Supabase Backend Setup

Hazava AI uses Supabase as the prototype backend for uploaded M&E files,
project upload metadata, and workflow state.

## Why not OpenAI file storage?

OpenAI file uploads are meant for OpenAI API workflows such as model inputs,
fine-tuning, batch jobs, and vector-store retrieval. They are not a general
application database or private document-management backend. For source data,
project folders, upload metadata, and workflow tracking, Supabase is the better
fit. OpenAI can still be used later for parsing, retrieval, explanations, and
assistant responses.

## 1. Create Supabase resources

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.

This creates:

- private Storage bucket: `dfm-data-uploads`
- `projects`
- `upload_batches`
- `project_files`
- `upload_workflow_steps`
- seed rows for the current DFM project list

RLS is disabled for the no-auth prototype because uploads go through a server
route using the service-role key. When login/auth is added, enable RLS and add
project-member policies.

## 2. Add frontend env vars

Copy `frontend/.env.example` to `frontend/.env.local` and paste values from
Supabase Project Settings > API:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_UPLOAD_BUCKET=dfm-data-uploads
```

Important: `SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not add
`NEXT_PUBLIC_` to it.

## 3. Run locally

```bash
cd frontend
npm run dev
```

Open the upload modal, pick a project, choose or drop files, then click the
workflow button. The Next API route stores files in Supabase Storage and writes
metadata/workflow rows to Supabase tables.

## API routes

The current prototype uses Next.js server routes as the Supabase gateway:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List Supabase projects; falls back to local seed data before envs are configured. |
| `POST` | `/api/projects` | Create/upsert a project. |
| `POST` | `/api/uploads` | Upload one or more files to Supabase Storage and create batch/file/workflow rows. |
| `GET` | `/api/projects/:projectId/files` | List uploaded files and batches for a project. |
| `GET` | `/api/upload-batches/:batchId` | Read one upload batch with files and current workflow steps. |
| `PATCH` | `/api/upload-batches/:batchId/steps` | Update one workflow step status/message; optional batch status update. |
| `GET` | `/api/supabase/health` | Check env config, bucket reachability, and required tables. |

## Live test checklist

After adding `frontend/.env.local`:

1. Restart `npm run dev` so Next loads the new env values.
2. Open `http://localhost:3000/api/supabase/health`.
3. Confirm every check returns `ok: true`.
4. Upload a small `.xlsx` or `.csv` from the sidebar upload modal.
5. Confirm Supabase has:
   - one object in Storage bucket `dfm-data-uploads`
   - one row in `upload_batches`
   - one or more rows in `project_files`
   - six rows in `upload_workflow_steps`

## Next backend handoff points

Your teammate can watch or query `upload_batches` and `upload_workflow_steps`
to run the real processing pipeline:

1. convert `.xlsx` / `.csv` exports to Markdown or normalized records
2. extract indicators and schema metadata
3. run missing-data and plausibility checks
4. update workflow step statuses
5. wait for user approval before final import

Example workflow update:

```bash
curl -X PATCH http://localhost:3000/api/upload-batches/<batch-id>/steps \
  -H "Content-Type: application/json" \
  -d '{"stepKey":"convert","status":"done","message":"Converted to Markdown"}'
```
