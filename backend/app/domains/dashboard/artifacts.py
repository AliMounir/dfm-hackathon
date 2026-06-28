"""Read uploaded data artifacts (the project_files table + storage) from Supabase.

These power the chat agent's `list_artifacts` / `read_artifact` tools so it can
look at the actual files uploaded for a project (REDCap/DHIS2/Excel/CSV exports).
"""

from __future__ import annotations

import io
import logging

from app.shared import supabase_client as sb

logger = logging.getLogger(__name__)


def list_artifacts(project_id: str) -> list[dict]:
    """List the data files (artifacts) uploaded for a project, newest first."""
    try:
        rows = sb.rest_select(
            "project_files",
            {
                "project_id": f"eq.{project_id}",
                "select": "id,original_filename,kind,mime_type,size_bytes,status,created_at",
                "order": "created_at.desc",
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_artifacts failed: %s", exc)
        return []
    return [
        {
            "id": r["id"],
            "filename": r.get("original_filename"),
            "kind": r.get("kind"),
            "mime_type": r.get("mime_type"),
            "size_bytes": r.get("size_bytes"),
            "status": r.get("status"),
            "created_at": r.get("created_at"),
        }
        for r in rows
    ]


def read_artifact(artifact_id: str, max_chars: int = 8000) -> dict:
    """Read one artifact: metadata + a parsed preview of its content.

    Downloads the file from storage and, for xlsx/csv, returns columns + a CSV
    preview of the first rows; for text, returns a truncated text preview.
    """
    try:
        rows = sb.rest_select(
            "project_files",
            {"id": f"eq.{artifact_id}", "select": "*", "limit": "1"},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("read_artifact lookup failed: %s", exc)
        return {"error": "artifact store unavailable"}
    if not rows:
        return {"error": f"artifact {artifact_id!r} not found"}
    row = rows[0]
    bucket = row.get("storage_bucket") or "dfm-data-uploads"
    path = row.get("storage_path")
    filename = row.get("original_filename", "")

    try:
        content = sb.storage_download(bucket, path)
    except Exception as exc:  # noqa: BLE001
        logger.exception("artifact download failed")
        return {"error": f"download failed: {exc}", "filename": filename}

    name = filename.lower()
    try:
        import pandas as pd

        if name.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        elif name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            return {"filename": filename, "preview": content.decode("utf-8", "replace")[:max_chars]}
        return {
            "filename": filename,
            "rows": int(len(df)),
            "columns": [str(c) for c in df.columns][:60],
            "preview": df.head(20).to_csv(index=False)[:max_chars],
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("artifact parse failed")
        return {"error": f"could not parse: {exc}", "filename": filename}
