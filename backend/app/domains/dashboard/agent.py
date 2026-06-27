"""The dashboard composer agent (LangGraph ReAct + LangChain tools, OpenAI).

LangChain/LangGraph are imported lazily inside ``compose_dashboard`` so the app
imports and runs before the agent deps are installed. The agent inspects a
project's data via the tools, then emits a structured ``DashboardPlan``.
"""

import logging

from app.domains.dashboard.schemas import DashboardPlan
from app.domains.dashboard.tools import TOOL_FUNCTIONS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the dashboard composer for the Doctors for Madagascar
M&E Data Assistant. When a coordinator opens a project, you decide which widgets
to show on its dashboard, in what order, and why.

Rules:
- Inspect the project first: call get_project_summary, then the data tools you
  need, and ALWAYS call compute_data_signals and list_widget_catalog.
- Choose widgets ONLY from the catalog 'type' values — never invent a widget.
- Rank by importance for THIS project (priority 1 = shown first):
  * metric_cards are almost always priority 1 (the headline numbers).
  * If there are high-severity quality issues, push quality_issues high — data
    must be trustworthy before it is interpreted.
  * If compute_data_signals shows below-target months or a seasonal dip, include
    seasonal_risk and set config.highlight_month to that month.
  * Include utilisation_trend when monthly data exists; site_comparison when
    sites are declining; risk_trend when risks are rising.
  * impact_story and suggested_questions are useful but lower priority.
- Write title and rationale bilingually as {"fr": ..., "en": ...}, French first.
  The rationale must say why this widget matters for THIS project's data.
- Return a DashboardPlan: a short summary plus the ordered widgets."""


def compose_dashboard(project_id: str) -> DashboardPlan:
    """Run the agent and return its DashboardPlan. Requires an OpenAI key."""
    from langchain_core.tools import StructuredTool
    from langgraph.prebuilt import create_react_agent

    from app.core.config import get_settings
    from app.core.llm import get_chat_model

    settings = get_settings()
    model = get_chat_model()
    tools = [StructuredTool.from_function(fn) for fn in TOOL_FUNCTIONS]
    human = (
        f"Compose the dashboard for project_id='{project_id}'. "
        "Inspect its data and signals using the tools, then return the plan."
    )

    plan: DashboardPlan | None = None
    try:
        agent = create_react_agent(
            model, tools, prompt=SYSTEM_PROMPT, response_format=DashboardPlan
        )
        result = agent.invoke({"messages": [("user", human)]})
        plan = result.get("structured_response")
    except TypeError:
        # Older langgraph without response_format: gather, then structure.
        agent = create_react_agent(model, tools, prompt=SYSTEM_PROMPT)
        result = agent.invoke({"messages": [("user", human)]})
        plan = model.with_structured_output(DashboardPlan).invoke(
            result["messages"] + [("user", "Now output the final DashboardPlan.")]
        )

    if plan is None:
        raise RuntimeError("Agent did not return a DashboardPlan.")
    plan.project_id = project_id
    plan.generated_by = f"openai:{settings.llm_model}"
    return plan
