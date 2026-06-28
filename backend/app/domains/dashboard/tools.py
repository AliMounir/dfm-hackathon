"""LangChain tools for the dashboard composer agent (idiomatic ``@tool``).

Imported lazily by ``agent.py`` so the app/fallback run without LangChain.
"""

from langchain_core.tools import tool

from app.domains.dashboard import analytics, artifacts


@tool
def get_project_facts(project_id: str) -> dict:
    """Files, sheets, row counts, and column names per sheet for the project. Use
    this to learn what the data contains and which columns to reference in metric
    expressions."""
    return analytics.project_facts(project_id)


@tool
def compute(project_id: str, expression: str) -> dict:
    """Evaluate ONE pandas expression against the project's data and return a real
    scalar — use it to derive and VERIFY metric/quality-check values before
    finalising. Names available in the expression:
      - df      : the largest sheet (a pandas DataFrame)
      - sheet(name) : the dataframe whose file/sheet name contains `name`
                      e.g. sheet('ECHO'), sheet('CR_MCHP')
      - frames  : list of (file, sheet, dataframe)
      - pd      : pandas
    Examples:
      sheet('ECHO').shape[0]                         # rows in the ultrasound file
      sheet('ECHO')['form.patient_id'].nunique()     # unique beneficiaries
      round(df['form.complicated'].sum()/len(df)*100, 1)   # a percentage
      int(df.isna().any(axis=1).sum())               # rows with any missing value
    Returns {"value": <number/str>} or {"error": "..."}."""
    return analytics.compute(project_id, expression)


@tool
def list_artifacts(project_id: str) -> list:
    """List the data files (artifacts) uploaded to the database for this project
    — REDCap/DHIS2/Excel/CSV exports. Returns each file's id, filename, kind,
    size and status. Use read_artifact(artifact_id) to inspect one."""
    return artifacts.list_artifacts(project_id)


@tool
def read_artifact(artifact_id: str) -> dict:
    """Read one uploaded artifact by its id: returns its columns and a preview of
    the actual rows (for Excel/CSV) so you can ground answers in the real file."""
    return artifacts.read_artifact(artifact_id)


AGENT_TOOLS = [get_project_facts, compute]
# Tools the conversational assistant gets (can also read the uploaded files DB).
CHAT_TOOLS = [compute, list_artifacts, read_artifact]
