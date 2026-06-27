"""File service — ingest M&E data exports for a project.

Handles uploads of REDCap / DHIS2 / Excel / CSV / PDF exports that the other
domains (data_quality, health_gaps, insights) then analyse.
"""

from app.core.config import get_settings
from app.domains.files.schemas import DataFile


class FileService:
    def __init__(self) -> None:
        self._settings = get_settings()

    def list_files(self, project_id: str) -> list[DataFile]:
        """List data files attached to a project.

        TODO(DfM): scan the project's data folder (or storage) and classify
        each export by kind.
        """
        return []

    async def ingest(self, project_id: str, filename: str, content: bytes) -> DataFile:
        """Store and register an uploaded data export.

        TODO(DfM): persist the file, detect its kind, and (optionally) parse
        it into a normalized table for the analysis domains.
        """
        return DataFile(
            id=f"{project_id}:{filename}",
            project_id=project_id,
            filename=filename,
            size_bytes=len(content),
        )
