"""Tools the dashboard composer agent can call.

These are plain functions (no LangChain import here, so the app imports without
the agent deps). ``agent.py`` wraps them as LangChain tools at runtime. Each
docstring becomes the tool description the LLM sees, so keep them clear.

All read from ``sample_data`` for now — swap to real data services later.
"""

from app.domains.dashboard.catalog import WIDGET_CATALOG
from app.domains.dashboard.sample_data import get_project_data


def get_project_summary(project_id: str) -> dict:
    """Get a project's header: name, focus, data sources, status, and how much
    data is available (counts of metrics, monthly points, sites, issues)."""
    p = get_project_data(project_id)
    if not p:
        return {"error": f"unknown project {project_id!r}"}
    return {
        "name": p["name"],
        "focus": p["focus"],
        "data_sources": p["data_sources"],
        "status": p["status"],
        "available": {
            "metrics": len(p["metrics"]),
            "monthly_points": len(p["monthly"]),
            "sites": len(p["sites"]),
            "quality_issues": len(p["quality_issues"]),
            "insights": len(p["insights"]),
            "has_story": bool(p["story"]),
        },
    }


def get_metrics(project_id: str) -> dict:
    """Get the project's headline KPI metrics (label, value, helper)."""
    p = get_project_data(project_id)
    return {"metrics": p["metrics"]} if p else {"error": "unknown project"}


def get_monthly_trends(project_id: str) -> dict:
    """Get monthly service volume, risk counts, and target per month."""
    p = get_project_data(project_id)
    return {"monthly": p["monthly"]} if p else {"error": "unknown project"}


def get_site_breakdown(project_id: str) -> dict:
    """Get per-site (facility/CSB) values and month-over-month % change."""
    p = get_project_data(project_id)
    return {"sites": p["sites"]} if p else {"error": "unknown project"}


def get_quality_issues(project_id: str) -> dict:
    """Get data-quality findings (severity, count, why-it-matters, action)."""
    p = get_project_data(project_id)
    return {"quality_issues": p["quality_issues"]} if p else {"error": "unknown project"}


def get_insights(project_id: str) -> dict:
    """Get interpretation insights and the project's narrative impact story."""
    p = get_project_data(project_id)
    return {"insights": p["insights"], "story": p["story"]} if p else {"error": "unknown project"}


def compute_data_signals(project_id: str) -> dict:
    """Compute IMPORTANCE signals to decide what is worth showing first:
    below-target months, service trend direction, declining sites, high-severity
    issue count, rising risks, and any seasonal dip month. Use these to rank widgets."""
    p = get_project_data(project_id)
    if not p:
        return {"error": "unknown project"}
    monthly = p["monthly"]
    sites = p["sites"]
    issues = p["quality_issues"]

    below_target = [m["month"] for m in monthly if m["services"] < m["target"]]
    declining_sites = [s for s in sites if s["change"] < 0]

    # service trend over the last two months
    trend = "flat"
    if len(monthly) >= 2:
        delta = monthly[-1]["services"] - monthly[-2]["services"]
        trend = "up" if delta > 0 else "down" if delta < 0 else "flat"

    # biggest month-over-month service drop (a candidate seasonal dip)
    seasonal_dip_month = None
    biggest_drop = 0
    for prev, cur in zip(monthly, monthly[1:]):
        drop = prev["services"] - cur["services"]
        if drop > biggest_drop:
            biggest_drop = drop
            seasonal_dip_month = cur["month"]

    risks_rising = len(monthly) >= 2 and monthly[-1]["risks"] > monthly[0]["risks"]

    return {
        "below_target_months": below_target,
        "service_trend": trend,
        "declining_sites": [{"site": s["site"], "change": s["change"]} for s in declining_sites],
        "high_severity_issue_count": sum(1 for i in issues if i["severity"] == "high"),
        "total_issue_count": len(issues),
        "risks_rising": risks_rising,
        "seasonal_dip_month": seasonal_dip_month,
    }


def list_widget_catalog() -> dict:
    """List the widgets the dashboard can render. You MUST only choose widget
    'type' values from this catalog — you cannot invent new widgets."""
    return {"widgets": WIDGET_CATALOG}


# Registry the agent wraps as LangChain tools (order = preferred discovery order).
TOOL_FUNCTIONS = [
    get_project_summary,
    get_metrics,
    get_monthly_trends,
    get_site_breakdown,
    get_quality_issues,
    get_insights,
    compute_data_signals,
    list_widget_catalog,
]
