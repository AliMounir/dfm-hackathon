"""Insight generation, situation explanation & impact storytelling (function 3).

Turns selected M&E indicators / health data into concise summaries,
visualisation suggestions and impact stories for different audiences (team,
donor, partner, research) — WHO-aligned and French-first.
"""

from app.domains.insights.schemas import InsightReport, StoryRequest, StoryResponse


class InsightsService:
    async def report(self, project_id: str) -> InsightReport:
        """Build the insight report for a project.

        TODO(DfM): derive headline metrics, interpretation insights, and
        visualisation suggestions from the project's data (optionally
        LLM-assisted via ``app.core.llm``).
        """
        return InsightReport(project_id=project_id)

    async def generate_story(self, request: StoryRequest) -> StoryResponse:
        """Generate an audience-tailored impact story / situation explanation.

        TODO(DfM): compose a clear, context-aware, WHO-compliant explanation of
        what changed, where attention is needed, and what story the data tells.
        """
        return StoryResponse(project_id=request.project_id, audience=request.audience, story={})
