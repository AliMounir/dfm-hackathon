"""Streaming chat: a tool-calling agent that streams its reply (SSE) and emits
dashboard operations as it calls mutation tools.

Wire format (one JSON object per SSE ``data:`` line):
  {"type": "token", "text": "..."}        # reply text delta
  {"type": "op", "op": {...}}             # a dashboard change (add chart/kpi, remove)
  {"type": "done"}
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator

from app.core.config import get_settings
from app.domains.dashboard import analytics
from app.domains.dashboard.deterministic_chat import fallback_response, stream_events
from app.domains.dashboard.schemas import Bilingual, ChatRequest, KpiCard, Section

logger = logging.getLogger(__name__)

_TONES = {"emerald", "violet", "cyan", "amber", "rose"}

STREAM_PROMPT = """You are the conversational M&E assistant for Doctors for
Madagascar, attached to a LIVE dashboard. Answer the user clearly, French first,
WHO-aligned, grounded in the real data.

To MODIFY the dashboard, CALL these tools (the changes apply live):
- add_chart(dimension, measure, agg, chart_type, title_fr, title_en, insight_fr,
  insight_en, tone): add a chart. Use a dimension/measure from the data summary;
  measure empty = count rows. chart_type is "bar" or "line".
- add_kpi(label_fr, label_en, expression, unit, helper_fr, helper_en, tone, icon):
  add a KPI; value comes from a pandas `expression` (df / sheet('NAME') / frames / pd).
- remove_widget(widget_id): remove a current widget (ids are listed).

To READ data: compute(project_id, expression), list_artifacts(project_id),
read_artifact(artifact_id). Never invent numbers.

The data summary includes `datasets` (each file/sheet, e.g. ACCOUCHEMENT) with its
dimensions and measures.

IMPORTANT — focus/replace vs. add:
- When the user asks to FOCUS, REFOCUS, or "generate a dashboard about/on X"
  (a topic, dataset, sex, site, period…), call clear_dashboard() FIRST, then add
  3-5 widgets (KPIs + charts) about ONLY that topic. The result must show only what
  they asked for — nothing from the previous view.
- When the user asks to ADD ("add a chart of…", "also show…"), just add (no clear).
- "remove that" → remove_widget with the id.

For charts pass `dataset` (e.g. 'ACCOUCHEMENT') to restrict to one file/sheet, and
choose informative dimension/measure pairs. Otherwise just answer (no changes).
Always write a short final reply (French first). Tones: emerald, violet, cyan,
amber, rose."""


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


def _fmt(value, unit: str) -> str:
    if isinstance(value, str):
        return value + (unit or "")
    v = float(value)
    if unit == "%":
        return f"{round(v, 1)}%"
    if abs(v) >= 1000:
        return f"{v:,.0f}"
    return (str(int(v)) if v == int(v) else f"{v:.1f}") + (unit or "")


def _tone(t: str, default: str) -> str:
    return t if t in _TONES else default


async def stream_chat(project_id: str, req: ChatRequest) -> AsyncIterator[str]:
    settings = get_settings()
    if not settings.llm_configured:
        response = fallback_response(project_id, req, generated_by="deterministic:no-llm")
        for event in stream_events(response, req.language):
            yield _sse(event)
        return

    from langchain_core.messages import AIMessageChunk
    from langchain_core.tools import tool
    from langgraph.prebuilt import create_react_agent

    from app.core.llm import get_chat_model
    from app.domains.dashboard.tools import compute, list_artifacts, read_artifact

    ops: list[dict] = []

    @tool
    def add_chart(dimension: str, measure: str = "", agg: str = "sum", chart_type: str = "bar",
                  title_fr: str = "", title_en: str = "", insight_fr: str = "", insight_en: str = "",
                  tone: str = "cyan", dataset: str = "") -> str:
        """Add a chart to the dashboard (group `dimension` by `measure`/count).
        Pass `dataset` (e.g. 'ACCOUCHEMENT') to restrict to one file/sheet."""
        data = analytics.aggregate(project_id, dimension, measure or None, agg, 8, dataset or None)
        if not data:
            return f"No data found for {(measure or 'count')} by {dimension}."
        sec = Section(
            id=f"c-{uuid.uuid4().hex[:8]}", tone=_tone(tone, "cyan"),
            type="line" if chart_type == "line" else "bar",
            title=Bilingual(fr=title_fr or dimension, en=title_en or title_fr or dimension),
            insight=Bilingual(fr=insight_fr, en=insight_en), data=data)
        ops.append({"kind": "add_chart", "section": sec.model_dump()})
        return f"Added chart with {len(data)} points."

    @tool
    def add_kpi(label_fr: str, label_en: str, expression: str, unit: str = "",
                helper_fr: str = "", helper_en: str = "", tone: str = "emerald",
                icon: str = "activity") -> str:
        """Add a KPI card; value computed from a pandas expression."""
        r = analytics.compute(project_id, expression)
        if "value" not in r:
            return f"Could not compute: {r.get('error')}"
        k = KpiCard(id=f"k-{uuid.uuid4().hex[:8]}", tone=_tone(tone, "emerald"), icon=icon,
                    title=Bilingual(fr=label_fr, en=label_en),
                    value=_fmt(r["value"], unit), helper=Bilingual(fr=helper_fr, en=helper_en))
        ops.append({"kind": "add_kpi", "kpi": k.model_dump()})
        return f"Added KPI '{label_en or label_fr}'."

    @tool
    def remove_widget(widget_id: str) -> str:
        """Remove a single dashboard widget by its id."""
        ops.append({"kind": "remove", "id": widget_id})
        return f"Removed {widget_id}."

    @tool
    def clear_dashboard() -> str:
        """Remove ALL current widgets (KPIs + charts) so the dashboard shows only
        what you add next. Call this FIRST when the user asks to focus / refocus the
        dashboard on a specific topic ('focus on X', 'show only X', 'generate a
        dashboard about X') so they see exactly what they asked for — then add the
        new widgets."""
        ops.append({"kind": "clear"})
        return "Cleared the dashboard."

    tools = [compute, list_artifacts, read_artifact, add_chart, add_kpi, remove_widget, clear_dashboard]
    agent = create_react_agent(get_chat_model(), tools, prompt=STREAM_PROMPT)

    summary = analytics.data_summary(project_id)
    widgets = "\n".join(f"- {w.id} [{w.kind}] {w.title}" for w in req.widgets) or "(none)"
    history = "\n".join(f"{h.role}: {h.content}" for h in req.history[-6:]) or "(start)"
    human = (
        f"Project id: {project_id}\nData summary: {json.dumps(summary, ensure_ascii=False)}\n"
        f"Current widgets:\n{widgets}\nConversation:\n{history}\n\nUser: {req.message}"
    )

    try:
        async for msg, _meta in agent.astream(
            {"messages": [("user", human)]}, {"recursion_limit": 40}, stream_mode="messages"
        ):
            if isinstance(msg, AIMessageChunk):
                c = msg.content
                if isinstance(c, str):
                    text = c
                elif isinstance(c, list):
                    text = "".join(
                        b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text"
                    )
                else:
                    text = ""
                if text:
                    yield _sse({"type": "token", "text": text})
    except Exception:
        logger.exception("chat stream failed")
        if not ops:
            response = fallback_response(project_id, req, generated_by="deterministic:error-fallback")
            for event in stream_events(response, req.language):
                yield _sse(event)
            return

    for op in ops:
        yield _sse({"type": "op", "op": op})
    yield _sse({"type": "done"})
