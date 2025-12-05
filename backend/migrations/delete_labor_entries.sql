-- Migration: Delete all existing labor entries
-- Date: 2025-11-19
-- This will clear all labor tracking data to start fresh with new schema

DELETE FROM labor_entries;

-- Reset the sequence to start from 1
ALTER SEQUENCE labor_entries_id_seq RESTART WITH 1;
