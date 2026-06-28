"""The dashboard composer agent (v4) — a single structured-output call.

The service precomputes a data menu (KPIs + charts with real data); the agent
makes ONE LLM call to curate it: select, order, colour, title, and write an
insight per chart, plus a short description. No tool loop → fast. LangChain is
imported lazily.
"""

import json
import logging

from app.domains.dashboard.schemas import DashboardDesign

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the insights dashboard designer for the Doctors for
Madagascar M&E Data Assistant. You are given a MENU of candidate KPIs and charts
already computed from a project's real data. Design the most insightful dashboard.

- Pick the KPIs and charts that best help understand THIS project. You have
  freedom: choose how many, and ORDER them as makes sense for this project (the
  layout should vary between projects — don't always use the same order).
- Reference only `id`s from the menu. Do not invent ids, values, or data.
- Give each item a clear bilingual `title` (French first). For KPIs, also set a
  `helper` (a short qualifier like "bénéficiaires uniques", "à valider"), a
  `tone`, and an `icon`. For charts, write a one-sentence bilingual `insight`:
  what the chart REVEALS about the data (a trend, a concentration, a gap).
- Use VARIED tones (emerald, violet, cyan, amber, rose) so the dashboard is
  colourful — different tones for different KPIs.
- Pick icons that fit each KPI (activity, users, heart, baby, stethoscope, alert,
  rain, map, file, chart, calendar, shield).
- Write a 2-3 sentence `description` of what the data is about.
- Focus ONLY on insights about the data. Do NOT produce data-quality checks.
French first everywhere."""


def compose_design(project_id: str, menu: dict) -> DashboardDesign:
    """One structured-output call over the precomputed menu. Requires key + deps."""
    from app.core.llm import get_chat_model

    model = get_chat_model().with_structured_output(DashboardDesign)
    human = (
        f"Project '{project_id}'.\n\nDATA MENU (real values + chart data) — select "
        "and curate from these:\n"
        f"{json.dumps(menu, ensure_ascii=False)[:14000]}\n\nDesign the dashboard now."
    )
    return model.invoke([("system", SYSTEM_PROMPT), ("human", human)])
