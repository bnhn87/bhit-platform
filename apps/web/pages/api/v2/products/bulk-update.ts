import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { labourCalculator } from '../../../../lib/labour-calculator';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BulkUpdateRequest {
  job_id: string;
  filters?: {
    product_type?: string;
    status?: string;
    ids?: string[];
  };
  updates: {
    completed?: number;
    status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'blocked';
    increment_completed?: number;
    hours_spent?: number;
    notes?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { job_id, filters = {}, updates }: BulkUpdateRequest = req.body;

  if (!job_id) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Build query with filters
    let query = supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', job_id);

    if (filters.product_type) {
      query = query.eq('product_type', filters.product_type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.ids && filters.ids.length > 0) {
      query = query.in('id', filters.ids);
    }

    const { data: productsToUpdate, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    if (!productsToUpdate || productsToUpdate.length === 0) {
      return res.status(404).json({ error: 'No products found matching criteria' });
    }

    // Prepare bulk updates
    const updatedProducts = [];
    const bulkUpdates = [];

    for (const product of productsToUpdate) {
      const updateData: Record<string, unknown> = {
        last_updated: new Date().toISOString(),
      };

      // Handle different update types
      if (updates.completed !== undefined) {
        updateData.completed_units = Math.max(0, Math.min(updates.completed, product.total_quantity));
      }

      if (updates.increment_completed !== undefined) {
        const newCompleted = product.completed_units + updates.increment_completed;
        updateData.completed_units = Math.max(0, Math.min(newCompleted, product.total_quantity));
      }

      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }

      if (updates.hours_spent !== undefined) {
        updateData.actual_hours_spent = Math.max(0, updates.hours_spent);
      }

      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }

      // Auto-update status based on completion if not explicitly set
      if (updateData.completed_units !== undefined && updates.status === undefined) {
        if (updateData.completed_units === 0) {
          updateData.status = 'not_started';
        } else if (updateData.completed_units === product.total_quantity) {
          updateData.status = 'completed';
        } else {
          updateData.status = 'in_progress';
        }
      }

      bulkUpdates.push({
        id: product.id,
        updates: updateData
      });
    }

    // Execute bulk updates
    const updatePromises = bulkUpdates.map(async ({ id, updates: productUpdates }) => {
      const { data, error } = await supabaseServiceRole
        .from('product_progress')
        .update(productUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating product ${id}:`, error);
        throw error;
      }

      return data;
    });

    const results = await Promise.all(updatePromises);
    updatedProducts.push(...results);

    // Calculate labour impact for the job
    const { data: allProducts, error: allProductsError } = await supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', job_id);

    if (allProductsError) {
      console.error('Error fetching all products:', allProductsError);
      return res.status(500).json({ error: 'Failed to calculate labour impact' });
    }

    const remainingHours = labourCalculator.calculateRemainingHours(allProducts);
    const efficiency = labourCalculator.calculateEfficiency(allProducts);
    const burnRate = labourCalculator.calculateBurnRate([]);

    const labourImpact = {
      remainingHours,
      efficiency,
      projectedCompletion: labourCalculator.projectCompletionDate(remainingHours, burnRate || 32),
      overallProgress: {
        completed: allProducts.reduce((sum, p) => sum + p.completed_units, 0),
        total: allProducts.reduce((sum, p) => sum + p.total_quantity, 0)
      },
      updatedCount: updatedProducts.length
    };

    // Log bulk operation for sync queue
    await supabaseServiceRole
      .from('offline_sync_queue')
      .insert({
        job_id,
        operation_type: 'bulk_update',
        table_name: 'product_progress',
        data_payload: {
          filters,
          updates,
          affected_products: updatedProducts.map(p => p.id)
        },
        sync_status: 'completed'
      });

    return res.status(200).json({
      success: true,
      updatedProducts,
      labourImpact
    });

  } catch (error) {
    console.error('Bulk update API error:', error);
    return res.status(500).json({ 
      error: 'Failed to perform bulk update',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}