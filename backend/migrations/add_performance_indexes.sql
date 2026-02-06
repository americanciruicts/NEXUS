-- Performance Optimization Indexes
-- Adds indexes to frequently queried fields for better query performance

-- Travelers table indexes
CREATE INDEX IF NOT EXISTS idx_travelers_job_number ON travelers(job_number);
CREATE INDEX IF NOT EXISTS idx_travelers_work_order ON travelers(work_order_number);
CREATE INDEX IF NOT EXISTS idx_travelers_status ON travelers(status);
CREATE INDEX IF NOT EXISTS idx_travelers_created_by ON travelers(created_by);
CREATE INDEX IF NOT EXISTS idx_travelers_created_at ON travelers(created_at DESC);

-- Labor entries indexes
CREATE INDEX IF NOT EXISTS idx_labor_entries_employee ON labor_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_traveler ON labor_entries(traveler_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_start_time ON labor_entries(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_labor_entries_completed ON labor_entries(is_completed);

-- Process steps indexes
CREATE INDEX IF NOT EXISTS idx_process_steps_traveler ON process_steps(traveler_id);
CREATE INDEX IF NOT EXISTS idx_process_steps_work_center ON process_steps(work_center_code);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_traveler ON audit_logs(traveler_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Tracking logs indexes
CREATE INDEX IF NOT EXISTS idx_tracking_logs_traveler ON traveler_tracking_logs(traveler_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_job ON traveler_tracking_logs(job_number);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_scanned ON traveler_tracking_logs(scanned_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_travelers_status_active ON travelers(status, is_active);
CREATE INDEX IF NOT EXISTS idx_labor_employee_completed ON labor_entries(employee_id, is_completed);

-- Comments explaining index choices
COMMENT ON INDEX idx_travelers_job_number IS 'Speeds up traveler searches by job number';
COMMENT ON INDEX idx_labor_entries_employee IS 'Optimizes labor entry queries by employee';
COMMENT ON INDEX idx_notifications_user IS 'Improves notification retrieval performance';
