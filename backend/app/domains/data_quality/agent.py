"""The Data Quality Agent: one privacy-guarded structured-output LLM call."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from app.domains.data_quality.schemas import DataQualityAgentInterpretation

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).with_name("prompt.md")

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\s().-]*){8,}(?!\d)")
URL_RE = re.compile(r"\b(?:https?://|www\.)\S+", re.IGNORECASE)
GPS_RE = re.compile(r"(?<!\d)-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}(?!\d)")
ID_RE = re.compile(r"\b(?:cin|passport|passeport)\s*[:#-]?\s*[A-Z0-9-]{5,}\b", re.IGNORECASE)


def interpret_quality_context(project_id: str, safe_context: dict[str, Any]) -> DataQualityAgentInterpretation:
    """Return concise agent notes over sanitized data-quality context."""
    from app.core.llm import get_chat_model

    payload = json.dumps(safe_context, ensure_ascii=False, default=str)
    _assert_safe_for_llm(payload)

    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    model = get_chat_model().with_structured_output(DataQualityAgentInterpretation)
    human = (
        f"Project '{project_id}'.\n\n"
        "SANITIZED DATA QUALITY CONTEXT (no raw direct identifiers):\n"
        f"{payload[:14000]}\n\n"
        "Interpret the findings now."
    )
    return model.invoke([("system", prompt), ("human", human)])


def _assert_safe_for_llm(payload: str) -> None:
    """Block likely direct identifiers before any LLM call."""
    unsafe_patterns = {
        "email": EMAIL_RE,
        "phone": PHONE_RE,
        "url": URL_RE,
        "gps": GPS_RE,
        "national_id": ID_RE,
    }
    for label, pattern in unsafe_patterns.items():
        match = pattern.search(payload)
        if match:
            logger.error("blocked data-quality LLM call: %s pattern detected", label)
            raise ValueError(
                f"Unsafe LLM payload blocked: likely raw {label} value detected. "
                "Only anonymized context may be sent to the model."
            )
