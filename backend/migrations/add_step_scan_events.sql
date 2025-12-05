-- Migration: Add step_scan_events table for tracking scan-in/scan-out at each step
-- This table tracks when workers scan QR codes to start and end work at specific steps

CREATE TABLE IF NOT EXISTS step_scan_events (
    id SERIAL PRIMARY KEY,
    traveler_id INTEGER NOT NULL REFERENCES travelers(id),
    step_id INTEGER NOT NULL,
    step_type VARCHAR(20) NOT NULL,  -- 'PROCESS' or 'MANUAL'
    job_number VARCHAR(50) NOT NULL,
    work_center VARCHAR(100) NOT NULL,
    scan_action VARCHAR(20) NOT NULL,  -- 'SCAN_IN' or 'SCAN_OUT'
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scanned_by INTEGER REFERENCES users(id),
    notes TEXT,
    duration_minutes FLOAT,  -- Calculated when scan_out happens

    CONSTRAINT valid_scan_action CHECK (scan_action IN ('SCAN_IN', 'SCAN_OUT')),
    CONSTRAINT valid_step_type CHECK (step_type IN ('PROCESS', 'MANUAL'))
);

-- Create indexes for better query performance
CREATE INDEX idx_step_scan_events_traveler_id ON step_scan_events(traveler_id);
CREATE INDEX idx_step_scan_events_job_number ON step_scan_events(job_number);
CREATE INDEX idx_step_scan_events_scanned_at ON step_scan_events(scanned_at);
CREATE INDEX idx_step_scan_events_step ON step_scan_events(step_id, step_type);
CREATE INDEX idx_step_scan_events_work_center ON step_scan_events(work_center);

COMMENT ON TABLE step_scan_events IS 'Tracks scan-in and scan-out events at each routing table step to measure time spent';
COMMENT ON COLUMN step_scan_events.step_id IS 'References either ProcessStep.id or ManualStep.id depending on step_type';
COMMENT ON COLUMN step_scan_events.scan_action IS 'SCAN_IN when starting work, SCAN_OUT when finishing work';
COMMENT ON COLUMN step_scan_events.duration_minutes IS 'Time spent between scan_in and scan_out, calculated automatically';
