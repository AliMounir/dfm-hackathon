"""Dashboard composer routes."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.domains.dashboard import analytics
from app.domains.dashboard.chat_service import ChatService
from app.domains.dashboard.chat_stream import stream_chat
from app.domains.dashboard.schemas import ChatRequest, ChatResponse, DashboardPlan
from app.domains.dashboard.service import DashboardService

router = APIRouter(prefix="/projects", tags=["dashboard"])
_service = DashboardService()
_chat = ChatService()


@router.get("/{project_id}/dashboard", response_model=DashboardPlan)
async def get_dashboard(project_id: str) -> DashboardPlan:
    """Compose the dynamic dashboard for a project (agent when a key is set,
    deterministic fallback otherwise)."""
    return _service.compose(project_id)


@router.post("/{project_id}/chat", response_model=ChatResponse)
async def chat(project_id: str, request: ChatRequest) -> ChatResponse:
    """Non-streaming chat (kept as a fallback): reply + dashboard operations."""
    return _chat.reply(project_id, request)


@router.post("/{project_id}/chat/stream")
async def chat_stream(project_id: str, request: ChatRequest) -> StreamingResponse:
    """Streaming chat (SSE): streams the reply token-by-token and emits dashboard
    operations as the agent applies them."""
    return StreamingResponse(
        stream_chat(project_id, request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


overview_router = APIRouter(prefix="/overview", tags=["overview"])


@overview_router.get("")
async def get_overview() -> dict:
    """Static, deterministic overview across all projects (no LLM)."""
    return analytics.overview()
