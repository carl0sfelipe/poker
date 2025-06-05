const fs = require('fs');
const path = require('path');
const supabase = require('../config/database');

async function migrate() {
  try {
    // Read and execute each migration file
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Executing migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) throw error;
        console.log(`Migration ${file} completed successfully`);
      }
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 