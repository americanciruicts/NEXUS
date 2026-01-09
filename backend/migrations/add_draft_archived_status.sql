-- Migration: Add DRAFT and ARCHIVED status to TravelerStatus enum
-- Date: 2026-01-05

-- Add new enum values to the travelerstatus type
ALTER TYPE travelerstatus ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE travelerstatus ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Note: PostgreSQL doesn't allow removing enum values or reordering them
-- The new values DRAFT and ARCHIVED are added at the end
-- If you need DRAFT to be first, you would need to recreate the enum type

-- Optional: Update any existing travelers if needed
-- UPDATE travelers SET status = 'DRAFT' WHERE status = 'CREATED' AND some_condition;
