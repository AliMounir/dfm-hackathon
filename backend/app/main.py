"""FastAPI entry point for the Doctors for Madagascar M&E Data Assistant.

Domain-per-folder layout under ``app/domains`` (each owns its router + schemas
+ service). The three M&E functions are first-class domains:
  - data_quality  — review exports, explain issues (French-first)
  - health_gaps   — utilisation vs. seasonality/risk windows
  - insights      — summaries, visualisation hints, impact stories
plus supporting domains: projects, files, chat.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.domains.chat.router import router as chat_router
from app.domains.dashboard.router import router as dashboard_router
from app.domains.data_quality.router import router as data_quality_router
from app.domains.files.router import router as files_router
from app.domains.health_gaps.router import router as health_gaps_router
from app.domains.insights.router import router as insights_router
from app.domains.projects.router import router as projects_router

settings = get_settings()

API = "/api"

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.include_router(projects_router, prefix=API)
app.include_router(dashboard_router, prefix=API)
app.include_router(data_quality_router, prefix=API)
app.include_router(health_gaps_router, prefix=API)
app.include_router(insights_router, prefix=API)
app.include_router(chat_router, prefix=API)
app.include_router(files_router, prefix=API)
