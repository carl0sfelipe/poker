-- Add elimination_order column to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS elimination_order INTEGER;
