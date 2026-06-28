#!/usr/bin/env python3
"""Clean annual health exports and attach data-quality confidence markers.

The script keeps the original Excel files untouched. It produces:
  - cleaned CSV tables with sensitive direct identifiers removed
  - private identifier CSV tables keyed by row_id
  - a row-level and field-level data quality issue log
  - a validation summary and manifest for auditability
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import warnings
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd
from pandas.errors import PerformanceWarning


warnings.simplefilter("ignore", PerformanceWarning)


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

PII_PATTERNS = [
    "nom",
    "prenom",
    "phone",
    "telephone",
    "tel",
    "cin",
    "photo",
    "carte",
    "barcode",
    "form_link",
    "id_text",
]

ID_KEEP_PATTERNS = [
    "formid",
    "case",
    "uid",
    "preinclusion_id",
    "id_claim",
]

CANONICAL_VALUES = {
    "sex": {
        "f": "female",
        "femme": "female",
        "female": "female",
        "m": "male",
        "homme": "male",
        "male": "male",
    },
    "yes_no": {
        "oui": "yes",
        "yes": "yes",
        "y": "yes",
        "non": "no",
        "no": "no",
        "n": "no",
    },
    "lab_result": {
        "negative": "negative",
        "négative": "negative",
        "negative": "negative",
        "ngatif": "negative",
        "neg": "negative",
        "positive": "positive",
        "positif": "positive",
        "pos": "positive",
        "tpb+": "tpb_positive",
        "tpb-": "tpb_negative",
        "tep": "tep",
    },
    "outcome": {
        "gurie": "cured",
        "guri": "cured",
        "geuri": "cured",
        "guérie": "cured",
        "traitement_termine": "treatment_completed",
        "abandon/pdv": "lost_to_follow_up",
        "perdu_de_vue": "lost_to_follow_up",
        "dcd": "deceased",
        "dced": "deceased",
        "decede": "deceased",
        "décédé": "deceased",
        "dcede": "deceased",
        "echec": "failure",
        "transféré": "transferred",
        "transfer_dans_un_autre_centre": "transferred",
    },
}


@dataclass
class Issue:
    row_id: str
    table_name: str
    source_file: str
    source_sheet: str
    field_name: str
    original_value: Any
    cleaned_value: Any
    issue_type: str
    severity: str
    note: str


def normalize_col(name: Any) -> str:
    text = str(name).strip()
    text = text.replace("@", "")
    text = re.sub(r"[^0-9A-Za-z]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_").lower()
    return text or "unnamed"


def normalize_text(value: Any) -> Any:
    if pd.isna(value):
        return pd.NA
    if isinstance(value, str):
        text = value.strip()
        if text.lower() in NULL_MARKERS:
            return pd.NA
        return text
    return value


def stable_row_id(source_file: str, sheet: str, index: int, row: pd.Series) -> str:
    preferred = []
    for col in row.index:
        col_l = str(col).lower()
        if any(pattern in col_l for pattern in ID_KEEP_PATTERNS):
            val = normalize_text(row[col])
            if not pd.isna(val):
                preferred.append(f"{col_l}={val}")
    base = "|".join(preferred) if preferred else f"{source_file}|{sheet}|{index}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:24]


def table_name_for(path: Path, sheet_name: str) -> str:
    stem = re.sub(r"_?\d{4}-\d{2}-\d{2}$", "", path.stem)
    return normalize_col(f"{stem}_{sheet_name}")


def is_pii_column(col: str) -> bool:
    lowered = col.lower()
    if any(keep in lowered for keep in ID_KEEP_PATTERNS):
        return False
    return any(pattern in lowered for pattern in PII_PATTERNS)


def canonicalize_value(col: str, value: Any) -> tuple[Any, str | None]:
    if pd.isna(value):
        return value, None
    raw = str(value).strip()
    key = raw.lower()
    col_l = col.lower()

    if "sexe" in col_l or col_l.endswith("_sex") or col_l.endswith("_gender") or "genre" in col_l:
        mapped = CANONICAL_VALUES["sex"].get(key)
        if mapped:
            return mapped, "standardized_sex"

    if key in CANONICAL_VALUES["yes_no"] and (
        col_l.startswith("form_")
        or col_l.endswith("_question")
        or "consent" in col_l
        or "confirmation" in col_l
        or "realisation" in col_l
    ):
        return CANONICAL_VALUES["yes_no"][key], "standardized_yes_no"

    if any(token in col_l for token in ["resultat", "resultats", "bascillio", "vih"]):
        mapped = CANONICAL_VALUES["lab_result"].get(key)
        if mapped:
            return mapped, "standardized_lab_result"

    if any(token in col_l for token in ["finalite", "finalit", "evolution", "issue", "traitement"]):
        mapped = CANONICAL_VALUES["outcome"].get(key)
        if mapped:
            return mapped, "standardized_outcome"

    return value, None


def col_tokens(col: str) -> set[str]:
    return set(token for token in re.split(r"_+", col.lower()) if token)


def numeric_rule_matches(col: str, token: str) -> bool:
    tokens = col_tokens(col)
    col_l = col.lower()
    if token == "age":
        return "age" in tokens and "tranche" not in tokens
    if token == "imc":
        return "imc" in tokens
    if token == "bmi":
        return "bmi" in tokens
    if token == "poids":
        return "poids" in tokens
    if token == "taille":
        return "taille" in tokens
    if token == "distance":
        return "distance" in tokens
    if token == "duree":
        return "duree" in tokens
    if token == "montant":
        return "montant" in tokens
    if token == "score":
        return "score" in tokens
    if token == "total_participants":
        return "total_participants" in col_l
    return False


def to_number(value: Any) -> float | pd.NA:
    if pd.isna(value):
        return pd.NA
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return pd.NA


def parse_date_series(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def comparable_date_pairs(date_cols: list[str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []

    suffixes = set()
    for col in date_cols:
        if col.startswith("started_time"):
            suffixes.add(col.replace("started_time", "", 1))
    for suffix in suffixes:
        start = f"started_time{suffix}"
        complete = f"completed_time{suffix}"
        received = f"received_on{suffix}"
        if start in date_cols and complete in date_cols:
            pairs.append((start, complete))
        if complete in date_cols and received in date_cols:
            pairs.append((complete, received))

    rules = [
        ("date_du_dpistage", "date_du_rsultat"),
        ("date_du_dpistage", "date_test_vih"),
        ("date_du_rsultat", "date_de_prise_de_medicament"),
        ("date_du_rsultat", "date_du_jour_fin_de_traitement"),
        ("date_de_prise_de_medicament", "date_du_jour_fin_de_traitement"),
        ("heure_appel", "heure_depart_bureau"),
        ("heure_depart_bureau", "heure_arive_au_csb"),
    ]
    for earlier_token, later_token in rules:
        earlier_cols = [c for c in date_cols if earlier_token in c]
        later_cols = [c for c in date_cols if later_token in c]
        for earlier in earlier_cols[:1]:
            for later in later_cols[:1]:
                if earlier != later:
                    pairs.append((earlier, later))

    return list(dict.fromkeys(pairs))


def add_issue(
    issues: list[Issue],
    row_id: str,
    table_name: str,
    source_file: str,
    source_sheet: str,
    field_name: str,
    original_value: Any,
    cleaned_value: Any,
    issue_type: str,
    severity: str,
    note: str,
) -> None:
    issues.append(
        Issue(
            row_id=row_id,
            table_name=table_name,
            source_file=source_file,
            source_sheet=source_sheet,
            field_name=field_name,
            original_value=None if pd.isna(original_value) else original_value,
            cleaned_value=None if pd.isna(cleaned_value) else cleaned_value,
            issue_type=issue_type,
            severity=severity,
            note=note,
        )
    )


def validate_table(df: pd.DataFrame, table_name: str, source_file: str, source_sheet: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    issues: list[Issue] = []
    cleaned = df.copy()

    for col in cleaned.columns:
        cleaned[col] = cleaned[col].map(normalize_text)

    cleaned.insert(0, "row_id", [stable_row_id(source_file, source_sheet, i, row) for i, row in cleaned.iterrows()])
    cleaned.insert(1, "source_file", source_file)
    cleaned.insert(2, "source_sheet", source_sheet)
    cleaned.insert(3, "table_name", table_name)
    cleaned.insert(4, "source_row_number", range(2, len(cleaned) + 2))

    for col in list(cleaned.columns):
        if col in {"row_id", "source_file", "source_sheet", "table_name", "source_row_number"}:
            continue
        standardized = []
        for idx, value in cleaned[col].items():
            new_value, issue_type = canonicalize_value(col, value)
            standardized.append(new_value)
            if issue_type and str(new_value) != str(value):
                add_issue(
                    issues,
                    cleaned.at[idx, "row_id"],
                    table_name,
                    source_file,
                    source_sheet,
                    col,
                    value,
                    new_value,
                    issue_type,
                    "info",
                    "Value standardized to a common analytical label.",
                )
        cleaned[col] = standardized

    date_cols = [c for c in cleaned.columns if any(token in c for token in ["date", "completed_time", "started_time", "received_on"])]
    parsed_dates: dict[str, pd.Series] = {}
    for col in date_cols:
        parsed = parse_date_series(cleaned[col])
        parsed_dates[col] = parsed
        for idx, original in cleaned[col].items():
            if pd.isna(original):
                continue
            value_date = parsed.loc[idx]
            original_text = str(original)
            if pd.isna(value_date):
                add_issue(issues, cleaned.at[idx, "row_id"], table_name, source_file, source_sheet, col, original, pd.NA, "unparseable_date", "warning", "Date value could not be parsed.")
            elif value_date.year <= 1901:
                add_issue(issues, cleaned.at[idx, "row_id"], table_name, source_file, source_sheet, col, original, pd.NA, "placeholder_or_implausible_date", "warning", "Date is likely a default/placeholder value.")
                cleaned.at[idx, col] = pd.NA
            elif "date_de_naissance" in col and value_date > pd.Timestamp.today() + pd.Timedelta(days=1):
                add_issue(issues, cleaned.at[idx, "row_id"], table_name, source_file, source_sheet, col, original, pd.NA, "future_birth_date", "critical", "Birth date is after the current date.")
                cleaned.at[idx, col] = pd.NA
            elif re.match(r"\d{4}-\d{2}-\d{2}", original_text):
                cleaned.at[idx, col] = value_date.date().isoformat()

    numeric_rules = [
        ("age", 0, 120, "age_out_of_range"),
        ("imc", 8, 80, "bmi_out_of_range"),
        ("bmi", 8, 80, "bmi_out_of_range"),
        ("poids", 1, 250, "weight_out_of_range"),
        ("taille", 0.3, 2.5, "height_out_of_range"),
        ("distance", 0, 300, "distance_out_of_range"),
        ("duree", 0, 72, "duration_out_of_range"),
        ("montant", 0, 100_000_000, "amount_out_of_range"),
        ("score", 0, 100, "score_out_of_range"),
        ("total_participants", 0, 10000, "participant_count_out_of_range"),
    ]
    for col in cleaned.columns:
        col_l = col.lower()
        for token, min_value, max_value, issue_type in numeric_rules:
            if not numeric_rule_matches(col_l, token):
                continue
            numeric = cleaned[col].map(to_number)
            for idx, num in numeric.items():
                if pd.isna(cleaned.at[idx, col]):
                    continue
                if pd.isna(num):
                    add_issue(issues, cleaned.at[idx, "row_id"], table_name, source_file, source_sheet, col, cleaned.at[idx, col], pd.NA, "numeric_parse_failed", "warning", f"Expected a numeric value because field contains '{token}'.")
                elif num < min_value or num > max_value:
                    add_issue(issues, cleaned.at[idx, "row_id"], table_name, source_file, source_sheet, col, cleaned.at[idx, col], pd.NA, issue_type, "critical", f"Value outside expected range [{min_value}, {max_value}].")
                    cleaned.at[idx, col] = pd.NA
            break

    # Cross-check age against date of birth and event/screening date when both exist.
    dob_cols = [c for c in cleaned.columns if "date_de_naissance" in c]
    age_cols = [c for c in cleaned.columns if c.endswith("age") or "_age" in c]
    event_cols = [c for c in date_cols if "naissance" not in c]
    for dob_col in dob_cols:
        dob = parse_date_series(cleaned[dob_col])
        for age_col in age_cols:
            ages = cleaned[age_col].map(to_number)
            for event_col in event_cols[:3]:
                event_dates = parse_date_series(cleaned[event_col])
                comparable = dob.notna() & ages.notna() & event_dates.notna()
                for idx in cleaned.index[comparable]:
                    calculated_age = int((event_dates.loc[idx] - dob.loc[idx]).days // 365.25)
                    reported_age = int(ages.loc[idx])
                    if abs(calculated_age - reported_age) > 2 and 0 <= calculated_age <= 120:
                        add_issue(
                            issues,
                            cleaned.at[idx, "row_id"],
                            table_name,
                            source_file,
                            source_sheet,
                            age_col,
                            cleaned.at[idx, age_col],
                            cleaned.at[idx, age_col],
                            "plausible_but_conflicting_age",
                            "warning",
                            f"Reported age differs from birth-date-derived age ({calculated_age}) by more than 2 years.",
                        )
                break

    # Check common date order fields using vectorized parsed columns.
    for earlier_col, later_col in comparable_date_pairs(date_cols):
        if earlier_col not in parsed_dates or later_col not in parsed_dates:
            continue
        conflict = parsed_dates[later_col].notna() & parsed_dates[earlier_col].notna() & (parsed_dates[later_col] < parsed_dates[earlier_col])
        for idx in cleaned.index[conflict]:
            add_issue(
                issues,
                cleaned.at[idx, "row_id"],
                table_name,
                source_file,
                source_sheet,
                later_col,
                cleaned.at[idx, later_col],
                cleaned.at[idx, later_col],
                "date_sequence_conflict",
                "warning",
                f"{later_col} occurs before {earlier_col}.",
            )

    issue_df = pd.DataFrame([issue.__dict__ for issue in issues])
    if not issue_df.empty:
        row_numbers = cleaned.set_index("row_id")["source_row_number"]
        issue_df.insert(4, "source_row_number", issue_df["row_id"].map(row_numbers))
    cleaned = attach_confidence(cleaned, issue_df)
    return cleaned, issue_df


def attach_confidence(cleaned: pd.DataFrame, issues: pd.DataFrame) -> pd.DataFrame:
    score = pd.Series(1.0, index=cleaned["row_id"])
    if not issues.empty:
        penalties = {"critical": 0.35, "warning": 0.15, "info": 0.0}
        for row_id, group in issues.groupby("row_id"):
            total_penalty = sum(penalties.get(str(sev), 0.1) for sev in group["severity"])
            score.loc[row_id] = max(0.0, 1.0 - min(total_penalty, 0.8))

    cleaned["data_confidence_score"] = cleaned["row_id"].map(score).round(2)
    cleaned["data_confidence_marker"] = cleaned["data_confidence_score"].map(
        lambda x: "high" if x >= 0.85 else "medium" if x >= 0.65 else "low"
    )
    if issues.empty:
        cleaned["data_quality_issue_count"] = 0
        cleaned["data_quality_highest_severity"] = "none"
        return cleaned

    counts = issues.groupby("row_id").size()
    severity_rank = {"none": 0, "info": 1, "warning": 2, "critical": 3}
    highest = (
        issues.assign(rank=issues["severity"].map(severity_rank))
        .sort_values("rank")
        .groupby("row_id")
        .tail(1)
        .set_index("row_id")["severity"]
    )
    cleaned["data_quality_issue_count"] = cleaned["row_id"].map(counts).fillna(0).astype(int)
    cleaned["data_quality_highest_severity"] = cleaned["row_id"].map(highest).fillna("none")
    return cleaned


def split_private_columns(cleaned: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    private_cols = [c for c in cleaned.columns if is_pii_column(c)]
    if not private_cols:
        return cleaned, pd.DataFrame(columns=["row_id"])
    private = cleaned[["row_id", "source_file", "source_sheet", "source_row_number", *private_cols]].copy()
    public = cleaned.drop(columns=private_cols)
    return public, private


def summarize_tables(cleaned_tables: dict[str, pd.DataFrame], all_issues: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for table_name, df in cleaned_tables.items():
        table_issues = all_issues[all_issues["table_name"] == table_name] if not all_issues.empty else pd.DataFrame()
        rows.append(
            {
                "table_name": table_name,
                "rows": len(df),
                "columns": len(df.columns),
                "high_confidence_rows": int((df["data_confidence_marker"] == "high").sum()),
                "medium_confidence_rows": int((df["data_confidence_marker"] == "medium").sum()),
                "low_confidence_rows": int((df["data_confidence_marker"] == "low").sum()),
                "issue_count": int(len(table_issues)),
                "critical_issue_count": int((table_issues["severity"] == "critical").sum()) if not table_issues.empty else 0,
                "warning_issue_count": int((table_issues["severity"] == "warning").sum()) if not table_issues.empty else 0,
                "info_issue_count": int((table_issues["severity"] == "info").sum()) if not table_issues.empty else 0,
            }
        )
    return pd.DataFrame(rows).sort_values("table_name")


def write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def empty_series(df: pd.DataFrame) -> pd.Series:
    return pd.Series([pd.NA] * len(df), index=df.index)


def field(df: pd.DataFrame, *candidates: str) -> pd.Series:
    for col in candidates:
        if col in df.columns:
            return df[col]
    return empty_series(df)


def iso_date(series: pd.Series) -> pd.Series:
    parsed = pd.to_datetime(series, errors="coerce")
    return parsed.dt.date.astype("string").where(parsed.notna(), pd.NA)


def year_from(series: pd.Series) -> pd.Series:
    parsed = pd.to_datetime(series, errors="coerce")
    return parsed.dt.year.astype("Int64")


def num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def hash_value(value: Any, prefix: str) -> Any:
    if pd.isna(value):
        return pd.NA
    digest = hashlib.sha256(f"{prefix}|{value}".encode("utf-8")).hexdigest()[:24]
    return f"{prefix}_{digest}"


def hash_series(series: pd.Series, prefix: str) -> pd.Series:
    return series.map(lambda value: hash_value(value, prefix))


def reporting_base(df: pd.DataFrame, record_prefix: str, event_date: pd.Series) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "record_id": record_prefix + "_" + df["row_id"].astype(str),
            "source_row_id": df["row_id"],
            "source_file": df["source_file"],
            "source_sheet": df["source_sheet"],
            "source_row_number": df["source_row_number"],
            "year": year_from(event_date),
            "data_confidence_score": df["data_confidence_score"],
            "data_confidence_marker": df["data_confidence_marker"],
            "data_quality_issue_count": df["data_quality_issue_count"],
            "data_quality_highest_severity": df["data_quality_highest_severity"],
        }
    )


def add_reporting_metadata(df: pd.DataFrame, domain: str, grain: str) -> pd.DataFrame:
    df.insert(0, "domain", domain)
    df.insert(1, "grain", grain)
    return df


def build_tb_patient_journey(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "form_date_du_dpistage_mobile")
    out = reporting_base(df, "tb", event_date)
    out["screening_date"] = iso_date(event_date)
    out["result_date"] = iso_date(field(df, "form_date_du_rsultat_clinique_etou_bascillioscopie"))
    out["treatment_start_date"] = iso_date(field(df, "form_date_de_prise_de_medicament"))
    out["c2_exam_date"] = iso_date(field(df, "form_date_d_examen_c2"))
    out["c5_control_date"] = iso_date(field(df, "form_date_controle_c5"))
    out["end_treatment_control_date"] = iso_date(field(df, "form_date_du_jour_fin_de_traitement"))
    out["final_treatment_date"] = iso_date(field(df, "form_date_du_fin_de_traitement"))
    out["region"] = field(df, "form_region")
    out["district"] = field(df, "form_district")
    out["diagnostic_center"] = field(df, "form_centre_de_diagnostic_de_traitement")
    out["treatment_center"] = field(df, "form_centre_de_traitement")
    out["reference_type"] = field(df, "form_reference")
    out["community_agent"] = field(df, "form_ac")
    out["fokontany"] = field(df, "form_fokontany")
    out["patient_key"] = hash_series(field(df, "form_case_case_id"), "patient")
    out["sex"] = field(df, "form_sexe")
    out["age"] = num(field(df, "form_age"))
    out["category"] = field(df, "form_categorie")
    out["weight_kg_screening"] = num(field(df, "form_poids_du_patient"))
    out["height_m"] = num(field(df, "form_taille_du_patient"))
    out["bmi"] = num(field(df, "form_imc"))
    out["screening_result"] = field(df, "form_resultats_d_examens_clinique_et_ou_bascilliscopie")
    out["test_proof"] = field(df, "form_preuve")
    out["tb_form"] = field(df, "form_forme")
    out["hiv_coinfection_test_status"] = field(df, "form_test_coinfection_tb_vih")
    out["hiv_result_initial"] = field(df, "form_resultat_test_vih")
    out["hiv_test_date"] = iso_date(field(df, "form_date_test_vih"))
    out["hiv_result_followup"] = field(df, "form_resultat_vih")
    out["hiv_treatment_started"] = field(df, "form_mise_en_traitement_vih")
    out["genexpert_analysis_date"] = iso_date(field(df, "form_date_analyse_genexpert"))
    out["rif_resistance"] = field(df, "form_rif_resistance")
    out["genexpert_result"] = field(df, "form_resultat_quantitatif_gx")
    out["treatment_realized"] = field(df, "form_realisation_traitement")
    out["c2_treatment_realized"] = field(df, "form_realisation_traitement_c2")
    out["c2_result"] = field(df, "form_resultat_dexamens_de_suivi_c2_c3")
    out["c2_visit_finality"] = field(df, "form_finalite_de_la_visite_c2")
    out["c5_treatment_realized"] = field(df, "form_realisation_traitement_c5")
    out["c5_result"] = field(df, "form_resultat_c5")
    out["c5_visit_finality"] = field(df, "form_finalite_du_contrle_c5")
    out["end_control_finality"] = field(df, "form_finalit_du_contrle_fin_de_traitement")
    out["end_exam_result"] = field(df, "form_resultat_fin_de_traitement")
    out["final_outcome"] = field(df, "finalite", "form_resultats_du_traitement")
    out["children_under_5_chemoprophylaxis"] = num(field(df, "sous_traitement_chimio0_5"))
    out["children_5_14_chemoprophylaxis"] = num(field(df, "sous_traitement_chimio5_14"))
    return add_reporting_metadata(out, "tb", "patient_journey")


def build_mchp_patient_support(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "form_id2_date")
    out = reporting_base(df, "mchp", event_date)
    out["inclusion_date"] = iso_date(event_date)
    out["discharge_date"] = iso_date(field(df, "date_de_sortie", "form_date_de_sortie"))
    out["patient_key"] = hash_series(field(df, "form_case_case_id", "form_id2_preinclusion_id"), "patient")
    out["consent"] = field(df, "form_id2_consent")
    out["beneficiary_program"] = field(df, "form_id2_beneficiary")
    out["site"] = field(df, "form_id2_site")
    out["agent"] = field(df, "form_id2_agent")
    out["region"] = field(df, "form_id2_region")
    out["district"] = field(df, "form_id2_district")
    out["commune"] = field(df, "form_id2_commune")
    out["fokontany"] = field(df, "form_id2_fokontany")
    out["sex"] = field(df, "form_id2_sexe")
    out["age"] = num(field(df, "form_id2_age", "age"))
    out["age_band"] = field(df, "tranche_age")
    out["profession"] = field(df, "form_id2_profession")
    out["marital_status"] = field(df, "form_id2_statut_matrimonial")
    out["support_category_raw"] = field(df, "form_id2_categorie")
    out["support_category"] = field(df, "form_id2_categorie2")
    out["consultation_or_hospitalization_reason"] = field(df, "form_id2_motif_consultation_ou_hospitalisation")
    out["household_size"] = num(field(df, "form_em_nb_menage"))
    out["vulnerability_total"] = num(field(df, "form_em_total"))
    out["vulnerability_score"] = num(field(df, "form_em_score"))
    out["patient_integration_status"] = field(df, "form_contact_fokontany_integration_du_patient")
    out["diagnostic"] = field(df, "diagnostic")
    out["treatment_type"] = field(df, "traitement")
    out["surgical_intervention"] = field(df, "intervention_si_chirurgical")
    out["transfusion"] = field(df, "transfusion")
    out["clinical_evolution"] = field(df, "evolution", "form_evolution")
    out["patient_referred_by"] = field(df, "patient_refere_par")
    out["invoice_amount"] = num(field(df, "form_montant_sur_le_facture"))
    out["patient_amount"] = num(field(df, "form_montant_patient"))
    out["dfm_amount"] = num(field(df, "form_montant_pay_par_dfm"))
    out["patient_payment_percentage"] = num(field(df, "pourcentage_payeparpatient", "form_pourcentage_du_montant_pay_par_le_patient"))
    out["dfm_payment_percentage"] = num(field(df, "pourcentage_payepardfm"))
    out["catastrophic_expense_avoided"] = field(df, "depense_catastrophique_evite")
    return add_reporting_metadata(out, "mchp", "patient_support")


def build_ambulance_trips(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "form_date_denregistrement")
    out = reporting_base(df, "amb", event_date)
    out["event_date"] = iso_date(event_date)
    out["site"] = field(df, "form_site")
    out["csb"] = field(df, "form_csb")
    out["destination_or_suite"] = field(df, "suite")
    out["patient_type"] = field(df, "type")
    out["cause"] = field(df, "cause_sortie")
    out["outcome"] = field(df, "issue")
    out["child_outcome"] = field(df, "issue_child")
    out["reference_hospital"] = field(df, "hopital_reference")
    out["distance_km"] = num(field(df, "distance"))
    out["duration_hours"] = num(field(df, "duree"))
    out["call_time"] = field(df, "heure_appel")
    out["departure_time"] = field(df, "heure_depart_bureau")
    out["arrival_time"] = field(df, "heure_arive_au_csb")
    out["call_to_departure_hours"] = num(field(df, "duree_appel_depart_bureau"))
    out["departure_to_arrival_hours"] = num(field(df, "depart_bureau_arrive_au_csb"))
    out["call_to_arrival_hours"] = num(field(df, "duree_appe_arrive_au_csb"))
    return add_reporting_metadata(out, "ambulance", "trip")


def build_ambulance_causes(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "date")
    out = reporting_base(df, "ambcause", event_date)
    out["event_date"] = iso_date(event_date)
    out["site"] = field(df, "form_site")
    out["patient_type"] = field(df, "type")
    out["cause"] = field(df, "variable")
    out["case_count"] = num(field(df, "value"))
    return add_reporting_metadata(out, "ambulance", "cause_count")


def build_community_workers(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "date_de_remplissage")
    out = reporting_base(df, "chw", event_date)
    out["record_date"] = iso_date(event_date)
    out["worker_id"] = field(df, "id_ac")
    out["case_id"] = field(df, "case_id")
    out["sex"] = field(df, "genre")
    out["age"] = num(field(df, "age"))
    out["role"] = field(df, "role")
    out["worker_category"] = field(df, "categorie_de_lac")
    out["region"] = field(df, "region")
    out["district"] = field(df, "district")
    out["commune"] = field(df, "commune")
    out["fokontany"] = field(df, "fokontany")
    out["zone_type"] = field(df, "type_de_zone_couvertes")
    out["attached_csb"] = field(df, "csb_de_rattachement")
    out["start_date"] = iso_date(field(df, "date_debut_ac"))
    out["current_status"] = field(df, "statut_actuel")
    out["inactive_reason"] = field(df, "non_actif_raison")
    out["has_training"] = field(df, "formation")
    out["training_list"] = field(df, "formation_list")
    out["has_materials"] = field(df, "matriels_ac")
    out["materials_list"] = field(df, "matriels_ac_list")
    out["has_financial_support"] = field(df, "appui_financiers")
    out["financial_support_list"] = field(df, "appui_financiers_list")
    out["reports_monthly_rma"] = field(df, "rapport_mensuel_rma")
    out["meeting_participation"] = field(df, "participation_aux_regroupement_runions")
    out["has_bicycle"] = field(df, "possede_bicyclette")
    out["transport_mode"] = field(df, "moyen_de_dplacement")
    out["distant_hamlet_distance_km"] = num(field(df, "distance_hameau_eloigne"))
    out["home_visit_travel_duration_hours"] = num(field(df, "duree_deplacement_vad"))
    out["households_served"] = num(field(df, "nb_menage_servi"))
    out["recommended_by_csb"] = field(df, "ac_recommands_par_csbcdt")
    return add_reporting_metadata(out, "community", "worker")


def build_sensitization_activities(df: pd.DataFrame) -> pd.DataFrame:
    event_date = field(df, "form_question15_date_activity")
    out = reporting_base(df, "sens", event_date)
    out["activity_date"] = iso_date(event_date)
    out["activity_uid"] = field(df, "form_question15_uid_sensibilisation")
    out["project"] = field(df, "form_identifiant1_project")
    out["region"] = field(df, "form_identifiant1_region")
    out["district"] = field(df, "form_identifiant1_district")
    out["commune"] = field(df, "form_identifiant1_commune", "commune")
    out["fokontany"] = field(df, "form_identifiant1_fokontany")
    out["site"] = field(df, "site")
    out["gps"] = field(df, "form_identifiant1_coordonne_gps")
    out["start_time"] = field(df, "form_question15_start_time")
    out["end_time"] = field(df, "form_question15_end_time")
    out["staff_responsible"] = field(df, "form_question15_staff_responsible")
    out["location_type"] = field(df, "form_activite_de_sensibilisation_location_type")
    out["csb_location_name"] = field(df, "form_activite_de_sensibilisation_location_name_csb")
    out["location_name"] = field(df, "form_activite_de_sensibilisation_location_name")
    out["sensitization_type"] = field(df, "form_activite_de_sensibilisation_type_de_sensibilisation")
    out["materials_used"] = field(df, "form_question16_materials_used")
    out["primary_theme_mchp_sm"] = field(df, "form_question16_primary_theme_mchp_primary_theme_mchp_sm")
    out["primary_theme_mchp_si"] = field(df, "form_question16_primary_theme_mchp_primary_theme_mchp_si")
    out["primary_theme_tb"] = field(df, "form_question16_primary_theme_tb", "form_question16_primary_theme_miraytb")
    out["primary_theme_mafy"] = field(df, "form_question16_primary_theme_mafy")
    out["key_messages"] = field(df, "form_question16_key_messages")
    out["children_under_5"] = num(field(df, "form_participant_children_under_5"))
    out["children_5_to_18"] = num(field(df, "form_participant_children_5_to_18"))
    out["adults_over_18"] = num(field(df, "form_participant_over_18_years"))
    out["men_count"] = num(field(df, "form_participant_men_count"))
    out["women_count"] = num(field(df, "form_participant_women_count"))
    out["total_participants"] = num(field(df, "form_participant_total_participants"))
    out["participant_type"] = field(df, "form_participant_type_de_participant")
    out["referrals_made"] = num(field(df, "form_question_commune_et_personnes_referees_aux_centre_de_sante_referrals_made"))
    out["month"] = field(df, "mois")
    out["quarter"] = field(df, "trim")
    out["period"] = field(df, "periode")
    return add_reporting_metadata(out, "community", "sensitization_activity")


def build_reporting_tables(cleaned_tables: dict[str, pd.DataFrame], output_dir: Path) -> dict[str, pd.DataFrame]:
    builders = {
        "donnees_export_sheet1": ("tb_patient_journey", build_tb_patient_journey),
        "sens_mchp_sheet1": ("mchp_patient_support", build_mchp_patient_support),
        "amb_mchp_ambulance": ("ambulance_trips", build_ambulance_trips),
        "amb_mchp_ambulance_cause_sortie": ("ambulance_causes", build_ambulance_causes),
        "data_profess_sheet1": ("community_workers", build_community_workers),
        "sensibilisation_staffdfm_mafy_sensibilisation_staffdfm": ("sensitization_activities", build_sensitization_activities),
    }
    reporting_tables: dict[str, pd.DataFrame] = {}
    reporting_dir = output_dir / "reporting"
    for source_table, (reporting_name, builder) in builders.items():
        if source_table not in cleaned_tables:
            continue
        reporting = builder(cleaned_tables[source_table])
        write_csv(reporting, reporting_dir / f"{reporting_name}.csv")
        reporting_tables[reporting_name] = reporting

    if reporting_tables:
        catalog = pd.DataFrame(
            [
                {
                    "reporting_table": name,
                    "rows": len(df),
                    "columns": len(df.columns),
                    "domain": df["domain"].iloc[0],
                    "grain": df["grain"].iloc[0],
                }
                for name, df in sorted(reporting_tables.items())
            ]
        )
        write_csv(catalog, reporting_dir / "reporting_catalog.csv")
    return reporting_tables


def run(input_dir: Path, output_dir: Path) -> None:
    cleaned_dir = output_dir / "cleaned"
    private_dir = output_dir / "private"
    quality_dir = output_dir / "quality"
    manifest: dict[str, Any] = {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "input_dir": str(input_dir.resolve()),
        "output_dir": str(output_dir.resolve()),
        "tables": [],
        "notes": [
            "Raw Excel files are not modified.",
            "Direct identifiers are moved into private/*.csv and removed from cleaned/*.csv.",
            "Confidence markers indicate validation and consistency confidence, not factual proof.",
        ],
    }

    cleaned_tables: dict[str, pd.DataFrame] = {}
    issue_frames: list[pd.DataFrame] = []

    files = sorted(input_dir.glob("*.xlsx"))
    if not files:
        raise FileNotFoundError(f"No .xlsx files found in {input_dir}")

    for path in files:
        workbook = pd.ExcelFile(path)
        for sheet_name in workbook.sheet_names:
            raw = pd.read_excel(path, sheet_name=sheet_name)
            raw.columns = [normalize_col(col) for col in raw.columns]
            table_name = table_name_for(path, sheet_name)
            cleaned, issues = validate_table(raw, table_name, path.name, sheet_name)
            public, private = split_private_columns(cleaned)

            write_csv(public, cleaned_dir / f"{table_name}.csv")
            if not private.empty and len(private.columns) > 1:
                write_csv(private, private_dir / f"{table_name}_private_identifiers.csv")
            if not issues.empty:
                issue_frames.append(issues)

            cleaned_tables[table_name] = public
            manifest["tables"].append(
                {
                    "table_name": table_name,
                    "source_file": path.name,
                    "source_sheet": sheet_name,
                    "rows": len(public),
                    "columns": len(public.columns),
                    "private_columns_moved": [c for c in cleaned.columns if is_pii_column(c)],
                }
            )

    all_issues = pd.concat(issue_frames, ignore_index=True) if issue_frames else pd.DataFrame(
        columns=[field.name for field in Issue.__dataclass_fields__.values()]
    )
    write_csv(all_issues, quality_dir / "data_quality_issues.csv")
    write_csv(summarize_tables(cleaned_tables, all_issues), quality_dir / "validation_summary.csv")
    reporting_tables = build_reporting_tables(cleaned_tables, output_dir)
    manifest["reporting_tables"] = [
        {
            "table_name": name,
            "rows": len(table),
            "columns": len(table.columns),
            "domain": table["domain"].iloc[0] if len(table) else None,
            "grain": table["grain"].iloc[0] if len(table) else None,
        }
        for name, table in sorted(reporting_tables.items())
    ]

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Clean Excel exports and assign confidence markers.")
    parser.add_argument("--input-dir", type=Path, default=Path("dataset"), help="Directory containing source .xlsx files.")
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/cleaned_data"), help="Directory for cleaned outputs.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(args.input_dir, args.output_dir)