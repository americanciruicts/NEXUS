-- Migration: Add pause_time and sequence_number to labor_entries
-- Date: 2025-11-19

-- Add new columns to labor_entries table
ALTER TABLE labor_entries ADD COLUMN IF NOT EXISTS pause_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE labor_entries ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN labor_entries.pause_time IS 'Time when labor entry was paused';
COMMENT ON COLUMN labor_entries.sequence_number IS 'Sequence number from the process step';
