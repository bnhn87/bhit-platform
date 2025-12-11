const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/027_construction_progress_dashboard.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');


    // Split the SQL into individual statements (simple approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          // Continue with other statements
        }
      }
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();