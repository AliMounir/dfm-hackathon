"""Data-quality service (function 1).

Reviews structured M&E exports (REDCap, Excel, DHIS2 extracts) and detects
inconsistencies, missing values, implausible entries and reporting errors —
then explains, in French, why each issue matters and how to correct it.
"""

from app.domains.data_quality.schemas import DataQualityReport


class DataQualityService:
    async def review(self, project_id: str) -> DataQualityReport:
        """Run quality checks on the project's latest export.

        TODO(DfM): load the export, run the checks (missing required fields,
        implausible values, duplicate / inconsistent identifiers, late
        reporting, facility-name harmonisation, …) and build localized
        explanations (optionally LLM-assisted via ``app.core.llm``).
        """
        return DataQualityReport(project_id=project_id, issues=[], checked_rows=0)
