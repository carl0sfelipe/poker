-- Add name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update existing users to use email as name
UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL; 