-- Migration: Update existing labor entries with work_center and sequence_number
-- Date: 2025-11-19
-- This script extracts work center from description and finds matching process steps

-- First, update work_center from description field (format: "WORK_CENTER - OPERATOR")
UPDATE labor_entries
SET work_center = TRIM(SPLIT_PART(description, ' - ', 1))
WHERE work_center IS NULL AND description IS NOT NULL AND description LIKE '%-%';

-- Update sequence_number by matching work center with process steps
-- This uses a case-insensitive match and handles common variations
UPDATE labor_entries le
SET
    sequence_number = ps.step_number,
    step_id = ps.id
FROM process_steps ps
WHERE
    le.traveler_id = ps.traveler_id
    AND le.sequence_number IS NULL
    AND le.work_center IS NOT NULL
    AND (
        -- Exact match (case-insensitive)
        UPPER(REPLACE(le.work_center, '_', ' ')) = UPPER(ps.operation)
        OR UPPER(REPLACE(le.work_center, ' ', '_')) = UPPER(REPLACE(ps.operation, ' ', '_'))
        OR UPPER(le.work_center) = UPPER(ps.operation)
        -- Handle common variations
        OR (UPPER(le.work_center) = 'AUTO_INSERTION' AND UPPER(ps.operation) = 'AUTO INSERT')
        OR (UPPER(le.work_center) = 'AUTO INSERT' AND UPPER(ps.operation) = 'AUTO_INSERTION')
        OR (UPPER(le.work_center) = 'E-TEST' AND UPPER(ps.operation) = 'ETEST')
        OR (UPPER(le.work_center) = 'ETEST' AND UPPER(ps.operation) = 'E-TEST')
        OR (UPPER(le.work_center) = 'MAKE_BOM' AND UPPER(ps.operation) = 'MAKE BOM')
        OR (UPPER(le.work_center) = 'MAKE BOM' AND UPPER(ps.operation) = 'MAKE_BOM')
    );

-- Display update results
SELECT
    COUNT(*) as total_entries,
    COUNT(sequence_number) as entries_with_sequence,
    COUNT(*) - COUNT(sequence_number) as entries_without_sequence
FROM labor_entries;
