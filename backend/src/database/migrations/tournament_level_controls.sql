-- Add new columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS rebuy_max_level INTEGER,
ADD COLUMN IF NOT EXISTS max_stack_for_single_rebuy INTEGER,
ADD COLUMN IF NOT EXISTS addon_break_level INTEGER,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_blind_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_break BOOLEAN DEFAULT false,
ADD CONSTRAINT check_addon_after_rebuy CHECK (addon_break_level >= rebuy_max_level);

-- Add new columns to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS stack_at_rebuy INTEGER,
ADD COLUMN IF NOT EXISTS eliminated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS elimination_level INTEGER,
ADD COLUMN IF NOT EXISTS last_rebuy_level INTEGER; 