"""Data-quality schemas (function 1)."""

from app.shared.schemas import AppBaseModel, QualityIssue


class DataQualityReport(AppBaseModel):
    """Result of reviewing a project's data export.

    Issues carry French-first explanations of *why it matters* and the
    recommended *action* (see :class:`app.shared.schemas.QualityIssue`).
    """

    project_id: str
    issues: list[QualityIssue] = []
    checked_rows: int = 0
