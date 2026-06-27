"""Chat routes — ask the assistant about a project (French-first)."""

from fastapi import APIRouter

from app.domains.chat.schemas import ChatRequest, ChatResponse
from app.domains.chat.service import ChatService

router = APIRouter(prefix="/chat", tags=["chat"])
_service = ChatService()


@router.post("", response_model=ChatResponse)
async def ask(request: ChatRequest) -> ChatResponse:
    return await _service.ask(request)
