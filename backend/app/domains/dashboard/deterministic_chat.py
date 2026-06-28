"""Data-aware chat fallback for demos and no-key deployments.

This keeps the assistant useful when the LLM is unavailable. It never invents
numbers; it only uses the deterministic analytics helpers that also power the
dashboard.
"""

from typing import Any

from app.domains.dashboard import analytics
from app.domains.dashboard.schemas import Bilingual, ChatRequest, ChatResponse, Section


def fallback_response(
    project_id: str,
    req: ChatRequest,
    *,
    generated_by: str = "deterministic-fallback",
) -> ChatResponse:
    message = req.message.lower()
    summary = _safe_dict(lambda: analytics.data_summary(project_id))
    facts = _safe_dict(lambda: analytics.project_facts(project_id))
    kpis = _safe_list(lambda: analytics.auto_kpis(project_id))
    trend = _safe_list(lambda: analytics.monthly_trend(project_id))
    sites = _safe_list(lambda: analytics.site_breakdown(project_id))

    sections: list[Section] = []
    if _wants_trend(message) and trend:
        sections.append(_trend_section(trend))
    if _wants_sites(message) and sites:
        sections.append(_site_section(sites))

    if not summary.get("n_records"):
        reply = Bilingual(
            fr=(
                f"Je peux joindre le backend, mais je ne trouve pas encore de "
                f"donnees lisibles pour le projet `{project_id}`."
            ),
            en=(
                f"I can reach the backend, but I cannot find readable data yet "
                f"for project `{project_id}`."
            ),
        )
    elif _wants_files(message):
        reply = _files_reply(summary, facts)
    elif _wants_quality(message):
        reply = _quality_reply(summary, kpis)
    elif _wants_sites(message):
        reply = _sites_reply(summary, sites)
    elif _wants_trend(message):
        reply = _trend_reply(summary, trend)
    else:
        reply = _general_reply(summary, facts, kpis)

    clear = _wants_focus(message) and bool(sections)
    return ChatResponse(
        reply=reply,
        clear=clear,
        add_charts=sections,
        add_kpis=[],
        remove_ids=[],
        generated_by=generated_by,
    )


def stream_events(response: ChatResponse, language: str = "fr") -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    text = response.reply.en if language == "en" else response.reply.fr
    text = text or response.reply.fr or response.reply.en
    for token in _tokens(text):
        events.append({"type": "token", "text": token})
    if response.clear:
        events.append({"type": "op", "op": {"kind": "clear"}})
    for section in response.add_charts:
        events.append({"type": "op", "op": {"kind": "add_chart", "section": section.model_dump()}})
    for kpi in response.add_kpis:
        events.append({"type": "op", "op": {"kind": "add_kpi", "kpi": kpi.model_dump()}})
    for widget_id in response.remove_ids:
        events.append({"type": "op", "op": {"kind": "remove", "id": widget_id}})
    events.append({"type": "done"})
    return events


def _safe_dict(fn) -> dict:
    try:
        value = fn()
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def _safe_list(fn) -> list:
    try:
        value = fn()
        return value if isinstance(value, list) else []
    except Exception:
        return []


def _tokens(text: str) -> list[str]:
    parts = text.split(" ")
    return [part + (" " if index < len(parts) - 1 else "") for index, part in enumerate(parts)]


def _wants_files(message: str) -> bool:
    return any(word in message for word in ("file", "fichier", "dataset", "source", "export"))


def _wants_quality(message: str) -> bool:
    return any(
        word in message
        for word in ("quality", "qualite", "missing", "manquant", "gap", "alert", "erreur")
    )


def _wants_sites(message: str) -> bool:
    return any(word in message for word in ("site", "csb", "facility", "zone", "area", "district"))


def _wants_trend(message: str) -> bool:
    return any(
        word in message
        for word in (
            "trend",
            "month",
            "monthly",
            "change",
            "changed",
            "last month",
            "tendance",
            "mois",
            "mensuel",
            "evolution",
            "evolue",
            "echographie",
            "ultrasound",
        )
    )


def _wants_focus(message: str) -> bool:
    return any(word in message for word in ("focus", "concentre", "only", "seulement", "generate"))


def _general_reply(summary: dict, facts: dict, kpis: list) -> Bilingual:
    n_records = _fmt(summary.get("n_records", 0))
    n_files = _fmt(facts.get("n_files", 0))
    datasets = _dataset_names(summary)
    quality = _kpi_value(kpis, "Priority alerts", "Alertes prioritaires")
    fr = (
        f"Ce projet contient {n_records} enregistrement(s) dans {n_files} fichier(s). "
        f"Les jeux de donnees les plus visibles sont: {datasets}. "
        f"Point d'attention actuel: {quality} alerte(s) prioritaire(s). "
        "Je peux aussi afficher une tendance mensuelle, une comparaison par site, "
        "ou les principaux points de qualite."
    )
    en = (
        f"This project contains {n_records} record(s) across {n_files} file(s). "
        f"The most visible datasets are: {datasets}. "
        f"Current watch point: {quality} priority alert(s). "
        "I can also show a monthly trend, a site comparison, or the main quality checks."
    )
    return Bilingual(fr=fr, en=en)


def _files_reply(summary: dict, facts: dict) -> Bilingual:
    files = facts.get("files", {})
    rows = _fmt(summary.get("n_records", 0))
    file_bits = []
    for name, sheets in list(files.items())[:4]:
        sheet_count = len(sheets) if isinstance(sheets, list) else 0
        file_bits.append(f"{name} ({sheet_count} sheet(s))")
    listed = "; ".join(file_bits) if file_bits else "aucun fichier lisible"
    fr = f"Je vois {len(files)} fichier(s) pour ce projet, avec {rows} lignes lues au total: {listed}."
    en = f"I see {len(files)} file(s) for this project, with {rows} total rows read: {listed}."
    return Bilingual(fr=fr, en=en)


def _quality_reply(summary: dict, kpis: list) -> Bilingual:
    completeness = _kpi_value(kpis, "Estimated coverage", "Couverture estimee")
    gaps = _kpi_value(kpis, "Gaps to explore", "Ecarts a explorer")
    alerts = _kpi_value(kpis, "Priority alerts", "Alertes prioritaires")
    rows = _fmt(summary.get("n_records", 0))
    fr = (
        f"Sur {rows} enregistrement(s), la completude estimee est {completeness}. "
        f"Je vois {gaps} ligne(s) avec valeurs manquantes dans la feuille principale "
        f"et {alerts} champ(s) tres incomplet(s) a verifier avant reporting."
    )
    en = (
        f"Across {rows} record(s), estimated completeness is {completeness}. "
        f"I see {gaps} row(s) with missing values in the main sheet and {alerts} "
        f"highly incomplete field(s) to review before reporting."
    )
    return Bilingual(fr=fr, en=en)


def _sites_reply(summary: dict, sites: list) -> Bilingual:
    if not sites:
        return Bilingual(
            fr="Je n'ai pas trouve de colonne site/CSB assez fiable pour comparer les lieux.",
            en="I did not find a reliable site/facility column to compare locations.",
        )
    top = sites[0]
    rows = _fmt(summary.get("n_records", 0))
    fr = (
        f"Pour {rows} enregistrement(s), le site le plus visible est "
        f"{top.get('site')} avec {_fmt(top.get('value', 0))} activite(s). "
        "J'ai ajoute une comparaison par site au tableau de bord."
    )
    en = (
        f"Across {rows} record(s), the most visible site is {top.get('site')} "
        f"with {_fmt(top.get('value', 0))} activity record(s). "
        "I added a site comparison to the dashboard."
    )
    return Bilingual(fr=fr, en=en)


def _trend_reply(summary: dict, trend: list) -> Bilingual:
    if not trend:
        return Bilingual(
            fr="Je n'ai pas trouve de colonne mois assez fiable pour calculer une tendance mensuelle.",
            en="I did not find a reliable month column to calculate a monthly trend.",
        )
    last = trend[-1]
    previous = trend[-2] if len(trend) > 1 else None
    rows = _fmt(summary.get("n_records", 0))
    if previous:
        delta = int(last.get("services", 0)) - int(previous.get("services", 0))
        direction_fr = "hausse" if delta >= 0 else "baisse"
        direction_en = "increase" if delta >= 0 else "decrease"
        fr = (
            f"Sur {rows} enregistrement(s), le dernier mois disponible est "
            f"{last.get('month')} avec {_fmt(last.get('services', 0))} activite(s), "
            f"soit une {direction_fr} de {_fmt(abs(delta))} vs {previous.get('month')}. "
            "J'ai ajoute la tendance mensuelle au tableau de bord."
        )
        en = (
            f"Across {rows} record(s), the latest available month is {last.get('month')} "
            f"with {_fmt(last.get('services', 0))} activity record(s), a {direction_en} "
            f"of {_fmt(abs(delta))} vs {previous.get('month')}. "
            "I added the monthly trend to the dashboard."
        )
        return Bilingual(fr=fr, en=en)
    return Bilingual(
        fr=f"Je vois {last.get('month')} avec {_fmt(last.get('services', 0))} activite(s).",
        en=f"I see {last.get('month')} with {_fmt(last.get('services', 0))} activity record(s).",
    )


def _trend_section(trend: list) -> Section:
    return Section(
        id="fallback-monthly-trend",
        tone="emerald",
        type="line",
        title=Bilingual(fr="Tendance mensuelle", en="Monthly trend"),
        insight=Bilingual(
            fr="Tendance calculee depuis la meilleure colonne mois disponible.",
            en="Trend calculated from the best available month column.",
        ),
        data=[{"label": str(p.get("month")), "value": int(p.get("services", 0))} for p in trend],
    )


def _site_section(sites: list) -> Section:
    return Section(
        id="fallback-site-comparison",
        tone="cyan",
        type="bar",
        title=Bilingual(fr="Comparaison par site", en="Site comparison"),
        insight=Bilingual(
            fr="Volume par site/CSB a verifier avec les contraintes d'acces et la periode.",
            en="Volume by site/facility to review with access constraints and period.",
        ),
        data=[
            {"label": str(p.get("site")), "value": int(p.get("value", 0))}
            for p in sites[:8]
        ],
    )


def _dataset_names(summary: dict) -> str:
    datasets = summary.get("datasets") or []
    names = [str(d.get("name") or d.get("file")) for d in datasets[:4] if isinstance(d, dict)]
    return ", ".join(names) if names else "donnees projet"


def _kpi_value(kpis: list, en_hint: str, fr_hint: str) -> str:
    for kpi in kpis:
        label = kpi.get("label", {}) if isinstance(kpi, dict) else {}
        if label.get("en") == en_hint or label.get("fr") == fr_hint:
            return str(kpi.get("value", "0"))
    return "0"


def _fmt(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)
    if number.is_integer():
        return f"{int(number):,}"
    return f"{number:,.1f}"
