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
    // First check what columns exist
    const { data: _existingFlags } = await supabaseServiceRole
      .from('feature_flags')
      .select('*')
      .limit(1);

    // console.log('Existing table structure:', existingFlags);

    // Insert minimal feature flags with only guaranteed columns
    const { data, error } = await supabaseServiceRole
      .from('feature_flags')
      .upsert([
        {
          flag_key: 'product_cross_check',
          name: 'Product Cross-Check',
          is_enabled: true
        },
        {
          flag_key: 'labour_calendar_view',
          name: 'Labour Calendar View',
          is_enabled: true
        },
        {
          flag_key: 'database_driven_products',
          name: 'Database Product Catalogue',
          is_enabled: true
        },
        {
          flag_key: 'dashboard_analytics',
          name: 'Advanced Dashboard Analytics',
          is_enabled: true
        },
        {
          flag_key: 'ai_quote_parsing',
          name: 'AI Quote Parsing',
          is_enabled: true
        },
        {
          flag_key: 'quote_database_persistence',
          name: 'Quote Database Storage',
          is_enabled: true
        },
        {
          flag_key: 'experimental_planning_engine',
          name: 'Experimental Planning Engine',
          is_enabled: false
        },
        {
          flag_key: 'beta_floor_planner',
          name: 'Beta Floor Planner',
          is_enabled: false
        },
        {
          flag_key: 'advanced_labour_tracking',
          name: 'Advanced Labour Tracking',
          is_enabled: false
        },
        {
          flag_key: 'cost_optimization',
          name: 'Cost Optimization Features',
          is_enabled: false
        }
      ], {
        onConflict: 'flag_key',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error seeding feature flags:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get current flags count
    const { data: flags, error: countError } = await supabaseServiceRole
      .from('feature_flags')
      .select('flag_key, name, is_enabled, category');

    if (countError) {
      console.error('Error fetching flags:', countError);
    }

    return res.status(200).json({
      success: true,
      message: 'Feature flags seeded successfully',
      insertedCount: (data as unknown as Array<unknown>)?.length || 0,
      totalFlags: (flags as Array<unknown>)?.length || 0,
      flags: flags || []
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return res.status(500).json({
      error: 'Failed to seed feature flags',
      details: (error as Error).message
    });
  }
}