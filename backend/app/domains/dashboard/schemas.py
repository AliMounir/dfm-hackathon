"""Schemas for the dynamic dashboard composer agent (v4).

Insight-focused. The agent freely CURATES a precomputed data menu: it selects
KPIs and charts (by id), ORDERS them, assigns a tone + icon, writes titles and a
one-line insight per chart, and a short description. One LLM call, no tool loop.

  * ``DashboardDesign`` (+ ``KpiChoice`` / ``SectionChoice``) — the LLM OUTPUT
    (closed schemas for OpenAI strict mode; references menu ids, no raw values).
  * ``DashboardPlan`` (+ ``KpiCard`` / ``Section``) — the API response, with real
    values/data attached from the menu.

Mirrored on the frontend in ``frontend/src/features/dashboard/lib/types.ts``.
"""

from typing import Literal

from app.shared.schemas import AppBaseModel

Tone = Literal["emerald", "violet", "cyan", "amber", "rose"]
Icon = Literal["activity", "users", "heart", "baby", "stethoscope", "alert",
               "rain", "map", "file", "chart", "calendar", "shield"]


class Bilingual(AppBaseModel):
    fr: str = ""
    en: str = ""


# ── LLM output ──────────────────────────────────────────────────────────────

class KpiChoice(AppBaseModel):
    id: str  # a KPI id from the menu
    tone: Tone = "emerald"
    icon: Icon = "activity"
    title: Bilingual
    helper: Bilingual


class SectionChoice(AppBaseModel):
    id: str  # a chart id from the menu
    tone: Tone = "emerald"
    title: Bilingual
    insight: Bilingual  # one sentence: what this chart reveals


class DashboardDesign(AppBaseModel):
    description: Bilingual
    kpis: list[KpiChoice]
    sections: list[SectionChoice]


# ── API response ────────────────────────────────────────────────────────────

class KpiCard(AppBaseModel):
    id: str = ""
    tone: str
    icon: str
    title: Bilingual
    value: str
    helper: Bilingual


class Section(AppBaseModel):
    id: str = ""
    tone: str
    type: str  # bar | line
    title: Bilingual
    insight: Bilingual
    data: list


class DashboardPlan(AppBaseModel):
    project_id: str
    description: Bilingual
    kpis: list[KpiCard]
    sections: list[Section]
    generated_by: str = ""


# ── Chat (interactive dashboard editing) ────────────────────────────────────

class ChatTurn(AppBaseModel):
    role: str  # "user" | "assistant"
    content: str


class WidgetRef(AppBaseModel):
    id: str
    kind: str  # "kpi" | "chart"
    title: str


class ChatRequest(AppBaseModel):
    message: str
    history: list[ChatTurn] = []
    widgets: list[WidgetRef] = []  # what's currently on the dashboard
    language: str = "fr"  # UI language for the reply ("fr" | "en")


class ChartSpec(AppBaseModel):
    """A chart the agent wants to add (resolved to real data by the service)."""

    title: Bilingual
    insight: Bilingual
    tone: Tone = "cyan"
    type: Literal["bar", "line"] = "bar"
    dimension: str  # a dimension name from the data summary
    measure: str = ""  # a measure name (empty = count rows)
    agg: Literal["sum", "mean", "count"] = "sum"
    top: int = 8


class KpiSpec(AppBaseModel):
    label: Bilingual
    helper: Bilingual
    tone: Tone = "emerald"
    icon: Icon = "activity"
    expression: str  # pandas expression → value
    unit: str = ""


class ChatAgentOutput(AppBaseModel):
    """The chat agent's structured output."""

    reply: Bilingual  # the conversational answer (French first)
    clear: bool = False  # True to wipe the dashboard first (focus/replace requests)
    add_charts: list[ChartSpec] = []
    add_kpis: list[KpiSpec] = []
    remove_ids: list[str] = []  # widget ids to remove from the dashboard


class ChatResponse(AppBaseModel):
    """API response: reply + resolved dashboard operations."""

    reply: Bilingual
    clear: bool = False
    add_charts: list[Section] = []
    add_kpis: list[KpiCard] = []
    remove_ids: list[str] = []
    generated_by: str = ""
