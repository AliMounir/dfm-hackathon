"""LLM access for the agent.

Provider-configurable; OpenAI by default. The actual LangChain import is lazy so
the app imports and runs even before the agent deps are installed. Set
``OPENAI_API_KEY`` (and optionally ``LLM_MODEL``) in ``backend/.env``.
"""

from typing import Any

from app.core.config import get_settings


def get_chat_model(**overrides: Any) -> Any:
    """Return a configured LangChain chat model (OpenAI by default).

    Raises a clear error if the provider has no API key, or if the LangChain
    provider package isn't installed yet.
    """
    settings = get_settings()
    if not settings.llm_configured:
        raise RuntimeError(
            f"No API key for LLM_PROVIDER={settings.llm_provider!r}. "
            "Set OPENAI_API_KEY in backend/.env."
        )

    if settings.llm_provider == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "langchain-openai is not installed. Run `pip install -e .` "
                "(or `uv sync`) in backend/."
            ) from exc
        params: dict[str, Any] = {
            "model": settings.llm_model,
            "api_key": settings.openai_api_key,
            "temperature": 0,
        }
        params.update(overrides)
        return ChatOpenAI(**params)

    raise NotImplementedError(
        f"Provider {settings.llm_provider!r} is not wired yet (only 'openai')."
    )
