"""Resolves the chat agent's operations into real dashboard widgets."""

import logging
import uuid

from app.core.config import get_settings
from app.domains.dashboard import analytics
from app.domains.dashboard.schemas import (
    Bilingual,
    ChatRequest,
    ChatResponse,
    KpiCard,
    Section,
)

logger = logging.getLogger(__name__)


def _fmt(value, unit: str) -> str:
    if isinstance(value, str):
        return value + (unit or "")
    v = float(value)
    if unit == "%":
        return f"{round(v, 1)}%"
    if abs(v) >= 1000:
        return f"{v:,.0f}"
    base = str(int(v)) if v == int(v) else f"{v:.1f}"
    return base + (unit or "")


class ChatService:
    def reply(self, project_id: str, req: ChatRequest) -> ChatResponse:
        settings = get_settings()
        if not settings.llm_configured:
            return ChatResponse(
                reply=Bilingual(fr="Assistant non configuré (clé OpenAI manquante).",
                                en="Assistant not configured (missing OpenAI key)."),
                generated_by="no-llm",
            )

        try:
            from app.domains.dashboard.chat_agent import run_chat

            out = run_chat(project_id, req)
        except Exception:
            logger.exception("chat agent failed")
            return ChatResponse(
                reply=Bilingual(fr="Désolé, une erreur est survenue lors du traitement.",
                                en="Sorry, something went wrong."),
                generated_by="error",
            )

        charts: list[Section] = []
        for c in out.add_charts:
            data = analytics.aggregate(project_id, c.dimension, c.measure or None, c.agg, c.top)
            if data:
                charts.append(Section(
                    id=f"c-{uuid.uuid4().hex[:8]}", tone=c.tone, type=c.type,
                    title=c.title, insight=c.insight, data=data))

        kpis: list[KpiCard] = []
        for k in out.add_kpis:
            r = analytics.compute(project_id, k.expression)
            if "value" in r:
                kpis.append(KpiCard(
                    id=f"k-{uuid.uuid4().hex[:8]}", tone=k.tone, icon=k.icon,
                    title=k.label, value=_fmt(r["value"], k.unit), helper=k.helper))

        return ChatResponse(
            reply=out.reply, clear=out.clear, add_charts=charts, add_kpis=kpis,
            remove_ids=out.remove_ids, generated_by=f"openai:{settings.llm_model}",
        )
