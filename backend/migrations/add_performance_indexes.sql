-- Performance indexes for dashboard queries
-- Run this script to improve dashboard query performance

-- Index on labor_entries.created_at for date range queries
CREATE INDEX IF NOT EXISTS idx_labor_entries_created_at ON labor_entries(created_at);

-- Index on travelers.created_at for date range queries
CREATE INDEX IF NOT EXISTS idx_travelers_created_at ON travelers(created_at);

-- Index on travelers.status for status filtering
CREATE INDEX IF NOT EXISTS idx_travelers_status ON travelers(status);

-- Index on travelers.completed_at for completion time calculations
CREATE INDEX IF NOT EXISTS idx_travelers_completed_at ON travelers(completed_at);

-- Index on notifications.created_at for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Index on notifications.is_read for unread notification filtering
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Index on labor_entries.work_center for work center aggregation
CREATE INDEX IF NOT EXISTS idx_labor_entries_work_center ON labor_entries(work_center);

-- Index on labor_entries.employee_id for employee performance queries
CREATE INDEX IF NOT EXISTS idx_labor_entries_employee_id ON labor_entries(employee_id);

-- Index on traveler_time_entries.end_time for active tracking queries
CREATE INDEX IF NOT EXISTS idx_traveler_time_entries_end_time ON traveler_time_entries(end_time);

-- Index on labor_entries.is_completed for active labor filtering
CREATE INDEX IF NOT EXISTS idx_labor_entries_is_completed ON labor_entries(is_completed);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_travelers_status_created_at ON travelers(status, created_at);
CREATE INDEX IF NOT EXISTS idx_labor_entries_created_work ON labor_entries(created_at, work_center);

-- Index on approvals.status for pending approval counting
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Index on travelers.is_active for filtering active travelers
CREATE INDEX IF NOT EXISTS idx_travelers_is_active ON travelers(is_active);

-- Update statistics for query planner
ANALYZE travelers;
ANALYZE labor_entries;
ANALYZE traveler_time_entries;
ANALYZE notifications;
ANALYZE approvals;
