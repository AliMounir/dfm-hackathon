"""Data analytics for the dashboard agent.

Reads a project's real exports (xlsx/html/csv) with pandas, flattens multi-level
headers, classifies columns, and produces a *menu of candidate charts with real
data* (KPIs, bar = measure-by-dimension, line = by month). The agent curates this
menu, so every chart it can pick already has real, non-empty data.

DataFrames are cached per project in-process (first request loads, then reused).
"""

from __future__ import annotations

import io
import json
import logging
import time
from pathlib import Path

import pandas as pd

from app.core.config import get_settings
from app.shared import supabase_client as sb

logger = logging.getLogger(__name__)

# Cache the combined (local + Supabase) frames per project, keyed by a signature
# of the project's uploaded files so newly-uploaded data is picked up. A short
# TTL cache on the file listing avoids re-querying Supabase on every load() call
# within a single request.
_CACHE: dict[str, tuple[str, list[tuple[str, str, pd.DataFrame]]]] = {}
_SIG_CACHE: dict[str, tuple[float, str, list[dict]]] = {}
_SIG_TTL = 8.0

_MONTHS = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
           7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
_ID_LIKE = ("id", "uuid", "formid", "link", "username", "user", "page_number",
            "_time", "received_on", "gps", "lat", "lon", "phone", "annee", "year", "date")
_SITE_KW = ("site", "csb", "region", "région", "district", "commune", "fokontany",
            "centre", "zone", "formation")
_MONTH_KW = ("mois", "month")
_MEASURE_HINT = ("number", "nombre", "total", "count", "effectif", "visit", "cas",
                 "femme", "enfant", "echograph", "accouch", "consult", "sensib",
                 "depist", "traitement", "positif", "recu", "offre", "nouveau")


def _flatten(cols) -> list[str]:
    flat = []
    for c in cols:
        if isinstance(c, tuple):
            parts = [str(p).strip() for p in c
                     if str(p).strip() and not str(p).startswith("Unnamed") and str(p) != "-"]
            flat.append(" / ".join(dict.fromkeys(parts)) or "col")
        else:
            flat.append(str(c).strip() or "col")
    seen: dict[str, int] = {}
    out = []
    for c in flat:
        if c in seen:
            seen[c] += 1
            out.append(f"{c}_{seen[c]}")
        else:
            seen[c] = 0
            out.append(c)
    return out


def _frames_from(name: str, reader) -> list[tuple[str, pd.DataFrame]]:
    """Run a pandas reader, flatten headers, return [(sheet, df)]."""
    try:
        frames = reader()
    except Exception:  # noqa: BLE001
        logger.exception("failed reading %s", name)
        return []
    out = []
    for sn, df in frames.items():
        df = df.copy()
        df.columns = _flatten(list(df.columns))
        out.append((sn, df))
    return out


def _read_file(path: Path) -> list[tuple[str, pd.DataFrame]]:
    suf = path.suffix.lower()
    if suf == ".xlsx":
        return _frames_from(path.name, lambda: pd.read_excel(path, sheet_name=None, engine="openpyxl"))
    if suf == ".html":
        return _frames_from(path.name, lambda: {f"table_{i + 1}": d for i, d in enumerate(pd.read_html(str(path)))})
    if suf == ".csv":
        return _frames_from(path.name, lambda: {"csv": pd.read_csv(path)})
    return []


def _read_bytes(name: str, content: bytes) -> list[tuple[str, pd.DataFrame]]:
    """Parse an in-memory uploaded file (xlsx/csv) into [(sheet, df)]."""
    low = name.lower()
    if low.endswith(".xlsx"):
        return _frames_from(name, lambda: pd.read_excel(io.BytesIO(content), sheet_name=None, engine="openpyxl"))
    if low.endswith(".csv"):
        return _frames_from(name, lambda: {"csv": pd.read_csv(io.BytesIO(content))})
    return []


def _local_frames(project_id: str) -> list[tuple[str, str, pd.DataFrame]]:
    pdir = get_settings().data_dir / "projects" / project_id
    frames: list[tuple[str, str, pd.DataFrame]] = []
    if pdir.exists():
        for f in sorted(pdir.iterdir()):
            if f.suffix.lower() in (".xlsx", ".html", ".csv"):
                for sn, df in _read_file(f):
                    frames.append((f.name, sn, df))
    return frames


def _uploaded_source_rows(project_id: str) -> tuple[str, list[dict]]:
    """The project's uploaded tabular source files from Supabase (newest first),
    with a signature for cache invalidation. Cached briefly to avoid re-querying
    on every load() call in a request. ('', []) when Supabase isn't configured."""
    now = time.monotonic()
    cached = _SIG_CACHE.get(project_id)
    if cached and cached[0] > now:
        return cached[1], cached[2]

    rows: list[dict] = []
    if sb.configured():
        try:
            rows = sb.rest_select(
                "project_files",
                {
                    "project_id": f"eq.{project_id}",
                    "select": "id,original_filename,storage_bucket,storage_path,kind,status,created_at",
                    "order": "created_at.desc",
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("could not list uploaded files for %s: %s", project_id, exc)
            rows = []

    source = [r for r in rows if str(r.get("kind") or "").lower() in ("excel", "csv")]
    sig = ",".join(sorted(str(r.get("id")) for r in source))
    _SIG_CACHE[project_id] = (now + _SIG_TTL, sig, source)
    return sig, source


def load(project_id: str) -> list[tuple[str, str, pd.DataFrame]]:
    """Project data = locally-bundled exports + files uploaded to Supabase.

    Cached per project, keyed by the Supabase upload signature so newly-uploaded
    data is analysed as soon as it lands (no restart needed)."""
    sig, rows = _uploaded_source_rows(project_id)
    cached = _CACHE.get(project_id)
    if cached and cached[0] == sig:
        return cached[1]

    frames = _local_frames(project_id)
    local_names = {f.lower() for f, _s, _df in frames}
    bucket = get_settings().supabase_upload_bucket
    seen: set[str] = set()
    for r in rows:
        name = r.get("original_filename") or ""
        key = name.lower()
        path = r.get("storage_path")
        # Skip files already bundled locally (avoid double-counting) and dupes.
        if not name or not path or key in local_names or key in seen:
            continue
        seen.add(key)
        try:
            content = sb.storage_download(r.get("storage_bucket") or bucket, path)
        except Exception:  # noqa: BLE001
            logger.exception("supabase download failed for %s", name)
            continue
        for sn, df in _read_bytes(name, content):
            frames.append((name, sn, df))

    _CACHE[project_id] = (sig, frames)
    return frames


def _short(name: str) -> str:
    n = str(name)
    if " / " in n:
        n = n.split(" / ")[-1]
    n = n.replace("form.", "").replace("_", " ").strip()
    return (n[:38] + "…") if len(n) > 39 else n


def _fmt(v: float) -> str:
    v = float(v)
    if abs(v) >= 1000:
        return f"{v:,.0f}"
    return str(int(v)) if v == int(v) else f"{v:.1f}"


def _is_id_like(name: str, s: pd.Series) -> bool:
    lc = name.lower()
    if any(k in lc for k in _ID_LIKE):
        return True
    nn = int(s.notna().sum())
    return nn > 5 and s.nunique(dropna=True) == nn  # all-unique → identifier


def _measures(df: pd.DataFrame) -> list[str]:
    scored = []
    for c in df.columns:
        s = df[c]
        if not pd.api.types.is_numeric_dtype(s) or _is_id_like(c, s):
            continue
        total = float(s.fillna(0).sum())
        if total <= 0:
            continue
        hinted = any(h in c.lower() for h in _MEASURE_HINT)
        scored.append((c, (1 if hinted else 0, total)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [c for c, _ in scored]


def _dimension(df: pd.DataFrame) -> str | None:
    cands = []
    for c in df.columns:
        s = df[c]
        if pd.api.types.is_numeric_dtype(s):
            continue
        nun = s.nunique(dropna=True)
        if 2 <= nun <= 25:
            cands.append((c, any(k in c.lower() for k in _SITE_KW), nun))
    if not cands:
        return None
    cands.sort(key=lambda x: (x[1], -x[2]), reverse=True)
    return cands[0][0]


def _month_col(df: pd.DataFrame) -> str | None:
    for c in df.columns:
        if any(k in c.lower() for k in _MONTH_KW):
            s = pd.to_numeric(df[c], errors="coerce").dropna()
            if len(s[(s >= 1) & (s <= 12)]) > 0:
                return c
    return None


def candidate_charts(project_id: str) -> list[dict]:
    """A menu of charts computed from the project's real data."""
    frames = load(project_id)
    if not frames:
        return []
    cands: list[dict] = []

    total_rows = sum(len(df) for _f, _s, df in frames)
    files = sorted({f for f, _s, _df in frames})
    kpi = [
        {"label": {"fr": "Enregistrements", "en": "Records"}, "value": f"{total_rows:,}"},
        {"label": {"fr": "Fichiers", "en": "Files"}, "value": str(len(files))},
    ]
    big = max(frames, key=lambda t: len(t[2]))
    for m in _measures(big[2])[:2]:
        kpi.append({"label": {"fr": _short(m), "en": _short(m)},
                    "value": _fmt(big[2][m].fillna(0).sum())})
    cands.append({"id": "kpi", "type": "kpi_cards",
                  "what": "Headline totals (records, files, key measures)", "data": kpi})

    cid = 0
    for fname, _sname, df in sorted(frames, key=lambda t: len(t[2]), reverse=True)[:3]:
        try:
            dim = _dimension(df)
            measures = _measures(df)
            if dim and measures:
                for m in measures[:2]:
                    g = (df.groupby(df[dim].astype(str))[m].sum()
                         .sort_values(ascending=False).head(8))
                    data = [{"label": str(k), "value": float(v)} for k, v in g.items() if v]
                    if len(data) >= 2:
                        cid += 1
                        cands.append({"id": f"bar{cid}", "type": "bar",
                                      "what": f"{_short(m)} by {_short(dim)} ({fname})",
                                      "data": data})
            mc = _month_col(df)
            if mc:
                meas = measures[0] if measures else None
                if meas:
                    g = df.groupby(pd.to_numeric(df[mc], errors="coerce"))[meas].sum()
                    label = _short(meas)
                else:
                    g = pd.to_numeric(df[mc], errors="coerce").value_counts()
                    label = "Records"
                pts = [{"label": _MONTHS[mo], "value": float(g.loc[mo])}
                       for mo in range(1, 13) if mo in g.index]
                if len(pts) >= 2:
                    cid += 1
                    cands.append({"id": f"line{cid}", "type": "line",
                                  "what": f"{label} by month ({fname})", "data": pts})
        except Exception:  # noqa: BLE001
            logger.exception("candidate build failed for %s/%s", project_id, fname)
        if len(cands) >= 8:
            break
    return cands[:8]


# ── derived metrics (the agent's analysis) ──────────────────────────────────

_SAFE_BUILTINS = {
    "round": round, "len": len, "sum": sum, "min": min, "max": max, "abs": abs,
    "sorted": sorted, "float": float, "int": int, "str": str, "bool": bool,
    "range": range, "any": any, "all": all, "set": set, "list": list,
}
_DENY = ("__", "import", "open(", "eval", "exec", "compile", "globals", "locals",
         "getattr", "setattr", "delattr", "to_csv", "to_excel", "to_pickle",
         "to_json", "system", "subprocess", "os.", "sys.", "read_", "write")


def compute(project_id: str, expression: str) -> dict:
    """Safely evaluate a single pandas EXPRESSION against the project's data and
    return a scalar. Available names: ``df`` (largest sheet), ``frames`` (list of
    (file, sheet, dataframe)), ``pd``. Restricted builtins; no imports/IO."""
    expr = (expression or "").strip()
    if not expr or len(expr) > 500 or any(d in expr.lower() for d in _DENY):
        return {"error": "expression not allowed"}
    frames = load(project_id)
    if not frames:
        return {"error": "no data"}
    df = max(frames, key=lambda t: len(t[2]))[2]

    def sheet(name: str):
        """Return the first dataframe whose file or sheet name contains `name`."""
        nm = str(name).lower()
        for f, s, d in frames:
            if nm in f.lower() or nm in s.lower():
                return d
        return df

    try:
        val = eval(  # noqa: S307
            expr,
            {"__builtins__": _SAFE_BUILTINS},
            {"pd": pd, "frames": frames, "df": df, "sheet": sheet},
        )
    except Exception as exc:  # noqa: BLE001
        return {"error": f"{type(exc).__name__}: {exc}"[:160]}
    if hasattr(val, "item"):
        try:
            val = val.item()
        except Exception:  # noqa: BLE001
            pass
    if isinstance(val, bool):
        return {"value": val}
    if isinstance(val, (int, float)):
        return {"value": float(val)}
    return {"value": str(val)[:80]}


def auto_kpis(project_id: str) -> list[dict]:
    """Deterministic analytical KPIs (used by the no-key fallback)."""
    frames = load(project_id)
    if not frames:
        return []
    total = sum(len(df) for _f, _s, df in frames)
    files = len({f for f, _s, _df in frames})
    cells = sum(int(df.size) for _f, _s, df in frames) or 1
    nonnull = sum(int(df.notna().sum().sum()) for _f, _s, df in frames)
    completeness = round(nonnull / cells * 100, 1)
    big = max(frames, key=lambda t: len(t[2]))[2]
    gaps = int(big.isna().any(axis=1).sum())
    alerts = sum(1 for _f, _s, df in frames for c in df.columns if float(df[c].isna().mean()) > 0.4)
    return [
        {"label": {"fr": "Activités enregistrées", "en": "Recorded activities"},
         "value": f"{total:,}", "helper": {"fr": "lignes au total", "en": "total rows"}},
        {"label": {"fr": "Couverture estimée", "en": "Estimated coverage"},
         "value": f"{completeness}%", "helper": {"fr": "complétude — à valider", "en": "completeness — to validate"}},
        {"label": {"fr": "Écarts à explorer", "en": "Gaps to explore"},
         "value": f"{gaps:,}", "helper": {"fr": "lignes avec valeurs manquantes", "en": "rows with missing values"}},
        {"label": {"fr": "Alertes prioritaires", "en": "Priority alerts"},
         "value": str(alerts), "helper": {"fr": "champs très incomplets", "en": "highly incomplete fields"}},
        {"label": {"fr": "Fichiers", "en": "Files"},
         "value": str(files), "helper": {"fr": "exports rattachés", "en": "attached exports"}},
    ]


_RISK_KW = ("deces", "décès", "complicat", "risque", "dead", "abortion", "avortement",
            "bleeding", "hemorr", "saignement", "infection", "eclampsie", "perdu",
            "dropout", "abandon", "positif", "refer")


def monthly_trend(project_id: str) -> list[dict]:
    """Activity vs risk vs target per month, from the best month-tagged sheet."""
    frames = load(project_id)
    best = None
    best_n = 0
    for _f, _s, df in frames:
        mc = _month_col(df)
        if not mc:
            continue
        n = int(pd.to_numeric(df[mc], errors="coerce").between(1, 12).sum())
        if n > best_n:
            best, best_n = (df, mc), n
    if not best:
        return []
    df, mc = best
    m = pd.to_numeric(df[mc], errors="coerce")
    services = m.value_counts()
    risk_cols = [c for c in df.columns
                 if pd.api.types.is_numeric_dtype(df[c]) and any(k in c.lower() for k in _RISK_KW)]
    risks = df.assign(_m=m).groupby("_m")[risk_cols].sum().sum(axis=1) if risk_cols else None
    svals = [int(services.get(mo, 0)) for mo in range(1, 13) if mo in services.index]
    target = round(sum(svals) / len(svals)) if svals else 0
    out = []
    for mo in range(1, 13):
        if mo not in services.index:
            continue
        out.append({
            "month": _MONTHS[mo],
            "services": int(services.get(mo, 0)),
            "risks": int(risks.get(mo, 0)) if risks is not None else 0,
            "target": target,
        })
    return out


def site_breakdown(project_id: str) -> list[dict]:
    """Records per site (top 8) with month-over-month % change where computable."""
    frames = load(project_id)
    best = None
    best_n = 0
    for _f, _s, df in frames:
        dim = _dimension(df)
        if dim and len(df) > best_n:
            best, best_n = (df, dim), len(df)
    if not best:
        return []
    df, dim = best
    counts = df[dim].astype(str).value_counts().head(8)
    change: dict[str, float] = {}
    mc = _month_col(df)
    if mc:
        m = pd.to_numeric(df[mc], errors="coerce")
        months = sorted(set(int(x) for x in m.dropna() if 1 <= x <= 12))
        if len(months) >= 2:
            last, prev = months[-1], months[-2]
            cur = df[m == last][dim].astype(str).value_counts()
            old = df[m == prev][dim].astype(str).value_counts()
            for site in counts.index:
                c, o = int(cur.get(site, 0)), int(old.get(site, 0))
                change[site] = round((c - o) / o * 100, 1) if o else 0.0
    return [{"site": str(s), "value": int(v), "change": change.get(str(s), 0.0)}
            for s, v in counts.items()]


def _find_col(df: pd.DataFrame, name: str) -> str | None:
    """Resolve an agent-provided column name to an actual column (fuzzy)."""
    n = str(name).lower().strip()
    if not n:
        return None
    for c in df.columns:
        if _short(c).lower() == n:
            return c
    for c in df.columns:
        if n in _short(c).lower() or n in str(c).lower():
            return c
    return None


def aggregate(project_id: str, dimension: str, measure: str | None = None,
              agg: str = "sum", top: int = 8, dataset: str | None = None) -> list[dict]:
    """Ad-hoc series for a chat-requested chart: group by `dimension`, aggregate
    `measure` (or count rows when no measure). When `dataset` is given, restrict to
    the file/sheet whose name matches it (e.g. 'ACCOUCHEMENT'). [] if not found."""
    frames = load(project_id)
    if dataset:
        d = dataset.lower()
        scoped = [t for t in frames if d in t[1].lower() or d in t[0].lower()]
        frames = scoped or frames
    for _fname, _sname, df in sorted(frames, key=lambda t: len(t[2]), reverse=True):
        dcol = _find_col(df, dimension)
        if not dcol:
            continue
        try:
            if measure:
                mcol = _find_col(df, measure)
                if not mcol or not pd.api.types.is_numeric_dtype(df[mcol]):
                    continue
                grouped = df.groupby(df[dcol].astype(str))[mcol]
                s = grouped.mean() if agg == "mean" else grouped.sum()
            else:
                s = df[dcol].astype(str).value_counts()
            s = s.sort_values(ascending=False).head(top)
            return [{"label": str(k), "value": round(float(v), 2)}
                    for k, v in s.items() if pd.notna(v)]
        except Exception:  # noqa: BLE001
            logger.exception("aggregate failed (%s by %s)", measure, dimension)
            continue
    return []


def data_summary(project_id: str) -> dict:
    """Compact summary for the chat agent: which dimensions/measures it can chart."""
    frames = load(project_id)
    dims: set[str] = set()
    meas: set[str] = set()
    for _f, _s, df in frames:
        for c in df.columns:
            if pd.api.types.is_numeric_dtype(df[c]):
                if not _is_id_like(c, df[c]) and float(df[c].fillna(0).sum()) > 0:
                    meas.add(_short(c))
            else:
                nun = df[c].nunique(dropna=True)
                if 2 <= nun <= 40:
                    dims.add(_short(c))
    datasets = []
    for f, s, df in sorted(frames, key=lambda t: len(t[2]), reverse=True)[:20]:
        d_dims = [_short(c) for c in df.columns
                  if not pd.api.types.is_numeric_dtype(df[c]) and 2 <= df[c].nunique(dropna=True) <= 40][:8]
        d_meas = [_short(c) for c in df.columns
                  if pd.api.types.is_numeric_dtype(df[c]) and not _is_id_like(c, df[c])
                  and float(df[c].fillna(0).sum()) > 0][:8]
        datasets.append({"name": s, "file": f, "rows": int(len(df)),
                         "dimensions": d_dims, "measures": d_meas})

    return {
        "n_records": sum(len(df) for _f, _s, df in frames),
        "dimensions": sorted(dims)[:25],
        "measures": sorted(meas)[:30],
        "datasets": datasets,
    }


def overview() -> dict:
    """Static, deterministic overview across all projects (no LLM). Fast: counts
    files from disk and reads record totals from each project's _parsed.json when
    present (run scripts/parse_data.py to populate)."""
    root = get_settings().data_dir / "projects"
    projects = []
    total_files = 0
    total_records = 0
    if root.exists():
        for pdir in sorted(d for d in root.iterdir() if d.is_dir()):
            files = [f for f in pdir.iterdir()
                     if f.suffix.lower() in (".xlsx", ".html", ".csv")]
            records = 0
            pj = pdir / "_parsed.json"
            if pj.exists():
                try:
                    agg = json.loads(pj.read_text(encoding="utf-8"))
                    records = sum(r.get("rows", 0) for r in agg.get("record_counts", []))
                except (json.JSONDecodeError, OSError):
                    pass
            total_files += len(files)
            total_records += records
            projects.append({
                "id": pdir.name,
                "name": pdir.name.replace("-", " ").upper(),
                "files": len(files),
                "records": records,
            })
    return {
        "n_projects": len(projects),
        "n_files": total_files,
        "n_records": total_records,
        "projects": projects,
    }


def dashboard_menu(project_id: str) -> dict:
    """Everything the agent needs in ONE call: candidate KPIs (real values) and
    candidate charts (real data). The agent curates/orders/colours these — so no
    iterative computation is needed (fast)."""
    frames = load(project_id)
    if not frames:
        return {"kpis": [], "charts": []}

    kpis: list[dict] = []
    for i, k in enumerate(auto_kpis(project_id)):
        kpis.append({"id": f"a{i}", "hint": k["label"]["en"], "value": k["value"]})

    seen: set[str] = set()
    for _fname, _sname, df in sorted(frames, key=lambda t: len(t[2]), reverse=True)[:2]:
        for m in _measures(df)[:5]:
            key = _short(m).lower()
            if key in seen:
                continue
            seen.add(key)
            kpis.append({"id": f"m{len(kpis)}", "hint": _short(m),
                         "value": _fmt(float(df[m].fillna(0).sum()))})
        if len(kpis) >= 12:
            break

    charts = []
    for c in candidate_charts(project_id):
        if c["type"] in ("bar", "line"):
            charts.append({"id": c["id"], "type": c["type"], "hint": c["what"], "data": c["data"]})

    return {"kpis": kpis[:12], "charts": charts[:8]}


def project_facts(project_id: str) -> dict:
    """Files, sheets, rows, and column names — context for the data description."""
    frames = load(project_id)
    files: dict[str, list[dict]] = {}
    for f, s, df in frames:
        files.setdefault(f, []).append(
            {"sheet": s, "rows": int(len(df)),
             "columns": [_short(c) for c in list(df.columns)[:40]]})
    return {
        "project_id": project_id,
        "n_files": len(files),
        "n_records": sum(len(df) for _f, _s, df in frames),
        "files": files,
    }
