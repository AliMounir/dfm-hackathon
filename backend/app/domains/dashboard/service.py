"""Dashboard composition service.

Uses the LLM agent when an API key is configured; otherwise (and on agent
failure) returns a deterministic, signal-driven fallback plan so the endpoint
always works — even before the OpenAI key is added.
"""

import logging

from app.core.config import get_settings
from app.domains.dashboard.schemas import DashboardPlan, WidgetSpec
from app.domains.dashboard.tools import compute_data_signals, get_project_summary

logger = logging.getLogger(__name__)


def _t(fr: str, en: str) -> dict:
    return {"fr": fr, "en": en}


class DashboardService:
    def compose(self, project_id: str) -> DashboardPlan:
        settings = get_settings()
        if settings.llm_configured:
            try:
                from app.domains.dashboard.agent import compose_dashboard

                return compose_dashboard(project_id)
            except Exception:
                logger.exception("dashboard agent failed; using rule-based fallback")
        return self._fallback(project_id)

    def _fallback(self, project_id: str) -> DashboardPlan:
        """Deterministic plan driven by compute_data_signals (no LLM)."""
        summary = get_project_summary(project_id)
        if "error" in summary:
            return DashboardPlan(
                project_id=project_id,
                summary=_t("Projet inconnu.", "Unknown project."),
                widgets=[],
                generated_by="rule-based-fallback",
            )
        sig = compute_data_signals(project_id)
        avail = summary["available"]
        widgets: list[WidgetSpec] = []
        p = 1

        if avail["metrics"]:
            widgets.append(WidgetSpec(
                type="metric_cards", data_key="metrics", priority=p,
                title=_t("Indicateurs clés", "Key metrics"),
                rationale=_t("Vue d'ensemble chiffrée du projet.", "At-a-glance project numbers."),
            )); p += 1

        if sig.get("high_severity_issue_count", 0) > 0 and avail["quality_issues"]:
            widgets.append(WidgetSpec(
                type="quality_issues", data_key="qualityIssues", priority=p,
                title=_t("Problèmes de qualité prioritaires", "Priority data-quality issues"),
                rationale=_t(
                    f"{sig['high_severity_issue_count']} problème(s) de gravité élevée à corriger avant interprétation.",
                    f"{sig['high_severity_issue_count']} high-severity issue(s) to fix before interpreting the data."),
            )); p += 1

        if sig.get("below_target_months") or sig.get("seasonal_dip_month"):
            month = sig.get("seasonal_dip_month") or (sig["below_target_months"][0] if sig.get("below_target_months") else "")
            widgets.append(WidgetSpec(
                type="seasonal_risk", data_key="derived", priority=p,
                title=_t("Fenêtre de risque saisonnier", "Seasonal risk window"),
                rationale=_t(
                    f"Activité sous la cible / baisse notable autour de {month}.",
                    f"Activity below target / notable drop around {month}."),
                config={"highlight_month": month},
            )); p += 1

        if avail["monthly_points"]:
            widgets.append(WidgetSpec(
                type="utilisation_trend", data_key="monthly", priority=p,
                title=_t("Tendance d'utilisation vs cible", "Utilisation vs target"),
                rationale=_t(
                    f"Tendance des services {('en baisse' if sig.get('service_trend') == 'down' else 'à suivre')}.",
                    f"Service trend is {sig.get('service_trend', 'flat')}."),
            )); p += 1

        if sig.get("declining_sites"):
            names = ", ".join(s["site"] for s in sig["declining_sites"])
            widgets.append(WidgetSpec(
                type="site_comparison", data_key="sites", priority=p,
                title=_t("Comparaison par site", "Site comparison"),
                rationale=_t(f"Sites en baisse : {names}.", f"Declining sites: {names}."),
            )); p += 1

        if sig.get("risks_rising") and avail["monthly_points"]:
            widgets.append(WidgetSpec(
                type="risk_trend", data_key="monthly", priority=p,
                title=_t("Tendance des risques", "Risk trend"),
                rationale=_t("Les cas à risque augmentent sur la période.", "At-risk cases rising over the period."),
            )); p += 1

        if avail["insights"]:
            widgets.append(WidgetSpec(
                type="insight_cards", data_key="insights", priority=p,
                title=_t("Analyses", "Insights"),
                rationale=_t("Pistes d'interprétation des données.", "Interpretation leads for the data."),
            )); p += 1

        if avail["has_story"]:
            widgets.append(WidgetSpec(
                type="impact_story", data_key="story", priority=p,
                title=_t("Récit d'impact", "Impact story"),
                rationale=_t("Synthèse narrative pour équipe/bailleurs.", "Narrative summary for team/donors."),
            )); p += 1

        widgets.append(WidgetSpec(
            type="suggested_questions", data_key="suggestedQuestions", priority=p,
            title=_t("Questions suggérées", "Suggested questions"),
            rationale=_t("Point d'entrée pour interroger l'assistant.", "Entry point to ask the assistant."),
        ))

        return DashboardPlan(
            project_id=project_id,
            summary=_t(
                "Plan généré par règles (ajoutez une clé OpenAI pour l'agent).",
                "Rule-based plan (add an OpenAI key to use the agent)."),
            widgets=widgets,
            generated_by="rule-based-fallback",
        )
