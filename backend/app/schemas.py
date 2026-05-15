from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class JobCreateResponse(BaseModel):
    job_id: str
    status: str
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    filename: str
    rows_count: int = 0
    metrics: Dict[str, Any] = Field(default_factory=dict)
    preview_rows: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    csv_url: Optional[str] = None
    xlsx_url: Optional[str] = None
