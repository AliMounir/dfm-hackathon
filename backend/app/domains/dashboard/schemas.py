"""Schemas for the dynamic dashboard composer agent.

A ``DashboardPlan`` is the agent's output: an ordered list of widgets (chosen
from the fixed catalog) for the frontend to render when a project is opened.
Mirrored on the frontend in ``frontend/src/features/dashboard/lib/types.ts``.
"""

from typing import Literal

from app.shared.schemas import AppBaseModel, LocalizedText

# The catalog of widgets the agent may choose from. It cannot invent new ones —
# it selects, configures, and ranks these (see catalog.py for descriptions).
WidgetType = Literal[
    "metric_cards",
    "utilisation_trend",
    "risk_trend",
    "site_comparison",
    "quality_issues",
    "insight_cards",
    "impact_story",
    "seasonal_risk",
    "suggested_questions",
]

# Which slice of the project's data feeds a widget (the frontend reads this key).
DataKey = Literal[
    "metrics",
    "monthly",
    "sites",
    "qualityIssues",
    "insights",
    "story",
    "suggestedQuestions",
    "derived",
]


class WidgetSpec(AppBaseModel):
    """One widget the agent decided to show, with placement + justification."""

    type: WidgetType
    title: LocalizedText
    data_key: DataKey
    priority: int  # 1 = most important / shown first
    rationale: LocalizedText  # why this matters for THIS project (FR-first)
    config: dict = {}  # optional extras, e.g. {"highlight_month": "Apr"}


class DashboardPlan(AppBaseModel):
    """The agent's full plan for a project's dashboard."""

    project_id: str
    summary: LocalizedText  # one-line "what to look at first"
    widgets: list[WidgetSpec]
    generated_by: str = ""  # e.g. "openai:gpt-4o-mini" or "rule-based-fallback"
