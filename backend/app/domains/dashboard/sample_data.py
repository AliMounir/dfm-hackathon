"""Structured sample data the dashboard tools read.

Mirrors the frontend ``src/lib/projects.ts`` so the agent has real structure to
reason over during the prototype.

TODO(DfM): replace this with real parsing of the project's exports under
``data/projects/<id>/`` (REDCap/DHIS2/Excel) or a shared data service, so the
frontend and backend draw from one source of truth.
"""


def _t(fr: str, en: str) -> dict:
    return {"fr": fr, "en": en}


_MCHP = {
    "name": "MCHP",
    "focus": _t(
        "Suivi des activités d'échographie, des cas compliqués et des parcours de soins maternels.",
        "Tracking ultrasound activity, complicated cases, and maternal care pathways.",
    ),
    "data_sources": ["REDCap", "Excel MCHP", "Dashboard DFM"],
    "status": _t("Données attachées", "Attached data"),
    "metrics": [
        {"id": "ultrasounds", "label": _t("Échographies réalisées", "Ultrasounds performed"),
         "value": "10,169", "helper": _t("période du tableau de bord", "dashboard report period"), "tone": "emerald"},
        {"id": "beneficiaries", "label": _t("Femmes enceintes bénéficiaires", "Pregnant women reached"),
         "value": "8,744", "helper": _t("bénéficiaires uniques", "unique beneficiaries"), "tone": "violet"},
        {"id": "first_scan", "label": _t("Première échographie", "First ultrasound"),
         "value": "6,949", "helper": _t("nouveaux contacts de grossesse", "new pregnancy contacts"), "tone": "cyan"},
        {"id": "complicated", "label": _t("Cas compliqués", "Complicated cases"),
         "value": "4.5%", "helper": _t("n = 390 à vérifier", "n = 390 to review"), "tone": "amber"},
    ],
    "monthly": [
        {"month": "Jan", "services": 1180, "risks": 42, "target": 1300},
        {"month": "Feb", "services": 1390, "risks": 48, "target": 1300},
        {"month": "Mar", "services": 1710, "risks": 57, "target": 1500},
        {"month": "Apr", "services": 1620, "risks": 69, "target": 1500},
        {"month": "May", "services": 1825, "risks": 91, "target": 1700},
        {"month": "Jun", "services": 2444, "risks": 83, "target": 1700},
    ],
    "sites": [
        {"site": "Manambaro", "value": 5604, "change": 8},
        {"site": "Ejeda", "value": 4565, "change": -4},
        {"site": "Behavandra", "value": 812, "change": 13},
        {"site": "Belafike", "value": 735, "change": -9},
    ],
    "quality_issues": [
        {"id": "missing-follow-up", "severity": "high", "count": 124,
         "title": _t("Suivis sans identifiant patient complet", "Follow-ups without complete patient identifier"),
         "why_it_matters": _t(
             "Le lien entre la première échographie et le suivi peut être perdu, ce qui fragilise l'analyse du parcours de soins.",
             "The link between first scan and follow-up may be lost, weakening care pathway analysis."),
         "action": _t("Vérifier les QR codes, les noms et les dates avant le rapport mensuel.",
                      "Review QR codes, names, and dates before the monthly report.")},
        {"id": "placeholder-values", "severity": "medium", "count": 318,
         "title": _t("Valeurs '---' dans des champs descriptifs", "'---' values in descriptive fields"),
         "why_it_matters": _t(
             "Ces valeurs peuvent cacher une information clinique manquante.",
             "These values can hide missing clinical detail."),
         "action": _t("Classer les champs où '---' est acceptable.", "Classify fields where '---' is acceptable.")},
    ],
    "insights": [
        {"id": "seasonal-access", "tag": _t("Risque saisonnier", "Seasonal risk"),
         "title": _t("Surveiller les baisses d'activité pendant les pluies", "Watch for activity drops during rainy periods"),
         "body": _t(
             "Si les consultations diminuent alors que les cas compliqués restent stables, cela peut indiquer un problème d'accès.",
             "If consultations fall while complicated cases stay stable, that may suggest access barriers.")},
    ],
    "story": _t(
        "Le projet MCHP montre une forte couverture d'échographies avec 8,744 femmes enceintes atteintes.",
        "The MCHP project shows strong ultrasound coverage with 8,744 pregnant women reached."),
    "suggested_questions": [
        _t("Quels CSB ont le plus de cas compliqués ce mois-ci ?", "Which facilities have the most complicated cases this month?"),
        _t("Quelles données dois-je corriger avant le rapport bailleur ?", "Which data should I correct before the donor report?"),
    ],
}


def _demo(name: str, focus: str, sources: list[str]) -> dict:
    """Generic demo project for ids without bespoke data yet."""
    return {
        "name": name,
        "focus": _t(focus, focus),
        "data_sources": sources,
        "status": _t("Structure prête", "Structure ready"),
        "metrics": [
            {"id": "activity", "label": _t("Activités enregistrées", "Recorded activities"),
             "value": "3,420", "helper": _t("données démo", "demo data"), "tone": "emerald"},
            {"id": "coverage", "label": _t("Couverture estimée", "Estimated coverage"),
             "value": "78%", "helper": _t("à valider", "to validate"), "tone": "cyan"},
            {"id": "gaps", "label": _t("Écarts à explorer", "Gaps to explore"),
             "value": "142", "helper": _t("lignes ou sites", "rows or sites"), "tone": "amber"},
        ],
        "monthly": [
            {"month": m, "services": s, "risks": r, "target": t}
            for m, s, r, t in [
                ("Jan", 520, 22, 600), ("Feb", 610, 26, 600), ("Mar", 700, 30, 660),
                ("Apr", 640, 34, 660), ("May", 760, 38, 720), ("Jun", 800, 35, 720),
            ]
        ],
        "sites": [
            {"site": "Manambaro", "value": 72, "change": 6},
            {"site": "Ejeda", "value": 64, "change": -5},
            {"site": "Ambovombe", "value": 58, "change": 3},
            {"site": "Tsihombe", "value": 51, "change": -8},
        ],
        "quality_issues": [
            {"id": "missing-values", "severity": "medium", "count": 24,
             "title": _t("Champs obligatoires manquants", "Missing required fields"),
             "why_it_matters": _t("Les indicateurs peuvent être sous-estimés.", "Indicators may be underestimated."),
             "action": _t("Compléter les champs critiques.", "Complete critical fields.")},
        ],
        "insights": [
            {"id": "gap", "tag": _t("Écart de service", "Service gap"),
             "title": _t("Identifier les zones sous la cible", "Identify areas below target"),
             "body": _t("Comparer volumes mensuels, cible et alertes qualité.", "Compare monthly volumes, target, and quality alerts.")},
        ],
        "story": _t(f"{name} peut transformer ses données en synthèses claires.",
                    f"{name} can turn its data into clear summaries."),
        "suggested_questions": [
            _t("Quels indicateurs ont changé depuis le mois dernier ?", "Which indicators changed since last month?"),
        ],
    }


PROJECTS: dict[str, dict] = {
    "mchp": _MCHP,
    "soameva": _demo("SOAMEVA", "Community coordination and referrals.", ["Indicateurs projet", "Exports terrain"]),
    "miray-tb-parsite": _demo("MIRAY TB PARSITE", "TB site-level analysis and cohort follow-up.", ["Cohortes TB", "DHIS2"]),
    "miray-tb-general": _demo("MIRAY TB GENERAL", "Overall TB screening and outcomes.", ["Cohortes TB", "DHIS2"]),
    "mafy": _demo("MAFY", "Community health monitoring.", ["Exports REDCap", "Indicateurs projet"]),
    "tia-longo": _demo("TIA LONGO", "Local indicators and activity monitoring.", ["Rapports projet", "Registres"]),
    "profess": _demo("PROFESS", "Service quality and supervision.", ["Supervision", "Rapports qualité"]),
}


def get_project_data(project_id: str) -> dict | None:
    return PROJECTS.get(project_id)
