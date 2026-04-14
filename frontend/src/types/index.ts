export type TravelerType = 'PCB_ASSEMBLY' | 'PCB' | 'CABLE' | 'PURCHASING' | 'RMA_SAME' | 'RMA_DIFF' | 'MODIFICATION';

export interface RmaUnitTracking {
  id?: number;
  unit_number: number;
  serial_number: string;
  customer_complaint: string;
  incoming_inspection_notes: string;
  disposition: string;
  troubleshooting_notes: string;
  repairing_notes: string;
  final_inspection_notes: string;
  // Additional fields for RMA_DIFF (per-unit original job info)
  customer_ncr?: string;
  original_po_number?: string;
  original_wo_number?: string;
  customer_revision_sent?: string;
  customer_revision_received?: string;
  original_built_quantity?: number;
  units_shipped?: number;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VIEWER';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isApprover: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkCenter {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Part {
  id: string;
  partNumber: string;
  description: string;
  revision: string;
  workCenter: string;
  isActive: boolean;
}

export interface ProcessStep {
  id: string;
  stepNumber: number;
  operation: string;
  workCenter: string;
  instructions: string;
  subSteps: SubStep[];
  estimatedTime?: number;
  isRequired: boolean;
}

export interface SubStep {
  id: string;
  stepNumber: string;
  description: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}

export interface ManualStep {
  id: string;
  description: string;
  addedBy: string;
  addedAt: Date;
}

export interface Traveler {
  id: string;
  jobNumber: string;
  workOrderNumber: string;
  travelerType: TravelerType;
  partNumber: string;
  partDescription: string;
  revision: string;
  availableRevisions: string[];
  quantity: number;
  customerCode: string;
  customerName: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  workCenter: string;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  processSteps: ProcessStep[];
  manualSteps: ManualStep[];
  laborHours: LaborEntry[];
  approvals: Approval[];
  auditLog: AuditEntry[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface LaborEntry {
  id: string;
  stepId: string;
  employeeId: string;
  employeeName: string;
  startTime: Date;
  endTime?: Date;
  hoursWorked: number;
  description: string;
  isCompleted: boolean;
}

export interface Approval {
  id: string;
  travelerId: string;
  requestedBy: string;
  requestedAt: Date;
  approverIds: string[];
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  requestType: 'EDIT' | 'COMPLETE' | 'CANCEL';
  requestDetails: string;
}

export interface AuditEntry {
  id: string;
  travelerId: string;
  userId: string;
  userName: string;
  action: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface WorkOrder {
  jobNumber: string;
  workOrderNumber: string;
  partNumber: string;
  partDescription: string;
  revision: string;
  quantity: number;
  customerCode: string;
  customerName: string;
  processSteps: Omit<ProcessStep, 'id'>[];
  workCenter: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

// ─── KOSH Jobs Types ─────────────────────────────────────────────────────────

export interface KoshJob {
  id: number;
  job_number: string;
  description: string;
  customer: string;
  cust_pn: string;
  build_qty: number;
  order_qty: number;
  job_rev: string;
  cust_rev: string;
  wo_number: string;
  status: string;
  notes: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface BomLine {
  line_no: string;
  aci_pn: string;
  description: string;
  mpn: string;
  manufacturer: string;
  qty_per_board: number;
  required: number;
  on_hand: number;
  mfg_floor_qty: number;
  shortage: number;
  location: string;
  unit_cost: number;
  pou: string;
}

export interface JobBomResponse {
  job_number: string;
  build_qty: number;
  order_qty: number;
  total_lines: number;
  shortage_count: number;
  lines: BomLine[];
}

export interface TravelerGroupMember {
  id: number;
  jobNumber: string;
  travelerType: string;
  groupSequence: number;
  groupLabel?: string;
  quantity: number;
  status: string;
  workOrderNumber?: string;
}

export interface TravelerGroupInfo {
  groupId: number;
  groupName?: string;
  currentSequence: number;
  totalCount: number;
  members: TravelerGroupMember[];
}

export interface JobTraveler {
  id: number;
  job_number: string;
  work_order_number: string;
  traveler_type: string;
  part_number: string;
  part_description: string;
  revision: string;
  quantity: number;
  status: string;
  priority: string;
  customer_name: string;
  created_by: string;
  created_at: string | null;
  total_steps: number;
  completed_steps: number;
  group_id?: number | null;
  group_sequence?: number | null;
  group_label?: string | null;
}

export interface JobProgress {
  job_number: string;
  order_qty: number;
  qty_manufactured: number;
  qty_in_progress: number;
  total_travelers: number;
  completed_travelers: number;
  in_progress_travelers: number;
  percent_complete: number;
}

export interface FormData {
  jobNumber: string;
  workOrderNumber: string;
  travelerType: TravelerType;
  partNumber: string;
  partDescription: string;
  revision: string;
  quantity: number;
  customerCode: string;
  customerName: string;
  workCenter: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  processSteps: ProcessStep[];
  manualSteps: ManualStep[];
  notes: string;
}