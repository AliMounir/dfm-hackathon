"""Chat schemas — coordinators ask questions (in French) about a project."""

from app.shared.schemas import AppBaseModel


class ChatRequest(AppBaseModel):
    project_id: str
    message: str
    language: str = "fr"


class ChatResponse(AppBaseModel):
    message: str
    language: str = "fr"
    # Names of any tools/data sources the assistant consulted (debugging aid).
    sources: list[str] = []
