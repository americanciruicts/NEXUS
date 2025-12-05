from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TrackingScanRequest(BaseModel):
    job_number: str = Field(..., description="The job number from the traveler barcode")
    scan_type: str = Field(..., description="Type of scan: 'HEADER' or 'WORK_CENTER'")
    work_center: Optional[str] = Field(None, description="Work center code (required for WORK_CENTER scan type)")
    step_sequence: Optional[int] = Field(None, description="Step sequence number")
    scanned_by: Optional[str] = Field(None, description="Username or employee ID of scanner")
    notes: Optional[str] = Field(None, description="Additional notes")

class TrackingLogResponse(BaseModel):
    id: int
    traveler_id: int
    job_number: str
    work_center: Optional[str]
    step_sequence: Optional[int]
    scan_type: str
    scanned_at: datetime
    scanned_by: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

class TrackingScanResponse(BaseModel):
    success: bool
    message: str
    log_id: Optional[int] = None
    traveler_id: Optional[int] = None
