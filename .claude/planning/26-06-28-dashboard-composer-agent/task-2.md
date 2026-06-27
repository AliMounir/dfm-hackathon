# Task 2: Wire the OpenAI key + validate/tune the agent

**Status**: Not Started
**Last Updated**: 26-06-28

## Goal
Make the live agent produce good plans and confirm parity with the renderer.

## Checklist
- [ ] Add `OPENAI_API_KEY` to `backend/.env`
- [ ] `pip install -e .` (or `uv sync`) to install langchain/langgraph/langchain-openai
- [ ] Hit `GET /api/projects/mchp/dashboard`; confirm `generated_by` = `openai:...`
- [ ] Verify the agent only emits widget types present in the catalog
- [ ] Tune `SYSTEM_PROMPT` ranking rules (quality-first when high severity; seasonal_risk on dips)
- [ ] Confirm `config.highlight_month` flows to the `seasonal_risk` widget
- [ ] Optional: enable LangSmith tracing (`LANGSMITH_TRACING`)

## Acceptance
- [ ] Opening `/projects/mchp` shows an agent-composed dashboard with rationales
- [ ] Every widget renders without errors; empty data no-ops gracefully
