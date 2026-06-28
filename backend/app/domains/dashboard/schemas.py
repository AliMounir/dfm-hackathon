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
    tone: str
    icon: str
    title: Bilingual
    value: str
    helper: Bilingual


class Section(AppBaseModel):
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
