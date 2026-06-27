"""Project schemas — an M&E project/area at Doctors for Madagascar.

Mirrors the ``Project`` type in the frontend ``src/lib/projects.ts``.
"""

from app.shared.schemas import (
    AppBaseModel,
    Insight,
    LocalizedText,
    Metric,
    MetricTone,
    MonthlyPoint,
    QualityIssue,
    SitePoint,
)


class ProjectSummary(AppBaseModel):
    """Lightweight project entry for lists / pickers."""

    id: str
    name: str
    folder: str
    focus: LocalizedText = {}
    data_sources: list[str] = []
    status: LocalizedText = {}
    accent: MetricTone = "emerald"


class Project(ProjectSummary):
    """Full project detail bundling all three functions' data."""

    metrics: list[Metric] = []
    monthly: list[MonthlyPoint] = []
    sites: list[SitePoint] = []
    quality_issues: list[QualityIssue] = []
    insights: list[Insight] = []
    suggested_questions: list[LocalizedText] = []
    story: LocalizedText = {}
