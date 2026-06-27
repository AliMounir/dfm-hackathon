"""Shared API schemas for the DfM M&E Data Assistant.

These mirror the TypeScript contract in ``frontend`` ``src/lib/projects.ts`` so
the frontend and backend stay in sync. The assistant is bilingual: most
human-facing text is a :data:`LocalizedText` with French + English variants
(French is the primary audience language).
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict

# fr is the primary audience language; en is provided for the team / donors.
Language = Literal["fr", "en"]

# Free-form bilingual text, e.g. {"fr": "...", "en": "..."}.
LocalizedText = dict[str, str]

# Accent colours used by metric cards / charts on the frontend.
MetricTone = Literal["emerald", "cyan", "amber", "rose", "violet"]

Severity = Literal["high", "medium", "low"]


class AppBaseModel(BaseModel):
    """Base model: forbid unexpected fields, allow population by field name."""

    model_config = ConfigDict(extra="forbid")


class Metric(AppBaseModel):
    """A headline indicator card (e.g. 'Ultrasounds performed: 10,169')."""

    id: str
    label: LocalizedText
    value: str
    helper: LocalizedText
    tone: MetricTone = "emerald"


class QualityIssue(AppBaseModel):
    """A data-quality finding (function 1).

    Beyond flagging the issue, the assistant explains *why it matters* and the
    recommended *action* — both bilingual, French-first.
    """

    id: str
    severity: Severity
    title: LocalizedText
    count: int
    why_it_matters: LocalizedText
    action: LocalizedText


class Insight(AppBaseModel):
    """An interpretation / storytelling item (function 3)."""

    id: str
    title: LocalizedText
    body: LocalizedText
    tag: LocalizedText


class MonthlyPoint(AppBaseModel):
    """One month of service-utilisation vs. risk vs. target (function 2)."""

    month: str
    services: int
    risks: int
    target: int


class SitePoint(AppBaseModel):
    """Per-site (CSB / facility) value and month-over-month change."""

    site: str
    value: float
    change: float
