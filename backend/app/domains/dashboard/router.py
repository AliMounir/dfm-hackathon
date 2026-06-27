"""Dashboard composer routes."""

from fastapi import APIRouter

from app.domains.dashboard.schemas import DashboardPlan
from app.domains.dashboard.service import DashboardService

router = APIRouter(prefix="/projects", tags=["dashboard"])
_service = DashboardService()


@router.get("/{project_id}/dashboard", response_model=DashboardPlan)
async def get_dashboard(project_id: str) -> DashboardPlan:
    """Compose the dynamic dashboard for a project.

    Runs the LangGraph agent when an OpenAI key is configured; otherwise returns
    a deterministic, signal-driven plan. Either way the frontend renders the
    returned widgets in order.
    """
    return _service.compose(project_id)
