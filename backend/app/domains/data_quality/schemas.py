"""Schemas for the Data Quality Agent.

The API response keeps the original high-level ``issues`` field for compatibility
and adds per-upload artifacts produced by the data-quality pipeline.
"""

from typing import Literal

from app.shared.schemas import AppBaseModel, QualityIssue

Severity = Literal["high", "medium", "low"]


class Bilingual(AppBaseModel):
    fr: str = ""
    en: str = ""


class UploadedFileInfo(AppBaseModel):
    """Optional uploaded-file metadata supplied by an orchestration layer."""

    id: str = ""
    original_filename: str = ""
    storage_path: str = ""
    local_path: str = ""
    mime_type: str = ""


class DataQualityRequest(AppBaseModel):
    """Explicit file list for a project review.

    If omitted, the service scans ``data/projects/{project_id}``.
    """

    files: list[UploadedFileInfo] = []


class ColumnMissingness(AppBaseModel):
    column: str
    missing_count: int
    missing_percent: float


class DatasetProfile(AppBaseModel):
    row_count: int
    column_count: int
    data_types: dict[str, str]
    missingness: list[ColumnMissingness]
    unique_counts: dict[str, int]
    likely_identifier_columns: list[str]
    likely_date_columns: list[str]
    likely_categorical_columns: list[str]
    likely_numeric_columns: list[str]
    likely_free_text_columns: list[str]


class AnonymizationSummary(AppBaseModel):
    sensitive_columns_detected: list[str]
    anonymized_fields: list[str]
    safe_sample_rows: list[dict[str, str | int | float | bool | None]] = []


class ValidationIssue(AppBaseModel):
    dataset_id: str
    sheet_name: str = ""
    row_index: int | None = None
    column_name: str = ""
    issue_type: str
    severity: Severity
    safe_value: str = ""
    explanation: str
    suggested_review_step: str


class DataQualityFileResult(AppBaseModel):
    original_filename: str
    dataset_id: str
    detected_file_type: str
    sheet_names: list[str]
    row_count: int
    column_count: int
    column_names: list[str]
    inferred_datatypes: dict[str, str]
    missingness_summary: list[ColumnMissingness]
    profile: DatasetProfile
    anonymization: AnonymizationSummary
    issues: list[ValidationIssue] = []
    issue_count: int
    highest_severity: Severity | Literal["none"] = "none"
    cleaned_csv_path: str = ""
    markdown_summary_path: str = ""
    agent_summary: str = ""


class DataQualityAgentInterpretation(AppBaseModel):
    """LLM output over sanitized metadata, profiles and validation summaries."""

    summary: Bilingual
    priority_recommendations: list[Bilingual] = []
    agent_notes: list[Bilingual] = []


class DataQualityReport(AppBaseModel):
    """Result of reviewing a project's data exports."""

    project_id: str
    issues: list[QualityIssue] = []
    checked_rows: int = 0
    files: list[DataQualityFileResult] = []
    generated_by: str = ""
    agent_summary: str = ""
