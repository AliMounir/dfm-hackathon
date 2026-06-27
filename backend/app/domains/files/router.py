"""File routes — list / upload M&E data exports."""

from fastapi import APIRouter, UploadFile

from app.domains.files.schemas import DataFile
from app.domains.files.service import FileService

router = APIRouter(prefix="/files", tags=["files"])
_service = FileService()


@router.get("/{project_id}", response_model=list[DataFile])
async def list_files(project_id: str) -> list[DataFile]:
    return _service.list_files(project_id)


@router.post("/{project_id}", response_model=DataFile)
async def upload_file(project_id: str, file: UploadFile) -> DataFile:
    content = await file.read()
    return await _service.ingest(project_id, file.filename or "upload", content)
