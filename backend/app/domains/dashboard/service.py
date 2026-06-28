"""Dashboard composition service (v4).

Precomputes the data menu, asks the agent (one LLM call) to curate it, then
attaches the real values/data. Deterministic fallback when no key / on failure.
"""

import logging

from app.core.config import get_settings
from app.domains.dashboard import analytics
from app.domains.dashboard.schemas import Bilingual, DashboardPlan, KpiCard, Section

logger = logging.getLogger(__name__)

_TONES = ["emerald", "violet", "cyan", "amber", "rose"]


def _t(fr: str, en: str) -> Bilingual:
    return Bilingual(fr=fr, en=en)


class DashboardService:
    def compose(self, project_id: str) -> DashboardPlan:
        menu = analytics.dashboard_menu(project_id)
        if not menu["kpis"] and not menu["charts"]:
            return DashboardPlan(
                project_id=project_id,
                description=_t("Aucune donnée analysable.", "No analysable data."),
                kpis=[], sections=[], generated_by="no-data",
            )

        kpi_by = {k["id"]: k for k in menu["kpis"]}
        chart_by = {c["id"]: c for c in menu["charts"]}
        settings = get_settings()

        if settings.llm_configured:
            try:
                from app.domains.dashboard.agent import compose_design

                d = compose_design(project_id, menu)
                kpis = [
                    KpiCard(id=f"kpi-{i}", tone=c.tone, icon=c.icon, title=c.title,
                            value=kpi_by[c.id]["value"], helper=c.helper)
                    for i, c in enumerate(x for x in d.kpis if x.id in kpi_by)
                ]
                sections = [
                    Section(id=f"sec-{i}", tone=c.tone, type=chart_by[c.id]["type"], title=c.title,
                            insight=c.insight, data=chart_by[c.id]["data"])
                    for i, c in enumerate(x for x in d.sections if x.id in chart_by)
                ]
                if kpis or sections:
                    return DashboardPlan(
                        project_id=project_id, description=d.description, kpis=kpis,
                        sections=sections, generated_by=f"openai:{settings.llm_model}",
                    )
                logger.warning("agent returned no valid ids; using fallback")
            except Exception:
                logger.exception("dashboard agent failed; using rule-based fallback")

        return self._fallback(project_id, menu)

    def _fallback(self, project_id: str, menu: dict) -> DashboardPlan:
        facts = analytics.project_facts(project_id)
        kpis = [
            KpiCard(id=f"kpi-{i}", tone=_TONES[i % len(_TONES)], icon="activity",
                    title=_t(k["hint"], k["hint"]), value=k["value"], helper=Bilingual())
            for i, k in enumerate(menu["kpis"][:5])
        ]
        sections = [
            Section(id=f"sec-{i}", tone=_TONES[i % len(_TONES)], type=c["type"],
                    title=_t(c["hint"], c["hint"]),
                    insight=_t("Calculé à partir des données.", "Computed from the data."),
                    data=c["data"])
            for i, c in enumerate(menu["charts"][:5])
        ]
        return DashboardPlan(
            project_id=project_id,
            description=_t(
                f"Ce projet contient {facts['n_records']} enregistrement(s) sur "
                f"{facts['n_files']} fichier(s). (Ajoutez une clé OpenAI pour l'agent.)",
                f"This project holds {facts['n_records']} record(s) across {facts['n_files']} "
                "file(s). (Add an OpenAI key for the agent.)"),
            kpis=kpis, sections=sections, generated_by="rule-based-fallback",
        )
