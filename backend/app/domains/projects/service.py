"""Project service.

For the prototype, projects are discovered from the repo ``data/projects/``
folder (one sub-folder per project). Full project detail (metrics, monthly
trends, quality issues, insights) is a TODO — load it from the project's data
exports or a database.
"""

from app.core.config import get_settings
from app.domains.projects.schemas import Project, ProjectSummary


class ProjectService:
    def __init__(self) -> None:
        self._settings = get_settings()

    def list_projects(self) -> list[ProjectSummary]:
        """List M&E projects by scanning ``data/projects/``."""
        root = self._settings.data_dir / "projects"
        if not root.exists():
            return []
        summaries: list[ProjectSummary] = []
        for entry in sorted(p for p in root.iterdir() if p.is_dir()):
            summaries.append(
                ProjectSummary(
                    id=entry.name,
                    name=entry.name.replace("-", " ").upper(),
                    folder=f"data/projects/{entry.name}",
                )
            )
        return summaries

    def get(self, project_id: str) -> Project | None:
        """Return full project detail, or None if unknown.

        TODO(DfM): build the detail from the project's data exports
        (metrics, monthly utilisation, quality issues, insights, story).
        """
        summary = next((s for s in self.list_projects() if s.id == project_id), None)
        if summary is None:
            return None
        return Project(**summary.model_dump())
