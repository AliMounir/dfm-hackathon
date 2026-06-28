"""The conversational M&E assistant that can edit the dashboard live.

Given the user's message, the project's data summary, the current dashboard
widgets, and recent history, it returns a structured ``ChatAgentOutput``: a
French-first reply plus operations (add charts / add KPIs / remove widgets).
Numbers are given as specs/expressions the service resolves against real data.
LangChain is imported lazily.
"""

import json
import logging

from app.domains.dashboard import analytics
from app.domains.dashboard.schemas import ChatAgentOutput, ChatRequest

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the conversational Monitoring & Evaluation assistant for
Doctors for Madagascar. You help project coordinators understand a project's real
data, French first, in clear, WHO-aligned language.

You are attached to a LIVE dashboard and can change it as you chat:
- add_charts: add a new chart. Pick a `dimension` and (optionally) a `measure`
  ONLY from the data summary's lists; set agg (sum/mean/count), type (bar/line),
  a bilingual title + a one-sentence insight, and a tone. The system computes the
  real data — you only specify what to chart.
- add_kpis: add a KPI card. Give a bilingual label + helper, tone, icon, unit, and
  a pandas `expression` (verify it first with the compute tool). Names available
  in expressions: df (largest sheet), sheet('NAME'), frames, pd.
- remove_ids: ids of current widgets to remove (the current widgets are listed,
  each as "id [kind] title"). Use this to replace or declutter when asked.

Reading the data:
- compute(project_id, expression): get REAL numbers for your reply.
- list_artifacts(project_id): list the data files uploaded to the database for
  this project (REDCap/DHIS2/Excel/CSV exports).
- read_artifact(artifact_id): inspect one uploaded file's columns + sample rows.
Use these to ground answers in the actual data; never invent numbers.

Rules:
- FOCUS/REPLACE: when the user asks to focus/refocus the dashboard or "generate a
  dashboard about/on X", set `clear: true` AND provide add_charts/add_kpis for ONLY
  that topic — they must end up seeing only what they asked for.
- ADD: for "add a chart of…"/"also show…", leave `clear: false` and just add.
- "remove that" → put the id in remove_ids. If they just ask a question, answer and
  leave everything empty (clear=false, no ops).
- Keep `reply` concise and helpful. French first."""


def run_chat(project_id: str, req: ChatRequest) -> ChatAgentOutput:
    from langgraph.prebuilt import create_react_agent

    from app.core.llm import get_chat_model
    from app.domains.dashboard.tools import CHAT_TOOLS

    model = get_chat_model()
    summary = analytics.data_summary(project_id)
    widgets = "\n".join(f"- {w.id} [{w.kind}] {w.title}" for w in req.widgets) or "(none)"
    history = "\n".join(f"{h.role}: {h.content}" for h in req.history[-6:]) or "(start)"
    human = (
        f"Project id: {project_id}\n"
        f"Data summary (dimensions/measures you may chart): {json.dumps(summary, ensure_ascii=False)}\n\n"
        f"Current dashboard widgets:\n{widgets}\n\n"
        f"Conversation so far:\n{history}\n\n"
        f"User: {req.message}\n\n"
        "Reply, and modify the dashboard only if the user asked for it."
    )

    out: ChatAgentOutput | None = None
    try:
        agent = create_react_agent(model, CHAT_TOOLS, prompt=SYSTEM_PROMPT, response_format=ChatAgentOutput)
        result = agent.invoke({"messages": [("user", human)]}, {"recursion_limit": 40})
        out = result.get("structured_response")
    except TypeError:
        agent = create_react_agent(model, CHAT_TOOLS, prompt=SYSTEM_PROMPT)
        result = agent.invoke({"messages": [("user", human)]}, {"recursion_limit": 40})
        out = model.with_structured_output(ChatAgentOutput).invoke(
            result["messages"] + [("user", "Now output the final ChatAgentOutput.")]
        )
    if out is None:
        raise RuntimeError("chat agent returned no output")
    return out
