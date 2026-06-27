"""File schemas — uploaded M&E data exports (REDCap, DHIS2, Excel, CSV)."""

from app.shared.schemas import AppBaseModel


class DataFile(AppBaseModel):
    id: str
    project_id: str
    filename: str
    kind: str = "unknown"  # redcap | dhis2 | excel | csv | pdf | unknown
    size_bytes: int = 0
