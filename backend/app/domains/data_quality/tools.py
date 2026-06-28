"""Tools for the Data Quality Agent.

The service calls the Python functions directly so raw pandas frames never pass
through the LLM. The ``@tool`` wrappers expose the same operations for future
agent orchestration while returning only JSON-safe, anonymized summaries.
"""

from __future__ import annotations

import hashlib
import re
import warnings
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from langchain_core.tools import tool
except ImportError:  # pragma: no cover - keeps deterministic pipeline importable without agent deps.
    def tool(fn):
        return fn

from app.core.config import get_settings
from app.domains.data_quality.models import DatasetRun, JsonScalar, SheetData

NULL_MARKERS = {
    "",
    "---",
    "--",
    "-",
    "nan",
    "none",
    "null",
    "n/a",
    "na",
    ".",
    ",",
}

SUPPORTED_SUFFIXES = {".csv", ".tsv", ".xlsx", ".xls"}
TECHNICAL_COLUMNS = {"source_sheet", "source_row_number"}
MAX_DETAILED_ISSUES = 500

SENSITIVE_COLUMN_PATTERNS = (
    "name",
    "nom",
    "prenom",
    "prénom",
    "phone",
    "telephone",
    "téléphone",
    "tel",
    "email",
    "mail",
    "address",
    "adresse",
    "cin",
    "passport",
    "passeport",
    "national_id",
    "barcode",
    "code_barre",
    "photo",
    "form_link",
    "link",
    "patient_id",
    "case_id",
    "gps",
    "latitude",
    "longitude",
    "coord",
)

IDENTIFIER_KEEP_PATTERNS = ("formid", "uid", "uuid", "record_id", "source_row_number")

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\s().-]*){8,}(?!\d)")
URL_RE = re.compile(r"\b(?:https?://|www\.)\S+", re.IGNORECASE)
GPS_RE = re.compile(r"(?<!\d)-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}(?!\d)")
NATIONAL_ID_RE = re.compile(r"\b(?:cin|passport|passeport|id)\s*[:#-]?\s*[A-Z0-9-]{5,}\b", re.IGNORECASE)
BARCODE_RE = re.compile(r"\b\d{10,}\b")
CONTROL_RE = re.compile(r"[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]")

YES_NO_MAP = {
    "oui": "yes",
    "yes": "yes",
    "y": "yes",
    "o": "yes",
    "vrai": "yes",
    "true": "yes",
    "non": "no",
    "no": "no",
    "n": "no",
    "faux": "no",
    "false": "no",
}

NUMERIC_RULES = (
    ("age", 0, 120, "age_out_of_range"),
    ("imc", 8, 80, "bmi_out_of_range"),
    ("bmi", 8, 80, "bmi_out_of_range"),
    ("poids", 1, 250, "weight_out_of_range"),
    ("weight", 1, 250, "weight_out_of_range"),
    ("taille", 0.3, 2.5, "height_out_of_range"),
    ("height", 0.3, 2.5, "height_out_of_range"),
    ("distance", 0, 300, "distance_out_of_range"),
    ("duree", 0, 72, "duration_out_of_range"),
    ("duration", 0, 72, "duration_out_of_range"),
    ("montant", 0, 100_000_000, "amount_out_of_range"),
    ("amount", 0, 100_000_000, "amount_out_of_range"),
    ("score", 0, 100, "score_out_of_range"),
    ("total", 0, 1_000_000, "total_out_of_range"),
    ("nombre", 0, 1_000_000, "count_out_of_range"),
    ("count", 0, 1_000_000, "count_out_of_range"),
)

_RUN_CACHE: dict[str, DatasetRun] = {}

warnings.filterwarnings("ignore", message="Could not infer format", category=UserWarning)


def ingest_project_files(project_id: str, files: list[dict[str, Any]] | None = None) -> list[DatasetRun]:
    """Read project CSV/TSV/XLS/XLSX files and return in-memory dataset runs."""
    paths = _resolve_file_paths(project_id, files or [])
    runs: list[DatasetRun] = []
    for path in paths:
        sheets = _read_file(path)
        if not sheets:
            continue
        dataset_id = _dataset_id(project_id, path)
        output_dir = _output_dir(project_id, dataset_id)
        run = DatasetRun(
            dataset_id=dataset_id,
            project_id=project_id,
            source_path=path,
            original_filename=path.name,
            detected_file_type=_file_type(path),
            sheets=sheets,
            output_dir=output_dir,
        )
        _RUN_CACHE[dataset_id] = run
        runs.append(run)
    return runs


def anonymize_dataset(run: DatasetRun) -> dict[str, Any]:
    """Detect likely identifiers and create safe copies/samples for LLM context."""
    sensitive: set[str] = set()
    for sheet in run.sheets:
        sheet_sensitive = {
            col for col in sheet.normalized.columns if _is_sensitive_column(col, sheet.normalized[col])
        }
        sensitive.update(sheet_sensitive)
        safe = sheet.normalized.copy()
        for col in sheet_sensitive:
            safe[col] = safe[col].map(lambda value: _mask_value(value, col))
        sheet.safe = safe
    run.sensitive_columns = sensitive
    return {
        "dataset_id": run.dataset_id,
        "sensitive_columns_detected": sorted(sensitive),
        "anonymized_fields": sorted(sensitive),
        "safe_sample_rows": _safe_samples(run),
    }


def profile_dataset(run: DatasetRun) -> dict[str, Any]:
    """Build a schema/data profile from normalized data and safe samples only."""
    combined = _combined_frame(run, safe=True)
    if combined.empty:
        profile = _empty_profile()
    else:
        data_cols = [c for c in combined.columns if c not in TECHNICAL_COLUMNS]
        profile = {
            "row_count": int(len(combined)),
            "column_count": int(len(data_cols)),
            "data_types": {c: _dtype_name(combined[c]) for c in data_cols},
            "missingness": [
                {
                    "column": c,
                    "missing_count": int(combined[c].isna().sum()),
                    "missing_percent": round(float(combined[c].isna().mean() * 100), 2),
                }
                for c in data_cols
            ],
            "unique_counts": {c: int(combined[c].nunique(dropna=True)) for c in data_cols},
            "likely_identifier_columns": [c for c in data_cols if _is_identifier_column(c, combined[c])],
            "likely_date_columns": [c for c in data_cols if _is_date_column(c, combined[c])],
            "likely_categorical_columns": [
                c for c in data_cols if _is_categorical_column(c, combined[c])
            ],
            "likely_numeric_columns": [c for c in data_cols if _numeric_ratio(combined[c]) >= 0.8],
            "likely_free_text_columns": [c for c in data_cols if _is_free_text_column(combined[c])],
        }
    run.profile = profile
    return profile


def check_data_quality(run: DatasetRun) -> list[dict[str, Any]]:
    """Run deterministic data-quality checks without modifying raw data."""
    issues: list[dict[str, Any]] = []
    for sheet in run.sheets:
        df = sheet.normalized
        if df.empty:
            continue
        _check_missingness(run, sheet, df, issues)
        _check_duplicate_rows(run, sheet, df, issues)
        _check_duplicate_ids(run, sheet, df, issues)
        _check_dates(run, sheet, df, issues)
        _check_numeric_values(run, sheet, df, issues)
        _check_mixed_types(run, sheet, df, issues)
        _check_text_quality(run, sheet, df, issues)
        _check_unexpected_categories(run, sheet, df, issues)
    run.issues = issues[:MAX_DETAILED_ISSUES]
    return run.issues


def export_clean_csv(run: DatasetRun) -> dict[str, str]:
    """Write a public cleaned CSV and a private identifier split, if needed."""
    run.output_dir.mkdir(parents=True, exist_ok=True)
    public_parts: list[pd.DataFrame] = []
    private_parts: list[pd.DataFrame] = []
    actions: set[str] = set()

    for sheet in run.sheets:
        cleaned = _clean_frame(sheet.normalized, run.sensitive_columns, actions)
        cleaned.insert(0, "source_sheet", sheet.name)
        cleaned.insert(1, "source_row_number", range(2, len(cleaned) + 2))
        sheet.cleaned = cleaned

        private_cols = [c for c in cleaned.columns if c in run.sensitive_columns]
        if private_cols:
            private_parts.append(cleaned[["source_sheet", "source_row_number", *private_cols]].copy())
        public = cleaned.drop(columns=private_cols, errors="ignore")
        public_parts.append(public)

    public_df = pd.concat(public_parts, ignore_index=True) if public_parts else pd.DataFrame()
    private_df = pd.concat(private_parts, ignore_index=True) if private_parts else pd.DataFrame()

    cleaned_path = run.output_dir / f"{run.dataset_id}_cleaned.csv"
    private_path = run.output_dir / f"{run.dataset_id}_private_identifiers.csv"
    public_df.to_csv(cleaned_path, index=False)
    if not private_df.empty:
        private_df.to_csv(private_path, index=False)
        run.private_csv_path = private_path
        actions.add("separated_sensitive_identifier_columns")

    run.cleaned_csv_path = cleaned_path
    run.cleaning_actions = sorted(actions)
    return {
        "cleaned_csv_path": str(cleaned_path),
        "private_identifier_csv_path": str(private_path if run.private_csv_path else ""),
    }


def write_markdown_summary(run: DatasetRun, agent_notes: list[str] | None = None) -> str:
    """Write an auditable Markdown summary beside the generated CSV."""
    run.output_dir.mkdir(parents=True, exist_ok=True)
    path = run.output_dir / f"{run.dataset_id}_summary.md"
    issue_counts = Counter(issue["severity"] for issue in run.issues)
    issue_types = Counter(issue["issue_type"] for issue in run.issues)
    high_priority = [i for i in run.issues if i["severity"] == "high"][:10]
    profile = run.profile or _empty_profile()
    notes = agent_notes or []

    lines = [
        f"# Data Quality Summary: {run.original_filename}",
        "",
        f"- Timestamp: {datetime.now(UTC).isoformat()}",
        f"- Original filename: {run.original_filename}",
        f"- Detected file type: {run.detected_file_type}",
        f"- Dataset id: {run.dataset_id}",
        f"- Sheet names: {', '.join(_sheet_names(run)) or 'n/a'}",
        f"- Row count: {profile['row_count']}",
        f"- Column count: {profile['column_count']}",
        "",
        "## Schema / Profile Summary",
        "",
        f"- Likely identifier columns: {', '.join(profile['likely_identifier_columns']) or 'none'}",
        f"- Likely date columns: {', '.join(profile['likely_date_columns']) or 'none'}",
        f"- Likely categorical columns: {', '.join(profile['likely_categorical_columns']) or 'none'}",
        f"- Likely numeric columns: {', '.join(profile['likely_numeric_columns']) or 'none'}",
        f"- Likely free-text columns: {', '.join(profile['likely_free_text_columns']) or 'none'}",
        "",
        "## Anonymization Summary",
        "",
        f"- Sensitive columns detected: {', '.join(sorted(run.sensitive_columns)) or 'none'}",
        f"- Anonymized fields: {', '.join(sorted(run.sensitive_columns)) or 'none'}",
        "",
        "## Data Quality Summary",
        "",
        f"- Issue count: {len(run.issues)}",
        f"- Severity distribution: high={issue_counts['high']}, medium={issue_counts['medium']}, low={issue_counts['low']}",
        f"- Issue types: {', '.join(f'{k}={v}' for k, v in issue_types.most_common()) or 'none'}",
        "",
        "## High-Priority Issues",
        "",
    ]
    if high_priority:
        for issue in high_priority:
            row = f"row {issue['row_index']}" if issue.get("row_index") is not None else "dataset"
            lines.append(
                f"- {issue['issue_type']} in `{issue.get('column_name', '')}` ({row}): "
                f"{issue['explanation']}"
            )
    else:
        lines.append("- None detected.")

    lines.extend(
        [
            "",
            "## Cleaning Actions",
            "",
            *(f"- {action}" for action in run.cleaning_actions),
        ]
        if run.cleaning_actions
        else ["", "## Cleaning Actions", "", "- None."]
    )
    lines.extend(
        [
            "",
            "## Outputs",
            "",
            f"- Cleaned CSV path: {run.cleaned_csv_path or ''}",
            f"- Private identifier CSV path: {run.private_csv_path or ''}",
            "",
            "## Agent Notes",
            "",
        ]
    )
    lines.extend([f"- {note}" for note in notes] or ["- Deterministic checks completed."])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    run.markdown_summary_path = path
    return str(path)


def dataset_metadata(run: DatasetRun) -> dict[str, Any]:
    """Return JSON-safe ingestion metadata."""
    combined = _combined_frame(run, safe=True)
    data_cols = [c for c in combined.columns if c not in TECHNICAL_COLUMNS]
    return {
        "dataset_id": run.dataset_id,
        "original_filename": run.original_filename,
        "detected_file_type": run.detected_file_type,
        "sheet_names": _sheet_names(run),
        "row_count": int(len(combined)),
        "column_count": int(len(data_cols)),
        "column_names": data_cols,
        "inferred_datatypes": {c: _dtype_name(combined[c]) for c in data_cols},
        "missingness_summary": (run.profile or profile_dataset(run))["missingness"],
    }


def safe_llm_context(run: DatasetRun) -> dict[str, Any]:
    """Build the only payload allowed to reach the LLM."""
    severities = Counter(issue["severity"] for issue in run.issues)
    issue_types = Counter(issue["issue_type"] for issue in run.issues)
    return {
        "dataset_id": run.dataset_id,
        "detected_file_type": run.detected_file_type,
        "sheet_count": len(run.sheets),
        "sheet_names": _sheet_names(run),
        "profile": run.profile,
        "anonymization": {
            "sensitive_columns_detected": sorted(run.sensitive_columns),
            "anonymized_fields": sorted(run.sensitive_columns),
            "safe_sample_rows": _safe_samples(run),
        },
        "validation_summary": {
            "issue_count": len(run.issues),
            "severity_distribution": dict(severities),
            "issue_type_counts": dict(issue_types),
            "high_priority_issues": [i for i in run.issues if i["severity"] == "high"][:20],
        },
    }


@tool
def ingest_uploaded_files(project_id: str, files: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Read uploaded CSV, TSV and Excel files for a project and return metadata."""
    return [dataset_metadata(run) for run in ingest_project_files(project_id, files)]


@tool
def anonymize_dataset_content(dataset_id: str) -> dict[str, Any]:
    """Detect sensitive fields and return anonymized sample rows for a dataset."""
    run = _RUN_CACHE[dataset_id]
    return anonymize_dataset(run)


@tool
def profile_dataset_content(dataset_id: str) -> dict[str, Any]:
    """Return row counts, datatypes, missingness and likely field categories."""
    run = _RUN_CACHE[dataset_id]
    if not run.sensitive_columns:
        anonymize_dataset(run)
    return profile_dataset(run)


@tool
def run_data_quality_checks(dataset_id: str) -> list[dict[str, Any]]:
    """Run deterministic validation checks and return masked issue details."""
    run = _RUN_CACHE[dataset_id]
    if not run.sensitive_columns:
        anonymize_dataset(run)
    return check_data_quality(run)


@tool
def export_clean_dataset_csv(dataset_id: str) -> dict[str, str]:
    """Write cleaned public CSV output and private identifier split, if needed."""
    return export_clean_csv(_RUN_CACHE[dataset_id])


@tool
def create_markdown_summary(dataset_id: str, agent_notes: list[str] | None = None) -> str:
    """Write the per-upload Markdown data-quality summary."""
    return write_markdown_summary(_RUN_CACHE[dataset_id], agent_notes)


AGENT_TOOLS = [
    ingest_uploaded_files,
    anonymize_dataset_content,
    profile_dataset_content,
    run_data_quality_checks,
    export_clean_dataset_csv,
    create_markdown_summary,
]


def _resolve_file_paths(project_id: str, files: list[dict[str, Any]]) -> list[Path]:
    settings = get_settings()
    projects_root = (settings.data_dir / "projects").resolve()
    project_dir = (projects_root / project_id).resolve()
    candidates: list[Path] = []

    if files:
        for file_info in files:
            raw_path = file_info.get("local_path") or file_info.get("storage_path") or ""
            if not raw_path:
                continue
            path = Path(raw_path)
            if not path.is_absolute():
                path = projects_root.parent.parent / path
            resolved = path.resolve()
            if _is_allowed_path(resolved, projects_root) and resolved.suffix.lower() in SUPPORTED_SUFFIXES:
                candidates.append(resolved)
    elif project_dir.exists():
        candidates.extend(
            sorted(path for path in project_dir.iterdir() if path.suffix.lower() in SUPPORTED_SUFFIXES)
        )

    return list(dict.fromkeys(candidates))


def _is_allowed_path(path: Path, projects_root: Path) -> bool:
    try:
        path.relative_to(projects_root)
    except ValueError:
        return False
    return path.is_file()


def _read_file(path: Path) -> list[SheetData]:
    suffix = path.suffix.lower()
    if suffix == ".xlsx" or suffix == ".xls":
        frames = pd.read_excel(path, sheet_name=None, engine="openpyxl")
    elif suffix == ".tsv":
        frames = {"tsv": pd.read_csv(path, sep="\t")}
    elif suffix == ".csv":
        frames = {"csv": pd.read_csv(path)}
    else:
        return []

    sheets: list[SheetData] = []
    for sheet_name, raw_df in frames.items():
        raw = raw_df.copy()
        raw.columns = _dedupe_columns([_flatten_column(col) for col in raw.columns])
        normalized = raw.copy()
        normalized.columns = _dedupe_columns([_normalize_column(col) for col in normalized.columns])
        normalized = normalized.map(_normalize_nulls)
        normalized = normalized.convert_dtypes()
        sheets.append(SheetData(name=str(sheet_name), raw=raw, normalized=normalized))
    return sheets


def _dataset_id(project_id: str, path: Path) -> str:
    digest = hashlib.sha256(f"{project_id}|{path.name}|{path.stat().st_size}".encode()).hexdigest()[:12]
    return f"dq_{digest}"


def _output_dir(project_id: str, dataset_id: str) -> Path:
    return get_settings().data_dir / "projects" / project_id / "data_quality_outputs" / dataset_id


def _file_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return "xlsx"
    if suffix == ".tsv":
        return "tsv"
    if suffix == ".csv":
        return "csv"
    return suffix.lstrip(".") or "unknown"


def _flatten_column(col: Any) -> str:
    if isinstance(col, tuple):
        parts = [
            str(part).strip()
            for part in col
            if str(part).strip() and not str(part).startswith("Unnamed")
        ]
        return " / ".join(dict.fromkeys(parts)) or "col"
    return str(col).strip() or "col"


def _normalize_column(name: Any) -> str:
    text = str(name).strip().replace("@", "")
    text = re.sub(r"[^0-9A-Za-z]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_").lower()
    return text or "unnamed"


def _dedupe_columns(columns: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    out: list[str] = []
    for col in columns:
        if col in seen:
            seen[col] += 1
            out.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            out.append(col)
    return out


def _normalize_nulls(value: Any) -> Any:
    if pd.isna(value):
        return pd.NA
    if isinstance(value, str):
        text = value.strip()
        if text.lower() in NULL_MARKERS:
            return pd.NA
        return text
    return value


def _combined_frame(run: DatasetRun, safe: bool = False) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for sheet in run.sheets:
        source = sheet.safe if safe and sheet.safe is not None else sheet.normalized
        df = source.copy()
        df.insert(0, "source_sheet", sheet.name)
        df.insert(1, "source_row_number", range(2, len(df) + 2))
        frames.append(df)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def _sheet_names(run: DatasetRun) -> list[str]:
    return [sheet.name for sheet in run.sheets]


def _empty_profile() -> dict[str, Any]:
    return {
        "row_count": 0,
        "column_count": 0,
        "data_types": {},
        "missingness": [],
        "unique_counts": {},
        "likely_identifier_columns": [],
        "likely_date_columns": [],
        "likely_categorical_columns": [],
        "likely_numeric_columns": [],
        "likely_free_text_columns": [],
    }


def _dtype_name(series: pd.Series) -> str:
    if _numeric_ratio(series) >= 0.8:
        return "numeric"
    if _is_date_column(series.name, series):
        return "date"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    return str(series.dtype)


def _is_sensitive_column(col: str, series: pd.Series) -> bool:
    lowered = col.lower()
    if any(keep in lowered for keep in IDENTIFIER_KEEP_PATTERNS):
        return False
    if any(pattern in lowered for pattern in SENSITIVE_COLUMN_PATTERNS):
        return True
    samples = _nonnull_strings(series, limit=50)
    if any(_contains_direct_identifier(sample) for sample in samples):
        return True
    if _is_free_text_column(series) and any(_contains_direct_identifier(sample) for sample in samples):
        return True
    return False


def _contains_direct_identifier(value: str) -> bool:
    return bool(
        EMAIL_RE.search(value)
        or PHONE_RE.search(value)
        or URL_RE.search(value)
        or GPS_RE.search(value)
        or NATIONAL_ID_RE.search(value)
        or BARCODE_RE.search(value)
    )


def _mask_value(value: Any, col: str) -> str | None:
    if pd.isna(value):
        return None
    digest = hashlib.sha256(f"{col}|{value}".encode("utf-8", errors="ignore")).hexdigest()[:6]
    return f"<MASKED:{_normalize_column(col)}:{digest}>"


def _safe_samples(run: DatasetRun) -> list[dict[str, JsonScalar]]:
    rows: list[dict[str, JsonScalar]] = []
    for sheet in run.sheets:
        safe = sheet.safe if sheet.safe is not None else sheet.normalized
        limited_cols = list(safe.columns[:20])
        for _, row in safe[limited_cols].head(3).iterrows():
            item: dict[str, JsonScalar] = {"source_sheet": sheet.name}
            for col, value in row.items():
                item[col] = _json_scalar(value)
            rows.append(item)
            if len(rows) >= 8:
                return rows
    return rows


def _json_scalar(value: Any) -> JsonScalar:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, (int, float, bool, str)):
        if isinstance(value, str):
            return value[:120]
        return value
    return str(value)[:120]


def _nonnull_strings(series: pd.Series, limit: int = 100) -> list[str]:
    out: list[str] = []
    for value in series.dropna().head(limit):
        text = str(value).strip()
        if text:
            out.append(text)
    return out


def _is_identifier_column(col: str, series: pd.Series) -> bool:
    lowered = col.lower()
    if any(token in lowered for token in ("id", "uuid", "uid", "code", "barcode", "case")):
        return True
    nonnull = int(series.notna().sum())
    return nonnull > 5 and int(series.nunique(dropna=True)) == nonnull


def _is_date_column(col: str, series: pd.Series) -> bool:
    lowered = str(col).lower()
    if any(token in lowered for token in ("date", "time", "heure", "jour", "received", "started", "completed")):
        return True
    values = series.dropna().head(100)
    if len(values) < 5:
        return False
    parsed = pd.to_datetime(values, errors="coerce")
    return bool(parsed.notna().mean() >= 0.8)


def _numeric_ratio(series: pd.Series) -> float:
    values = series.dropna()
    if values.empty:
        return 0.0
    return float(pd.to_numeric(values, errors="coerce").notna().mean())


def _is_categorical_column(col: str, series: pd.Series) -> bool:
    if _numeric_ratio(series) >= 0.8 or _is_identifier_column(col, series):
        return False
    nonnull = int(series.notna().sum())
    if nonnull == 0:
        return False
    unique = int(series.nunique(dropna=True))
    return 2 <= unique <= min(50, max(5, int(nonnull * 0.2)))


def _is_free_text_column(series: pd.Series) -> bool:
    samples = _nonnull_strings(series, limit=100)
    if len(samples) < 3:
        return False
    avg_len = sum(len(sample) for sample in samples) / len(samples)
    long_share = sum(1 for sample in samples if len(sample) > 50) / len(samples)
    return avg_len > 35 or long_share > 0.25


def _issue(
    run: DatasetRun,
    sheet: SheetData,
    issues: list[dict[str, Any]],
    issue_type: str,
    severity: str,
    explanation: str,
    suggested_review_step: str,
    column_name: str = "",
    row_index: int | None = None,
    value: Any = "",
) -> None:
    if len(issues) >= MAX_DETAILED_ISSUES:
        return
    safe_value = _mask_value(value, column_name) if column_name in run.sensitive_columns else _value_preview(value)
    issues.append(
        {
            "dataset_id": run.dataset_id,
            "sheet_name": sheet.name,
            "row_index": row_index,
            "column_name": column_name,
            "issue_type": issue_type,
            "severity": severity,
            "safe_value": safe_value,
            "explanation": explanation,
            "suggested_review_step": suggested_review_step,
        }
    )


def _value_preview(value: Any) -> str:
    if pd.isna(value):
        return ""
    text = str(value)
    text = EMAIL_RE.sub("<EMAIL>", text)
    text = PHONE_RE.sub("<PHONE>", text)
    text = URL_RE.sub("<URL>", text)
    text = GPS_RE.sub("<GPS>", text)
    text = NATIONAL_ID_RE.sub("<ID>", text)
    text = BARCODE_RE.sub("<LONG_NUMBER>", text)
    return text[:120]


def _check_missingness(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        missing = int(df[col].isna().sum())
        if missing == 0:
            continue
        percent = float(df[col].isna().mean() * 100)
        if percent == 100:
            _issue(
                run,
                sheet,
                issues,
                "empty_column",
                "high",
                f"Column is completely empty ({missing} missing values).",
                "Confirm whether this field should be collected or remove it from future forms after approval.",
                col,
            )
        elif percent >= 80:
            _issue(
                run,
                sheet,
                issues,
                "mostly_empty_column",
                "medium",
                f"Column is {percent:.1f}% missing.",
                "Check whether this field applies only to a subgroup or indicates incomplete reporting.",
                col,
            )
        elif percent >= 20:
            _issue(
                run,
                sheet,
                issues,
                "missing_values",
                "low",
                f"Column has {missing} missing values ({percent:.1f}%).",
                "Review form completeness and decide whether the missingness is expected.",
                col,
            )


def _check_duplicate_rows(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    duplicated = df.duplicated(keep=False)
    if duplicated.any():
        first_idx = int(df.index[duplicated][0]) + 2
        _issue(
            run,
            sheet,
            issues,
            "duplicate_rows",
            "medium",
            f"{int(duplicated.sum())} rows appear to be exact duplicates.",
            "Compare duplicated source records before deciding whether they are valid repeated events.",
            row_index=first_idx,
        )


def _check_duplicate_ids(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        if not _is_identifier_column(col, df[col]):
            continue
        dupes = df[col].dropna()
        dupes = dupes[dupes.duplicated(keep=False)]
        if dupes.empty:
            continue
        first_value = dupes.iloc[0]
        row_idx = int(df.index[df[col] == first_value][0]) + 2
        _issue(
            run,
            sheet,
            issues,
            "duplicate_id",
            "high",
            f"Identifier-like column has {int(dupes.size)} duplicated values.",
            "Verify whether duplicated IDs represent repeated visits, data entry duplication, or an identifier collision.",
            col,
            row_idx,
            first_value,
        )


def _check_dates(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    date_cols = [col for col in df.columns if _is_date_column(col, df[col])]
    parsed: dict[str, pd.Series] = {}
    for col in date_cols:
        values = df[col].dropna()
        if values.empty:
            continue
        parsed_col = pd.to_datetime(df[col], errors="coerce")
        parsed[col] = parsed_col
        invalid = df[col].notna() & parsed_col.isna()
        if invalid.any():
            idx = int(df.index[invalid][0]) + 2
            _issue(
                run,
                sheet,
                issues,
                "invalid_date",
                "medium",
                "Date-like value could not be parsed.",
                "Correct the date format in the source export before analysis.",
                col,
                idx,
                df.loc[df.index[invalid][0], col],
            )
        formats = {_date_format_hint(value) for value in _nonnull_strings(df[col], 100)}
        formats.discard("")
        if len(formats) > 1:
            _issue(
                run,
                sheet,
                issues,
                "inconsistent_date_formats",
                "low",
                f"Date column appears to mix formats: {', '.join(sorted(formats))}.",
                "Standardize date entry/export format for this field.",
                col,
            )
        old_or_future = parsed_col.notna() & (
            (parsed_col.dt.year < 1902) | (parsed_col > pd.Timestamp.now() + pd.Timedelta(days=1))
        )
        if old_or_future.any():
            idx = int(df.index[old_or_future][0]) + 2
            _issue(
                run,
                sheet,
                issues,
                "implausible_date",
                "high",
                "Date is a placeholder, very old, or in the future.",
                "Check whether the value is a default date or an entry error.",
                col,
                idx,
                df.loc[df.index[old_or_future][0], col],
            )

    for earlier, later in _date_pairs(date_cols):
        if earlier not in parsed or later not in parsed:
            continue
        conflict = parsed[earlier].notna() & parsed[later].notna() & (parsed[later] < parsed[earlier])
        if conflict.any():
            idx = int(df.index[conflict][0]) + 2
            _issue(
                run,
                sheet,
                issues,
                "date_sequence_conflict",
                "medium",
                f"{later} occurs before {earlier}.",
                "Review the source dates and confirm the chronology.",
                later,
                idx,
                df.loc[df.index[conflict][0], later],
            )


def _date_format_hint(value: str) -> str:
    text = str(value).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return "yyyy-mm-dd"
    if re.match(r"^\d{2}/\d{2}/\d{4}", text):
        return "dd/mm/yyyy_or_mm/dd/yyyy"
    if re.match(r"^\d{2}-\d{2}-\d{4}", text):
        return "dd-mm-yyyy_or_mm-dd-yyyy"
    if re.match(r"^\d{4}/\d{2}/\d{2}", text):
        return "yyyy/mm/dd"
    return ""


def _date_pairs(date_cols: list[str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for start_token, end_token in (
        ("start", "end"),
        ("started", "completed"),
        ("debut", "fin"),
        ("début", "fin"),
        ("naissance", "consultation"),
        ("birth", "visit"),
    ):
        starts = [col for col in date_cols if start_token in col.lower()]
        ends = [col for col in date_cols if end_token in col.lower()]
        for start in starts[:2]:
            for end in ends[:2]:
                if start != end:
                    pairs.append((start, end))
    return list(dict.fromkeys(pairs))


def _check_numeric_values(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        ratio = _numeric_ratio(df[col])
        if ratio == 0:
            continue
        numeric = pd.to_numeric(df[col], errors="coerce")
        if 0.2 <= ratio < 0.8:
            bad = df[col].notna() & numeric.isna()
            if bad.any():
                idx = int(df.index[bad][0]) + 2
                _issue(
                    run,
                    sheet,
                    issues,
                    "mixed_datatypes",
                    "medium",
                    "Column mixes numeric and non-numeric values.",
                    "Confirm the expected field type and correct non-conforming entries.",
                    col,
                    idx,
                    df.loc[df.index[bad][0], col],
                )
        for token, min_value, max_value, issue_type in NUMERIC_RULES:
            if token not in col.lower():
                continue
            out_of_range = numeric.notna() & ((numeric < min_value) | (numeric > max_value))
            if out_of_range.any():
                idx = int(df.index[out_of_range][0]) + 2
                _issue(
                    run,
                    sheet,
                    issues,
                    issue_type,
                    "high",
                    f"Numeric value is outside the expected range [{min_value}, {max_value}].",
                    "Validate the source value and units before using this record.",
                    col,
                    idx,
                    df.loc[df.index[out_of_range][0], col],
                )
            break
        if ratio >= 0.8 and len(numeric.dropna()) >= 8:
            q1, q3 = numeric.quantile(0.25), numeric.quantile(0.75)
            iqr = q3 - q1
            if pd.notna(iqr) and iqr > 0:
                outlier = numeric.notna() & ((numeric < q1 - 3 * iqr) | (numeric > q3 + 3 * iqr))
                if outlier.any():
                    idx = int(df.index[outlier][0]) + 2
                    _issue(
                        run,
                        sheet,
                        issues,
                        "numeric_outlier",
                        "low",
                        "Numeric value is a statistical outlier for this column.",
                        "Review the value for unit mix-ups, misplaced decimals, or reporting errors.",
                        col,
                        idx,
                        df.loc[df.index[outlier][0], col],
                    )


def _check_mixed_types(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        if _numeric_ratio(df[col]) > 0:
            continue
        samples = _nonnull_strings(df[col], limit=100)
        if len(samples) < 8:
            continue
        dateish = sum(1 for value in samples if pd.notna(pd.to_datetime(value, errors="coerce")))
        numberish = sum(1 for value in samples if pd.notna(pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]))
        if dateish > 0 and numberish > 0:
            _issue(
                run,
                sheet,
                issues,
                "mixed_datatypes",
                "medium",
                "Column appears to mix dates, numbers, and/or text.",
                "Confirm whether the column should be split into separate fields.",
                col,
            )


def _check_text_quality(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        samples = _nonnull_strings(df[col], limit=200)
        if not samples:
            continue
        whitespace = [value for value in samples if value != value.strip() or re.search(r"\s{2,}", value)]
        if whitespace:
            _issue(
                run,
                sheet,
                issues,
                "whitespace_problem",
                "low",
                "Values contain leading/trailing or repeated whitespace.",
                "Trim whitespace during cleaning and review whether categories should be harmonized.",
                col,
                value=whitespace[0],
            )
        encoding = [value for value in samples if CONTROL_RE.search(value)]
        if encoding:
            _issue(
                run,
                sheet,
                issues,
                "encoding_problem",
                "medium",
                "Values contain replacement or control characters.",
                "Re-export the file with UTF-8 encoding or correct the affected values.",
                col,
                value=encoding[0],
            )


def _check_unexpected_categories(run: DatasetRun, sheet: SheetData, df: pd.DataFrame, issues: list[dict[str, Any]]) -> None:
    for col in df.columns:
        if not _is_categorical_column(col, df[col]):
            continue
        counts = df[col].dropna().astype(str).str.strip().value_counts()
        if len(counts) < 4:
            continue
        rare = counts[counts == 1]
        if not rare.empty and rare.size <= max(1, int(len(counts) * 0.25)):
            value = rare.index[0]
            _issue(
                run,
                sheet,
                issues,
                "unexpected_category",
                "low",
                "A category appears only once and may be a spelling or reporting variation.",
                "Compare this category with expected choices before grouping it in analysis.",
                col,
                value=value,
            )


def _clean_frame(df: pd.DataFrame, sensitive_columns: set[str], actions: set[str]) -> pd.DataFrame:
    cleaned = df.copy()
    for col in cleaned.columns:
        if col in sensitive_columns:
            cleaned[col] = cleaned[col].map(lambda value: _mask_value(value, col))
            actions.add("masked_sensitive_values")
            continue
        if cleaned[col].dtype == "string" or cleaned[col].dtype == object:
            before = cleaned[col].copy()
            cleaned[col] = cleaned[col].map(_normalize_nulls)
            cleaned[col] = cleaned[col].map(lambda value: value.strip() if isinstance(value, str) else value)
            if not before.equals(cleaned[col]):
                actions.add("trimmed_whitespace_and_normalized_null_markers")
            lowered = cleaned[col].dropna().astype(str).str.lower()
            if not lowered.empty and lowered.isin(YES_NO_MAP).mean() >= 0.8:
                cleaned[col] = cleaned[col].map(
                    lambda value: YES_NO_MAP.get(str(value).lower(), value) if not pd.isna(value) else value
                )
                actions.add("standardized_yes_no_values")
        if _is_date_column(col, cleaned[col]):
            parsed = pd.to_datetime(cleaned[col], errors="coerce")
            valid_share = float(parsed.notna().mean()) if len(parsed) else 0
            if valid_share >= 0.8:
                cleaned[col] = parsed.dt.date.astype("string").where(parsed.notna(), pd.NA)
                actions.add("standardized_parseable_dates")
    return cleaned
