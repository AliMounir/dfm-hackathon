"""Chat service — the conversational M&E assistant.

Project coordinators ask questions in French and get clear, context-aware,
WHO-compliant explanations of the current situation in a facility / project
area: what changed, where attention is needed, and what story the data tells.
"""

from app.domains.chat.schemas import ChatRequest, ChatResponse


class ChatService:
    async def ask(self, request: ChatRequest) -> ChatResponse:
        """Answer a coordinator's question about a project.

        TODO(DfM): load the project's M&E context (indicators, quality issues,
        trends) and call the LLM (``app.core.llm.get_chat_model``) with a
        French-first, WHO-aligned system prompt. Stream the reply for the UI.
        """
        return ChatResponse(
            message=(
                "TODO(DfM): l'assistant n'est pas encore connecté au modèle. "
                "Cette réponse est un espace réservé."
            ),
            language=request.language,
        )
