"""Data-quality routes."""

from fastapi import APIRouter

from app.domains.data_quality.schemas import DataQualityReport, DataQualityRequest
from app.domains.data_quality.service import DataQualityService

router = APIRouter(prefix="/data-quality", tags=["data-quality"])
_service = DataQualityService()


@router.get("/{project_id}", response_model=DataQualityReport)
async def review_project(project_id: str) -> DataQualityReport:
    """Review supported files discovered under ``data/projects/{project_id}``."""
    return await _service.review(project_id)


@router.post("/{project_id}", response_model=DataQualityReport)
async def review_uploaded_files(project_id: str, request: DataQualityRequest) -> DataQualityReport:
    """Review explicit uploaded-file metadata from an orchestration workflow."""
    return await _service.review_request(project_id, request)
