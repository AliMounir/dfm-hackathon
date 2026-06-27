"""Healthcare gap & risk schemas (function 2)."""

from app.shared.schemas import AppBaseModel, Insight, MonthlyPoint, SitePoint


class HealthGapReport(AppBaseModel):
    """Utilisation trends + seasonal risk windows for a project.

    ``monthly`` pairs service volume with risk and target; ``sites`` ranks
    facilities by activity and change; ``risk_windows`` surfaces periods/areas
    where utilisation may decline or service needs may increase.
    """

    project_id: str
    monthly: list[MonthlyPoint] = []
    sites: list[SitePoint] = []
    risk_windows: list[Insight] = []
