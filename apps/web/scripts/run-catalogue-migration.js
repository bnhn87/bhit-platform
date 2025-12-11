const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration. Please check your .env.local file.');
    process.exit(1);
}

async function runMigration() {

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });

    try {
        // Read the migration SQL
        const migrationPath = path.join(__dirname, '../migrations/042_product_catalogue_aliases.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by statements and run each
        const statements = migrationSQL
            .split(/;[\r\n]+/)
            .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'))
            .map(stmt => stmt.trim() + ';');


        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip comment-only statements
            if (statement.trim().startsWith('--')) continue;

            // Get first 50 chars of statement for logging
            const shortStatement = statement.substring(0, 50).replace(/\n/g, ' ');

            try {
                const { error } = await supabase.rpc('exec_sql', {
                    query: statement
                }).single();

                if (error) {
                    // Try direct execution as fallback
                    const { data, error: directError } = await supabase
                        .from('_sql_migrations')
                        .insert({ sql: statement })
                        .select();

                    if (directError) {
                        throw directError;
                    }
                }

                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`❌ [${i+1}/${statements.length}] Failed: ${shortStatement}...`);
                console.error(`   Error: ${error.message}`);

                // Continue on certain errors
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate key')) {
                    continue;
                }
            }
        }


        if (errorCount === 0) {
        } else {
        }

        // Test the new tables

        const { data: products, error: testError } = await supabase
            .from('product_catalogue_items')
            .select('*')
            .limit(5);

        if (testError) {
            console.error('❌ Failed to query product_catalogue_items:', testError.message);
        } else {

            if (products && products.length > 0) {
                products.forEach(p => {
                });
            }
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {

    try {
        // Use pg library for direct connection
        const { Client } = require('pg');

        // Parse connection string from Supabase URL
        const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

        if (!dbUrl) {
            throw new Error('No database URL found. Please set DATABASE_URL in .env.local');
        }

        const client = new Client({
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();

        // Read and execute migration
        const migrationPath = path.join(__dirname, '../migrations/042_product_catalogue_aliases.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await client.query(migrationSQL);

        // Test query
        const result = await client.query('SELECT COUNT(*) FROM product_catalogue_items');

        await client.end();

    } catch (error) {
        console.error('❌ Direct SQL execution failed:', error.message);
    }
}

// Try Supabase approach first, then fallback to direct SQL
runMigration().catch(err => {
    runMigrationDirect();
});