-- Add rebuy counter columns to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS single_rebuys INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS double_rebuys INTEGER DEFAULT 0;

-- Add check constraints to ensure counters are non-negative
ALTER TABLE registrations
ADD CONSTRAINT check_single_rebuys_non_negative CHECK (single_rebuys >= 0),
ADD CONSTRAINT check_double_rebuys_non_negative CHECK (double_rebuys >= 0);

-- Update existing registrations to count rebuys from the rebuys array
CREATE OR REPLACE FUNCTION update_rebuy_counters() 
RETURNS void AS $$
DECLARE
    reg RECORD;
    rebuy_item JSONB;
BEGIN
    FOR reg IN SELECT id, rebuys FROM registrations WHERE rebuys IS NOT NULL LOOP
        WITH counts AS (
            SELECT 
                COUNT(*) FILTER (WHERE value->>'type' = 'single') as single_count,
                COUNT(*) FILTER (WHERE value->>'type' = 'double') as double_count
            FROM jsonb_array_elements(reg.rebuys)
        )
        UPDATE registrations 
        SET 
            single_rebuys = counts.single_count,
            double_rebuys = counts.double_count
        FROM counts
        WHERE id = reg.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 