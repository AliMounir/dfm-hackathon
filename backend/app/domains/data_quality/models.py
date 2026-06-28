"""Internal models for the data-quality pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


JsonScalar = str | int | float | bool | None


@dataclass
class SheetData:
    name: str
    raw: pd.DataFrame
    normalized: pd.DataFrame
    safe: pd.DataFrame | None = None
    cleaned: pd.DataFrame | None = None


@dataclass
class DatasetRun:
    dataset_id: str
    project_id: str
    source_path: Path
    original_filename: str
    detected_file_type: str
    sheets: list[SheetData]
    output_dir: Path
    sensitive_columns: set[str] = field(default_factory=set)
    profile: dict[str, Any] = field(default_factory=dict)
    issues: list[dict[str, Any]] = field(default_factory=list)
    cleaning_actions: list[str] = field(default_factory=list)
    cleaned_csv_path: Path | None = None
    private_csv_path: Path | None = None
    markdown_summary_path: Path | None = None
    agent_summary: str = ""
