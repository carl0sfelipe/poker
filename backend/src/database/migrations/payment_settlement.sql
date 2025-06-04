-- Add payment tracking columns to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS rebuys_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS addon_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';

-- Add check constraint to ensure payment_status is valid
ALTER TABLE registrations
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'eliminated'));

-- Create function to calculate total amount due
CREATE OR REPLACE FUNCTION calculate_total_due(registration_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total INTEGER := 0;
    reg RECORD;
    tournament RECORD;
BEGIN
    -- Get registration and tournament details
    SELECT r.*, t.* INTO reg, tournament
    FROM registrations r
    JOIN tournaments t ON r.tournament_id = t.id
    WHERE r.id = registration_id;

    -- Calculate rebuy costs
    IF NOT reg.rebuys_paid THEN
        total := total + 
            (reg.single_rebuys * (tournament.rebuy->>'single'->>'price')::INTEGER) +
            (reg.double_rebuys * (tournament.rebuy->>'double'->>'price')::INTEGER);
    END IF;

    -- Add addon cost if used but not paid
    IF reg.addon_used AND NOT reg.addon_paid THEN
        total := total + (tournament.addon->>'price')::INTEGER;
    END IF;

    RETURN total;
END;
$$ LANGUAGE plpgsql; 