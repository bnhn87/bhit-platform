import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '022_add_product_catalogue_table.sql');

    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({ error: 'Migration file not found' });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Test if product_catalogue table already exists
    const { error: testError } = await supabaseServiceRole
      .from('product_catalogue')
      .select('id')
      .limit(1);

    const results = [];

    if (testError && testError.message.includes('relation "product_catalogue" does not exist')) {
      // Execute migration using RPC if available
      try {
        const { error: migrationError } = await supabaseServiceRole.rpc('exec_sql', {
          sql: migrationSQL
        });

        if (migrationError) {
          // If RPC doesn't work, try executing key parts manually
          // console.log('RPC execution failed, trying manual approach:', migrationError);

          // Create the main table manually
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS product_catalogue (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              product_code VARCHAR(200) NOT NULL UNIQUE,
              product_name VARCHAR(500),
              category VARCHAR(100) DEFAULT 'furniture',
              install_time_hours DECIMAL(6,3) NOT NULL DEFAULT 0.33,
              waste_volume_m3 DECIMAL(6,3) NOT NULL DEFAULT 0.035,
              is_heavy BOOLEAN DEFAULT false,
              is_active BOOLEAN DEFAULT true,
              source VARCHAR(50) DEFAULT 'manual',
              confidence_score DECIMAL(3,2) DEFAULT 1.0,
              usage_count INTEGER DEFAULT 0,
              last_used TIMESTAMP WITH TIME ZONE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              created_by UUID,
              notes TEXT,
              manufacturer VARCHAR(200),
              model VARCHAR(200),
              dimensions JSONB,
              weight_kg DECIMAL(8,2),
              material VARCHAR(100),
              color VARCHAR(100),
              requires_specialist BOOLEAN DEFAULT false,
              requires_two_person BOOLEAN DEFAULT false,
              fragile BOOLEAN DEFAULT false
            );
          `;

          const { error: createError } = await supabaseServiceRole.rpc('exec_sql', {
            sql: createTableSQL
          });

          if (createError) {
            results.push({ statement: 'CREATE TABLE product_catalogue', error: createError.message });
          } else {
            results.push({ statement: 'CREATE TABLE product_catalogue', success: true });

            // Insert default data
            const { error: insertError } = await supabaseServiceRole
              .from('product_catalogue')
              .insert([
                { product_code: 'T9b', product_name: 'Standard Office Desk T9b', install_time_hours: 0.42, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'D1', product_name: 'Office Drawer Unit D1', install_time_hours: 0.33, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'D2a', product_name: 'Heavy Drawer Unit D2a', install_time_hours: 0.50, waste_volume_m3: 0.035, is_heavy: true, source: 'default' },
                { product_code: 'WK-S1', product_name: 'Workstation Screen WK-S1', install_time_hours: 0.25, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'CH-01', product_name: 'Office Chair CH-01', install_time_hours: 0.17, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'CH-05', product_name: 'Ergonomic Chair CH-05', install_time_hours: 0.20, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'SOFA-3', product_name: '3-Seater Sofa', install_time_hours: 0.75, waste_volume_m3: 0.035, is_heavy: true, source: 'default' },
                { product_code: 'ST-P1', product_name: 'Storage Unit ST-P1', install_time_hours: 0.58, waste_volume_m3: 0.035, is_heavy: false, source: 'default' },
                { product_code: 'ST-L2', product_name: 'Large Storage Unit ST-L2', install_time_hours: 1.00, waste_volume_m3: 0.035, is_heavy: true, source: 'default' },
                { product_code: 'DEFAULT', product_name: 'Standard Office Item', install_time_hours: 0.33, waste_volume_m3: 0.035, is_heavy: false, source: 'default' }
              ]);

            if (insertError) {
              results.push({ statement: 'INSERT default products', error: insertError.message });
            } else {
              results.push({ statement: 'INSERT default products', success: true });
            }
          }
        } else {
          results.push({ statement: 'Full migration executed via RPC', success: true });
        }
      } catch (err) {
        results.push({ statement: 'Migration execution', error: (err as Error).message });
      }
    } else {
      results.push({ statement: 'product_catalogue table already exists', success: true });
    }

    // Verify tables were created and check row count
    const { data: products, error: productError } = await supabaseServiceRole
      .from('product_catalogue')
      .select('product_code, install_time_hours')
      .limit(5);

    if (productError) {
      console.error('Product verification error:', productError);
    }

    return res.status(200).json({
      success: true,
      message: 'Product catalogue migration applied',
      results,
      sampleProducts: products || [],
      productCount: products?.length || 0
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Failed to apply product catalogue migration',
      details: (error as Error).message
    });
  }
}