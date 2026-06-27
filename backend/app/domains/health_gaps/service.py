"""Healthcare gap & risk service (function 2).

Explores links between health-service utilisation (e.g. DHIS2) and external
context (climate, seasonality, accessibility) to identify seasonal risk windows
and patterns where utilisation may decline or service needs may increase.
"""

from app.domains.health_gaps.schemas import HealthGapReport


class HealthGapsService:
    async def analyze(self, project_id: str) -> HealthGapReport:
        """Analyse utilisation vs. seasonality/risk for the project.

        TODO(DfM): join utilisation data with seasonal/climate/accessibility
        context, detect risk windows and below-target sites, and produce
        localized explanations.
        """
        return HealthGapReport(project_id=project_id, monthly=[], sites=[], risk_windows=[])
