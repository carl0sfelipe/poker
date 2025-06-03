const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../src/database/migrations/add_rebuy_counters.sql'),
      'utf8'
    );

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) throw error;

    // Execute the update_rebuy_counters function to populate existing records
    const { error: updateError } = await supabase.rpc('update_rebuy_counters');
    if (updateError) throw updateError;

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 