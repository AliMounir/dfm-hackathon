"""The widget catalog — the fixed set of widgets the agent may choose from.

This is the "already given widgets" the agent reasons over. Each entry tells the
agent what the widget shows, which data it needs, and when it is worth showing.
The frontend has a matching renderer for every ``type`` here.
"""

WIDGET_CATALOG: list[dict] = [
    {
        "type": "metric_cards",
        "data_key": "metrics",
        "shows": "Headline KPI cards (e.g. ultrasounds performed, beneficiaries).",
        "when_to_use": "Almost always — gives the at-a-glance numbers. Usually priority 1.",
    },
    {
        "type": "utilisation_trend",
        "data_key": "monthly",
        "shows": "Monthly service volume vs. target (line/bar over months).",
        "when_to_use": "When monthly data exists; especially if services fall below target.",
    },
    {
        "type": "risk_trend",
        "data_key": "monthly",
        "shows": "Monthly risk/complication counts over time.",
        "when_to_use": "When risks are rising or notable relative to services.",
    },
    {
        "type": "site_comparison",
        "data_key": "sites",
        "shows": "Per-site (CSB/facility) values and month-over-month change.",
        "when_to_use": "When some sites are declining or vary a lot — surfaces where to act.",
    },
    {
        "type": "quality_issues",
        "data_key": "qualityIssues",
        "shows": "Data-quality findings with severity + why-it-matters + action (FR).",
        "when_to_use": "When issues exist; push high-severity issues high (data must be trusted first).",
    },
    {
        "type": "insight_cards",
        "data_key": "insights",
        "shows": "Interpretation insights (seasonal risk, continuity of care, gaps).",
        "when_to_use": "When there are interpretation notes worth highlighting.",
    },
    {
        "type": "impact_story",
        "data_key": "story",
        "shows": "Short narrative summary for teams/donors/partners.",
        "when_to_use": "Good closing widget; lower priority than data + quality.",
    },
    {
        "type": "seasonal_risk",
        "data_key": "derived",
        "shows": "A callout highlighting a seasonal risk window / below-target period.",
        "when_to_use": "When compute_data_signals flags a seasonal dip or below-target months.",
    },
    {
        "type": "suggested_questions",
        "data_key": "suggestedQuestions",
        "shows": "Clickable example questions for the chat assistant.",
        "when_to_use": "Helpful entry point; usually low priority near the bottom.",
    },
]

WIDGET_TYPES = [w["type"] for w in WIDGET_CATALOG]
