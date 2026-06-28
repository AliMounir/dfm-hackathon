"""Data-quality service.

Runs one file-level Data Quality Agent pipeline:
ingest -> anonymize -> profile -> validate -> export CSV -> write Markdown ->
optional privacy-guarded LLM interpretation.
"""

from __future__ import annotations

import logging
from collections import Counter
from typing import Any

from app.core.config import get_settings
from app.domains.data_quality.models import DatasetRun
from app.domains.data_quality.schemas import (
    AnonymizationSummary,
    ColumnMissingness,
    DataQualityFileResult,
    DataQualityReport,
    DataQualityRequest,
    DatasetProfile,
    UploadedFileInfo,
    ValidationIssue,
)
from app.domains.data_quality.tools import (
    anonymize_dataset,
    check_data_quality,
    dataset_metadata,
    export_clean_csv,
    ingest_project_files,
    profile_dataset,
    safe_llm_context,
    write_markdown_summary,
)
from app.shared.schemas import QualityIssue

logger = logging.getLogger(__name__)

SEVERITY_RANK = {"none": 0, "low": 1, "medium": 2, "high": 3}


class DataQualityService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._used_llm = False

    async def review(
        self,
        project_id: str,
        files: list[UploadedFileInfo] | None = None,
    ) -> DataQualityReport:
        """Run quality checks on project exports or an explicit uploaded-file list."""
        file_dicts = [file.model_dump() for file in files or []]
        self._used_llm = False
        runs = ingest_project_files(project_id, file_dicts)
        if not runs:
            return DataQualityReport(
                project_id=project_id,
                issues=[],
                checked_rows=0,
                files=[],
                generated_by="no-data",
                agent_summary="No supported CSV, TSV, XLS or XLSX files were found.",
            )

        for run in runs:
            anonymize_dataset(run)
            profile_dataset(run)
            check_data_quality(run)
            export_clean_csv(run)

        interpretation_by_dataset = self._interpret(project_id, runs)

        file_results: list[DataQualityFileResult] = []
        for run in runs:
            notes = interpretation_by_dataset.get(run.dataset_id, [])
            run.agent_summary = notes[0] if notes else _fallback_agent_summary(run)
            write_markdown_summary(run, notes)
            file_results.append(_file_result(run))

        all_issues = [issue for run in runs for issue in run.issues]
        checked_rows = sum(int((run.profile or {}).get("row_count", 0)) for run in runs)
        return DataQualityReport(
            project_id=project_id,
            issues=_legacy_issue_cards(all_issues),
            checked_rows=checked_rows,
            files=file_results,
            generated_by=self._generated_by(runs),
            agent_summary=_project_summary(file_results),
        )

    async def review_request(self, project_id: str, request: DataQualityRequest) -> DataQualityReport:
        """Review files supplied by an upload/orchestration workflow."""
        return await self.review(project_id, request.files)

    def _interpret(self, project_id: str, runs: list[DatasetRun]) -> dict[str, list[str]]:
        if not self._settings.llm_configured:
            return {run.dataset_id: [_fallback_agent_summary(run)] for run in runs}

        try:
            from app.domains.data_quality.agent import interpret_quality_context

            context = {"datasets": [safe_llm_context(run) for run in runs]}
            interpretation = interpret_quality_context(project_id, context)
            summary = interpretation.summary.fr or interpretation.summary.en
            recommendations = [
                item.fr or item.en for item in interpretation.priority_recommendations if item.fr or item.en
            ]
            notes = [item.fr or item.en for item in interpretation.agent_notes if item.fr or item.en]
            combined = [text for text in [summary, *recommendations, *notes] if text]
            self._used_llm = True
            return {run.dataset_id: combined or [_fallback_agent_summary(run)] for run in runs}
        except Exception:
            logger.exception("data-quality agent failed; using deterministic notes")
            return {run.dataset_id: [_fallback_agent_summary(run)] for run in runs}

    def _generated_by(self, runs: list[DatasetRun]) -> str:
        if self._used_llm and all(run.agent_summary for run in runs):
            return f"openai:{self._settings.llm_model}"
        return "deterministic-data-quality-pipeline"


def _file_result(run: DatasetRun) -> DataQualityFileResult:
    metadata = dataset_metadata(run)
    profile = DatasetProfile(**run.profile)
    anonymization = AnonymizationSummary(
        sensitive_columns_detected=sorted(run.sensitive_columns),
        anonymized_fields=sorted(run.sensitive_columns),
        safe_sample_rows=safe_llm_context(run)["anonymization"]["safe_sample_rows"],
    )
    issues = [ValidationIssue(**issue) for issue in run.issues]
    return DataQualityFileResult(
        original_filename=run.original_filename,
        dataset_id=run.dataset_id,
        detected_file_type=run.detected_file_type,
        sheet_names=metadata["sheet_names"],
        row_count=metadata["row_count"],
        column_count=metadata["column_count"],
        column_names=metadata["column_names"],
        inferred_datatypes=metadata["inferred_datatypes"],
        missingness_summary=[ColumnMissingness(**row) for row in metadata["missingness_summary"]],
        profile=profile,
        anonymization=anonymization,
        issues=issues,
        issue_count=len(run.issues),
        highest_severity=_highest_severity(run.issues),
        cleaned_csv_path=str(run.cleaned_csv_path or ""),
        markdown_summary_path=str(run.markdown_summary_path or ""),
        agent_summary=run.agent_summary,
    )


def _highest_severity(issues: list[dict[str, Any]]) -> str:
    highest = "none"
    for issue in issues:
        severity = str(issue.get("severity", "low"))
        if SEVERITY_RANK.get(severity, 0) > SEVERITY_RANK[highest]:
            highest = severity
    return highest


def _fallback_agent_summary(run: DatasetRun) -> str:
    severity = _highest_severity(run.issues)
    sensitive = len(run.sensitive_columns)
    rows = int((run.profile or {}).get("row_count", 0))
    if not run.issues:
        return (
            f"Deterministic checks reviewed {rows} row(s). No validation issues were "
            f"detected; {sensitive} sensitive field(s) were protected before analysis."
        )
    return (
        f"Deterministic checks reviewed {rows} row(s), found {len(run.issues)} issue(s), "
        f"and flagged highest severity as {severity}. {sensitive} sensitive field(s) "
        "were protected before analysis."
    )


def _legacy_issue_cards(issues: list[dict[str, Any]]) -> list[QualityIssue]:
    grouped = Counter((issue["issue_type"], issue["severity"]) for issue in issues)
    cards: list[QualityIssue] = []
    for index, ((issue_type, severity), count) in enumerate(grouped.most_common(8), start=1):
        label = issue_type.replace("_", " ")
        cards.append(
            QualityIssue(
                id=f"dq-{index}-{issue_type}",
                severity=severity,
                title={"fr": label, "en": label},
                count=count,
                why_it_matters={
                    "fr": _why_it_matters(issue_type),
                    "en": _why_it_matters(issue_type),
                },
                action={
                    "fr": _action(issue_type),
                    "en": _action(issue_type),
                },
            )
        )
    return cards


def _why_it_matters(issue_type: str) -> str:
    if "duplicate" in issue_type:
        return "Duplicates can overstate activity counts or merge separate patient events."
    if "date" in issue_type:
        return "Date problems can distort timelines, delays, and monthly reporting."
    if "empty" in issue_type or "missing" in issue_type:
        return "Missing data reduces confidence and may hide reporting gaps."
    if "out_of_range" in issue_type or "outlier" in issue_type:
        return "Implausible numeric values can bias indicators and downstream analysis."
    if "encoding" in issue_type or "whitespace" in issue_type or "category" in issue_type:
        return "Text inconsistencies can split categories that should be counted together."
    return "This issue can reduce confidence in the dataset before analysis."


def _action(issue_type: str) -> str:
    if "duplicate" in issue_type:
        return "Compare duplicate records in the source before deduplication."
    if "date" in issue_type:
        return "Correct source dates and standardize date formats before analysis."
    if "empty" in issue_type or "missing" in issue_type:
        return "Confirm whether missingness is expected or indicates incomplete reporting."
    if "out_of_range" in issue_type or "outlier" in issue_type:
        return "Validate source values and units with the field team."
    if "encoding" in issue_type or "whitespace" in issue_type or "category" in issue_type:
        return "Harmonize values after confirming the intended category labels."
    return "Review the flagged records and document any correction."


def _project_summary(files: list[DataQualityFileResult]) -> str:
    total_issues = sum(file.issue_count for file in files)
    highest = "none"
    for file in files:
        if SEVERITY_RANK.get(file.highest_severity, 0) > SEVERITY_RANK[highest]:
            highest = file.highest_severity
    return f"Reviewed {len(files)} file(s), found {total_issues} issue(s), highest severity: {highest}."
