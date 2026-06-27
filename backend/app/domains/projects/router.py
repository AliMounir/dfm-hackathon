"""Project routes."""

from fastapi import APIRouter, HTTPException

from app.domains.projects.schemas import Project, ProjectSummary
from app.domains.projects.service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])
_service = ProjectService()


@router.get("", response_model=list[ProjectSummary])
async def list_projects() -> list[ProjectSummary]:
    return _service.list_projects()


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    project = _service.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project
