"""Healthcare gap & risk routes (function 2)."""

from fastapi import APIRouter

from app.domains.health_gaps.schemas import HealthGapReport
from app.domains.health_gaps.service import HealthGapsService

router = APIRouter(prefix="/health-gaps", tags=["health-gaps"])
_service = HealthGapsService()


@router.get("/{project_id}", response_model=HealthGapReport)
async def analyze_project(project_id: str) -> HealthGapReport:
    """Return utilisation trends and seasonal risk windows for a project."""
    return await _service.analyze(project_id)
