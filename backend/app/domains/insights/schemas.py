"""Insight, situation-explanation & storytelling schemas (function 3)."""

from app.shared.schemas import AppBaseModel, Insight, LocalizedText, Metric


class InsightReport(AppBaseModel):
    """Summaries, visualisation suggestions and an impact story for a project."""

    project_id: str
    metrics: list[Metric] = []
    insights: list[Insight] = []
    visualization_suggestions: list[LocalizedText] = []
    story: LocalizedText = {}


class StoryRequest(AppBaseModel):
    """Request a tailored impact story / situation explanation."""

    project_id: str
    audience: str = "team"  # team | donor | partner | research
    language: str = "fr"


class StoryResponse(AppBaseModel):
    project_id: str
    audience: str
    story: LocalizedText = {}
