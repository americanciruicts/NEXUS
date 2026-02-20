from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models import TravelerType, TravelerStatus, Priority, ApprovalStatus

class SubStepBase(BaseModel):
    step_number: str
    description: str
    is_completed: bool = False
    notes: Optional[str] = None

class SubStepCreate(SubStepBase):
    pass

class SubStep(SubStepBase):
    id: int
    process_step_id: int
    completed_by: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProcessStepBase(BaseModel):
    step_number: int
    operation: str
    work_center_code: str
    instructions: str
    estimated_time: Optional[int] = Field(None, ge=0)
    is_required: bool = True
    quantity: Optional[int] = Field(None, ge=0)
    accepted: Optional[int] = Field(None, ge=0)
    rejected: Optional[int] = Field(None, ge=0)
    sign: Optional[str] = Field(None, max_length=50)
    completed_date: Optional[str] = Field(None, max_length=20)

class ProcessStepCreate(ProcessStepBase):
    sub_steps: List[SubStepCreate] = []

class ProcessStep(ProcessStepBase):
    id: int
    traveler_id: int
    is_completed: bool = False
    completed_by: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    sub_steps: List[SubStep] = []

    class Config:
        from_attributes = True

class ManualStepBase(BaseModel):
    description: str

class ManualStepCreate(ManualStepBase):
    pass

class ManualStep(ManualStepBase):
    id: int
    traveler_id: int
    added_by: int
    added_at: datetime

    class Config:
        from_attributes = True

class TravelerBase(BaseModel):
    job_number: str = Field(..., max_length=50)
    work_order_number: Optional[str] = Field(None, max_length=50)
    po_number: Optional[str] = Field(None, max_length=255)
    traveler_type: TravelerType
    part_number: str = Field(..., max_length=50)
    part_description: str = Field(..., max_length=200)
    revision: str = Field(..., max_length=20)
    customer_revision: Optional[str] = Field(None, max_length=50)
    quantity: int = Field(..., gt=0)
    customer_code: Optional[str] = Field(None, max_length=20)
    customer_name: Optional[str] = Field(None, max_length=100)
    priority: Priority = Priority.NORMAL
    work_center: str = Field(..., max_length=20)
    is_active: bool = True
    notes: Optional[str] = None
    specs: Optional[str] = None
    specs_date: Optional[str] = Field(None, max_length=20)
    from_stock: Optional[str] = Field(None, max_length=100)
    to_stock: Optional[str] = Field(None, max_length=100)
    ship_via: Optional[str] = Field(None, max_length=100)
    comments: Optional[str] = None
    start_date: Optional[str] = Field(None, max_length=20)
    due_date: Optional[str] = Field(None, max_length=20)
    ship_date: Optional[str] = Field(None, max_length=20)
    include_labor_hours: bool = False

class TravelerCreate(TravelerBase):
    status: Optional[TravelerStatus] = None
    process_steps: List[ProcessStepCreate] = []
    manual_steps: List[ManualStepCreate] = []

class TravelerUpdate(BaseModel):
    job_number: Optional[str] = Field(None, max_length=50)
    work_order_number: Optional[str] = Field(None, max_length=50)
    po_number: Optional[str] = Field(None, max_length=255)
    traveler_type: Optional[TravelerType] = None
    part_number: Optional[str] = Field(None, max_length=50)
    part_description: Optional[str] = Field(None, max_length=200)
    revision: Optional[str] = Field(None, max_length=20)
    customer_revision: Optional[str] = Field(None, max_length=50)
    quantity: Optional[int] = Field(None, gt=0)
    customer_code: Optional[str] = Field(None, max_length=20)
    customer_name: Optional[str] = Field(None, max_length=100)
    priority: Optional[Priority] = None
    work_center: Optional[str] = Field(None, max_length=20)
    status: Optional[TravelerStatus] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    specs: Optional[str] = None
    specs_date: Optional[str] = Field(None, max_length=20)
    from_stock: Optional[str] = Field(None, max_length=100)
    to_stock: Optional[str] = Field(None, max_length=100)
    ship_via: Optional[str] = Field(None, max_length=100)
    comments: Optional[str] = None
    start_date: Optional[str] = Field(None, max_length=20)
    due_date: Optional[str] = Field(None, max_length=20)
    ship_date: Optional[str] = Field(None, max_length=20)
    include_labor_hours: Optional[bool] = None

class Traveler(TravelerBase):
    id: int
    status: TravelerStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    process_steps: List[ProcessStep] = []
    manual_steps: List[ManualStep] = []

    class Config:
        from_attributes = True

class TravelerList(BaseModel):
    id: int
    job_number: str
    work_order_number: Optional[str]
    po_number: Optional[str] = None
    traveler_type: TravelerType
    part_number: str
    part_description: str
    revision: str  # Traveler Revision
    customer_revision: Optional[str] = None  # Customer Revision
    quantity: int
    customer_code: Optional[str] = None
    customer_name: Optional[str] = None
    priority: Priority
    status: TravelerStatus
    work_center: str
    is_active: bool = True
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    ship_date: Optional[str] = None
    created_at: datetime
    created_by: int

    class Config:
        from_attributes = True

class ApprovalBase(BaseModel):
    request_type: str = Field(..., pattern="^(EDIT|COMPLETE|CANCEL)$")
    request_details: str

class ApprovalCreate(ApprovalBase):
    traveler_id: int

class Approval(ApprovalBase):
    id: int
    traveler_id: int
    requested_by: int
    requested_at: datetime
    status: ApprovalStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejected_by: Optional[int] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True