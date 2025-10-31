import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Get products from quote_lines for this job
    const { data: quoteLines, error: quoteLinesError } = await supabaseServiceRole
      .from('quote_lines')
      .select(`
        id,
        line_number,
        product_code,
        product_description,
        quantity,
        time_per_unit,
        total_time,
        source,
        raw_description,
        clean_description,
        quote_id,
        quotes!inner(job_id)
      `)
      .eq('quotes.job_id', jobId)
      .order('line_number');

    if (quoteLinesError) {
      console.error('Error fetching quote lines:', quoteLinesError);
    }

    // Get products from generated tasks (if any)
    const { data: generatedTasks, error: tasksError } = await supabaseServiceRole
      .from('generated_tasks')
      .select('title, description, total_qty')
      .eq('job_id', jobId)
      .order('install_order');

    if (tasksError) {
      console.error('Error fetching generated tasks:', tasksError);
    }

    // Transform quote lines into product format
    const quoteProducts = (quoteLines || []).map(line => ({
      id: line.id,
      name: line.product_description,
      code: line.product_code,
      quantity: line.quantity,
      source: 'quote',
      estimatedTime: line.time_per_unit,
      totalTime: line.total_time,
      rawDescription: line.raw_description,
      cleanDescription: line.clean_description
    }));

    // Transform generated tasks into product format (these are usually installation tasks, not physical products)
    const taskProducts = (generatedTasks || [])
      .filter(task => task.total_qty && task.total_qty > 0)
      .map(task => {
        // Clean up task title by removing "Install" prefix and similar action words, including quantities
        let cleanName = task.title
          .replace(/^Install\s+\d+x?\s*/i, '')  // "Install 13x " or "Install 13 "
          .replace(/^Install\s+/i, '')          // "Install "
          .replace(/^Set up\s+\d+x?\s*/i, '')   // "Set up 13x "
          .replace(/^Set up\s+/i, '')           // "Set up "
          .replace(/^Place\s+\d+x?\s*/i, '')    // "Place 13x "
          .replace(/^Place\s+/i, '')            // "Place "
          .replace(/^Position\s+\d+x?\s*/i, '') // "Position 13x "
          .replace(/^Position\s+/i, '')         // "Position "
          .replace(/^Mount\s+\d+x?\s*/i, '')    // "Mount 13x "
          .replace(/^Mount\s+/i, '')            // "Mount "
          .trim();

        return {
          id: `task-${task.title}`,
          name: cleanName,
          code: null,
          quantity: task.total_qty,
          source: 'task_generation',
          description: task.description
        };
      });

    // Combine all products
    const allProducts = [...quoteProducts, ...taskProducts];

    return res.status(200).json({
      data: allProducts,
      summary: {
        totalItems: allProducts.length,
        fromQuotes: quoteProducts.length,
        fromTasks: taskProducts.length
      }
    });

  } catch (error) {
    console.error('Products API error:', error);
    return res.status(500).json({ error: 'Failed to fetch job products' });
  }
}