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

Keep `NEXT_PUBLIC_API_URL` empty. The browser calls Vercel `/api/...`; Vercel
server routes proxy dashboard/chat requests to Railway and fall back to local
prototype data only when `BACKEND_API_URL` is not configured. If the variable is
set but Railway is unreachable, the app returns a visible backend error instead
of silently showing prototype chat.

Check the Vercel-to-Railway connection at:

```txt
https://your-vercel-app.vercel.app/api/backend/health
```

It should return `"configured": true` and `"ok": true`. If it returns
`BACKEND_API_URL is not set`, add the variable in Vercel and redeploy.

Also keep the existing Supabase variables in Vercel for uploads:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_UPLOAD_BUCKET=dfm-data-uploads
```
