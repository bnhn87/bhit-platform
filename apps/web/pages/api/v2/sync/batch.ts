import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SyncUpdate {
  id: string; // Unique ID for this update
  operation: 'product_update' | 'bulk_update' | 'daily_log' | 'closeout';
  table: string;
  record_id?: string;
  job_id: string;
  data: Record<string, unknown>;
  timestamp: number;
  retry_count?: number;
}

interface BatchSyncRequest {
  updates: SyncUpdate[];
  device_id?: string;
  last_sync_timestamp?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { updates, device_id: _device_id, last_sync_timestamp: _last_sync_timestamp }: BatchSyncRequest = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Updates array is required' });
  }

  const results = {
    synced: 0,
    failed: 0,
    conflicts: [] as Array<{ id: string; reason: string; data?: unknown }>,
    newState: {} as Record<string, unknown>,
    errors: [] as Array<{ id: string; error: string; update?: SyncUpdate }>
  };

  try {
    // Process each update
    for (const update of updates) {
      try {
        await processUpdate(update, results);
        results.synced++;
      } catch (error: unknown) {
        // Failed to process update
        results.failed++;
        results.errors.push({
          id: update.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Add to sync queue for retry
        await supabaseServiceRole
          .from('offline_sync_queue')
          .insert({
            job_id: update.job_id,
            operation_type: update.operation,
            table_name: update.table,
            record_id: update.record_id,
            data_payload: update.data,
            sync_status: 'failed',
            retry_count: (update.retry_count || 0) + 1,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
      }
    }

    // Get updated state for affected jobs
    const affectedJobs = [...new Set(updates.map(u => u.job_id))];
    
    for (const jobId of affectedJobs) {
      const { data: jobState } = await getJobState(jobId);
      if (jobState) {
        results.newState[jobId] = jobState;
      }
    }

    // Clean up successfully synced items from sync queue
    if (results.synced > 0) {
      const successfulIds = updates
        .slice(0, results.synced)
        .filter(u => u.record_id)
        .map(u => u.record_id);

      if (successfulIds.length > 0) {
        await supabaseServiceRole
          .from('offline_sync_queue')
          .delete()
          .in('record_id', successfulIds);
      }
    }

    return res.status(200).json({
      success: true,
      results,
      sync_timestamp: Date.now()
    });

  } catch (error: unknown) {
    // Batch sync API error
    return res.status(500).json({ 
      error: 'Failed to process batch sync',
      details: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    });
  }
}

async function processUpdate(update: SyncUpdate, _results: {
  synced: number;
  failed: number;
  conflicts: Array<{ id: string; reason: string; data?: unknown }>;
  newState: Record<string, unknown>;
  errors: Array<{ id: string; error: string; update?: SyncUpdate }>;
}): Promise<void> {
  switch (update.operation) {
    case 'product_update':
      await processProductUpdate(update);
      break;
    case 'bulk_update':
      await processBulkUpdate(update);
      break;
    case 'daily_log':
      await processDailyLog(update);
      break;
    case 'closeout':
      await processCloseout(update);
      break;
    default:
      throw new Error(`Unknown operation: ${update.operation}`);
  }
}

async function processProductUpdate(update: SyncUpdate): Promise<void> {
  if (!update.record_id) {
    throw new Error('Product update requires record_id');
  }

  // Check for conflicts by comparing timestamps
  const { data: currentRecord, error: fetchError } = await supabaseServiceRole
    .from('product_progress')
    .select('last_updated')
    .eq('id', update.record_id)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (currentRecord) {
    const currentTimestamp = new Date(currentRecord.last_updated).getTime();
    if (currentTimestamp > update.timestamp) {
      throw new Error('Conflict: Record was updated more recently on server');
    }
  }

  // Apply the update
  const { error: updateError } = await supabaseServiceRole
    .from('product_progress')
    .update({
      ...update.data,
      last_updated: new Date(update.timestamp).toISOString()
    })
    .eq('id', update.record_id);

  if (updateError) {
    throw updateError;
  }
}

async function processBulkUpdate(update: SyncUpdate): Promise<void> {
  const { filters: _filters, updates: bulkUpdates, affected_products } = update.data;

  // Apply bulk updates to affected products
  if (affected_products && Array.isArray(affected_products)) {
    for (const productId of affected_products) {
      await supabaseServiceRole
        .from('product_progress')
        .update({
          ...(bulkUpdates as Record<string, unknown>),
          last_updated: new Date(update.timestamp).toISOString()
        } as never)
        .eq('id', productId);
    }
  }
}

async function processDailyLog(update: SyncUpdate): Promise<void> {
  const { error } = await supabaseServiceRole
    .from('daily_progress_log')
    .upsert({
      ...update.data,
      created_at: new Date(update.timestamp).toISOString()
    }, { 
      onConflict: 'job_id,log_date',
      ignoreDuplicates: false 
    });

  if (error) {
    throw error;
  }
}

async function processCloseout(update: SyncUpdate): Promise<void> {
  const { error } = await supabaseServiceRole
    .from('daily_closeout_forms')
    .upsert({
      ...update.data,
      created_at: new Date(update.timestamp).toISOString()
    }, { 
      onConflict: 'job_id,closeout_date',
      ignoreDuplicates: false 
    });

  if (error) {
    throw error;
  }
}

async function getJobState(jobId: string): Promise<{ data: Record<string, unknown> }> {
  // Get current state of all relevant data for this job
  const [products, dailyLogs, closeouts] = await Promise.all([
    supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', jobId),
    supabaseServiceRole
      .from('daily_progress_log')
      .select('*')
      .eq('job_id', jobId)
      .order('log_date', { ascending: false })
      .limit(7), // Last 7 days
    supabaseServiceRole
      .from('daily_closeout_forms')
      .select('*')
      .eq('job_id', jobId)
      .order('closeout_date', { ascending: false })
      .limit(7) // Last 7 days
  ]);

  return {
    data: {
      products: products.data || [],
      dailyLogs: dailyLogs.data || [],
      closeouts: closeouts.data || [],
      lastUpdated: new Date().toISOString()
    }
  };
}