# Hazava AI Deployment

## Railway backend

Create a Railway service from this GitHub repo. The root `railway.json` uses
`Dockerfile.railway`, which packages the FastAPI backend and the bundled
`data/` folder.

Set these Railway variables:

```bash
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_UPLOAD_BUCKET=dfm-data-uploads
```

The Railway health check is `/health`. After deploy, open:

```txt
https://your-railway-service.up.railway.app/health
```

## Vercel frontend

Set this Vercel variable to the Railway service URL, without `/api`:

```bash
BACKEND_API_URL=https://your-railway-service.up.railway.app
```

Prefer `BACKEND_API_URL`. `NEXT_PUBLIC_API_URL` is also accepted as a legacy
fallback for older local setups, but do not set both to different URLs. The
browser always calls Vercel `/api/...`; Vercel server routes proxy dashboard and
chat requests to Railway.

Dashboard routes still fall back to local prototype data if Railway is not
configured, so the main dashboard does not go blank during demos. Chat routes
only use the canned local assistant when no backend URL is configured; if a
backend URL is set but Railway fails, the app returns an error instead of hiding
the failure behind a generic answer.

Check the Vercel-to-Railway connection at:

```txt
https://your-vercel-app.vercel.app/api/backend/health
```

It should return `"configured": true`, `"ok": true`, and `"source":
"BACKEND_API_URL"` (or `"NEXT_PUBLIC_API_URL"` if you are using the legacy
fallback). If it says the backend URL is not set, add the variable in Vercel and
redeploy.

Also keep the existing Supabase variables in Vercel for uploads:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_UPLOAD_BUCKET=dfm-data-uploads
```
