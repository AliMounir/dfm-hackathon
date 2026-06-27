"""Data-quality routes (function 1)."""

from fastapi import APIRouter

from app.domains.data_quality.schemas import DataQualityReport
from app.domains.data_quality.service import DataQualityService

router = APIRouter(prefix="/data-quality", tags=["data-quality"])
_service = DataQualityService()


@router.get("/{project_id}", response_model=DataQualityReport)
async def review_project(project_id: str) -> DataQualityReport:
    """Review a project's data export and return explained quality issues."""
    return await _service.review(project_id)
