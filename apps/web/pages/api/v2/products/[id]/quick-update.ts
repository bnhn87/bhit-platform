import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { labourCalculator } from '../../../../../lib/labour-calculator';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuickUpdateRequest {
  completed?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'blocked';
  hours_spent?: number;
  notes?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: productId } = req.query;
  const updateData: QuickUpdateRequest = req.body;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Get current product data
    const { data: currentProduct, error: fetchError } = await supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error('Error fetching product:', fetchError);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prepare update payload
    const updates: Record<string, unknown> = {
      last_updated: new Date().toISOString(),
    };

    if (updateData.completed !== undefined) {
      updates.completed_units = Math.max(0, Math.min(updateData.completed, currentProduct.total_quantity));
      
      // Auto-update status based on completion
      if (updates.completed_units === 0) {
        updates.status = 'not_started';
      } else if (updates.completed_units === currentProduct.total_quantity) {
        updates.status = 'completed';
      } else {
        updates.status = 'in_progress';
      }
    }

    if (updateData.status !== undefined) {
      updates.status = updateData.status;
    }

    if (updateData.hours_spent !== undefined) {
      updates.actual_hours_spent = Math.max(0, updateData.hours_spent);
    }

    if (updateData.notes !== undefined) {
      updates.notes = updateData.notes;
    }

    // Update the product
    const { data: updatedProduct, error: updateError } = await supabaseServiceRole
      .from('product_progress')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating product:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Get all products for this job to calculate labour impact
    const { data: allProducts, error: allProductsError } = await supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', updatedProduct.job_id);

    if (allProductsError) {
      console.error('Error fetching all products:', allProductsError);
      return res.status(500).json({ error: 'Failed to calculate labour impact' });
    }

    // Calculate labour metrics
    const remainingHours = labourCalculator.calculateRemainingHours(allProducts);
    const efficiency = labourCalculator.calculateEfficiency(allProducts);
    const burnRate = labourCalculator.calculateBurnRate([]); // Will need daily progress data

    const labourImpact = {
      remainingHours,
      efficiency,
      projectedCompletion: labourCalculator.projectCompletionDate(remainingHours, burnRate || 32),
      overallProgress: {
        completed: allProducts.reduce((sum, p) => sum + p.completed_units, 0),
        total: allProducts.reduce((sum, p) => sum + p.total_quantity, 0)
      }
    };

    // Add to offline sync queue for reliability
    await supabaseServiceRole
      .from('offline_sync_queue')
      .insert({
        job_id: updatedProduct.job_id,
        operation_type: 'product_update',
        table_name: 'product_progress',
        record_id: productId,
        data_payload: updates,
        sync_status: 'completed'
      });

    return res.status(200).json({
      success: true,
      product: updatedProduct,
      labourImpact
    });

  } catch (error: unknown) {
    console.error('Quick update API error:', error);
    return res.status(500).json({ 
      error: 'Failed to update product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}