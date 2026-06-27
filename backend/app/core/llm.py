"""LLM access for the assistant.

Provider-agnostic thin wrapper. Anthropic Claude is the default; swap providers
via ``LLM_PROVIDER`` / ``LLM_MODEL`` env vars without touching call sites.

TODO(DfM): wire this to LangChain's ``init_chat_model`` (or the Anthropic SDK).
Kept as a lazy placeholder so the app imports and runs without the LLM deps
installed yet. Install ``langchain`` + ``langchain-anthropic`` and implement
``get_chat_model`` when building the chat / data-quality / insight features.
"""

from app.core.config import get_settings


def get_chat_model(**overrides: object) -> object:
    """Return a configured chat model. Not implemented yet.

    Example wiring once deps are added::

        from langchain.chat_models import init_chat_model
        s = get_settings()
        return init_chat_model(s.llm_model, model_provider=s.llm_provider, **overrides)
    """
    settings = get_settings()
    raise NotImplementedError(
        "TODO(DfM): wire the LLM. Configured provider="
        f"{settings.llm_provider!r} model={settings.llm_model!r}."
    )
