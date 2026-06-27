"""Insight & storytelling routes (function 3)."""

from fastapi import APIRouter

from app.domains.insights.schemas import InsightReport, StoryRequest, StoryResponse
from app.domains.insights.service import InsightsService

router = APIRouter(prefix="/insights", tags=["insights"])
_service = InsightsService()


@router.get("/{project_id}", response_model=InsightReport)
async def get_insights(project_id: str) -> InsightReport:
    """Return summaries, visualisation suggestions and an impact story."""
    return await _service.report(project_id)


@router.post("/story", response_model=StoryResponse)
async def generate_story(request: StoryRequest) -> StoryResponse:
    """Generate an audience-tailored impact story / situation explanation."""
    return await _service.generate_story(request)
