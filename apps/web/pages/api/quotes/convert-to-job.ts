import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

import { logJobCreated, logQuoteApproved } from '../../../lib/activityLogger';
import { convertQuoteToLabourEstimate, sanitizeProductsForJob } from '../../../lib/labour-logic';
import { safeParseUrlEncodedJson } from '../../../lib/safeParsing';
import type { CalculationResults, CalculatedProduct, QuoteDetails } from '../../../modules/smartquote/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract user ID from auth token
async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);

    if (!tokenMatch) return null;

    const tokenData = safeParseUrlEncodedJson<{ access_token?: string } | [string]>(tokenMatch[1]);
    if (!tokenData) return null;

    const token = (tokenData as { access_token?: string }).access_token || (tokenData as [string])[0];

    if (!token) return null;

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
    return user?.id || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // console.log('🔧 API: Convert quote to job called');
    // console.log('📤 Request body keys:', Object.keys(req.body));
    // console.log('📤 Request body type:', typeof req.body);
    
    const {
      quoteData,
      jobDetails
    }: {
      quoteData: {
        results: CalculationResults;
        products: CalculatedProduct[];
        details: QuoteDetails;
      };
      jobDetails: {
        title: string;
        siteId?: string;
        startDate?: string;
      };
    } = req.body;

    // console.log('🔍 Validating data:', {
    //   hasQuoteData: !!quoteData,
    //   hasJobDetails: !!jobDetails,
    //   hasResults: !!(quoteData?.results),
    //   hasProducts: !!(quoteData?.products),
    //   hasDetails: !!(quoteData?.details),
    //   jobTitle: jobDetails?.title
    // });

    if (!quoteData || !jobDetails) {
      // console.error('❌ Missing required data:', { quoteData: !!quoteData, jobDetails: !!jobDetails });
      return res.status(400).json({ error: 'Missing required data' });
    }

    const { results, products, details } = quoteData;

    // Convert quote to labour estimate
    // console.log('🔧 Converting quote to labour estimate...');
    // console.log('🔍 Input data for conversion:', {
    //   results: {
    //     hasResults: !!results,
    //     crew: results?.crew ? Object.keys(results.crew) : 'missing',
    //     labour: results?.labour ? Object.keys(results.labour) : 'missing',
    //     pricing: results?.pricing ? Object.keys(results.pricing) : 'missing'
    //   },
    //   products: {
    //     count: products?.length || 0,
    //     firstProduct: products?.[0] ? Object.keys(products[0]) : 'none'
    //   },
    //   details: {
    //     hasDetails: !!details,
    //     customExtendedUpliftDays: details?.customExtendedUpliftDays
    //   }
    // });

    let labourEstimate;
    try {
      labourEstimate = convertQuoteToLabourEstimate(results, products, details);
      // console.log('📊 Labour estimate result:', {
      //   totalDays: labourEstimate.totalDays,
      //   totalHours: labourEstimate.totalHours,
      //   crewSize: labourEstimate.crewSize,
      //   productsCount: labourEstimate.products.length
      // });
    } catch (conversionError) {
      console.error('❌ Error in convertQuoteToLabourEstimate:', conversionError);
      return res.status(400).json({ 
        error: 'Failed to convert quote to labour estimate', 
        details: conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'
      });
    }

    // Validate labour estimate
    if (labourEstimate.totalDays <= 0 || labourEstimate.products.length === 0) {
      // console.error('❌ Invalid labour estimate:', {
      //   totalDays: labourEstimate.totalDays,
      //   productsLength: labourEstimate.products.length
      // });
      return res.status(400).json({ error: 'Invalid labour estimate generated from quote' });
    }

    // Sanitize products for job creation
    const sanitizedProducts = sanitizeProductsForJob(products);

    // Create job record
    const jobId = uuidv4();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        title: jobDetails.title,
        site_id: jobDetails.siteId && jobDetails.siteId !== 'undefined' ? jobDetails.siteId : null,
        status: 'planned',
        quoted_amount: results.pricing.totalCost,
        products: sanitizedProducts,
        quote_details: {
          client: details.client,
          project: details.project,
          delivery_address: details.deliveryAddress,
          prepared_by: details.preparedBy,
          quote_ref: details.quoteRef,
          uplift_via_stairs: details.upliftViaStairs,
          extended_uplift: details.extendedUplift,
          custom_extended_uplift_days: details.customExtendedUpliftDays,
          specialist_reworking: details.specialistReworking
        },
        labour_summary: {
          total_days: labourEstimate.totalDays,
          total_hours: labourEstimate.totalHours,
          crew_size: labourEstimate.crewSize,
          installation_days: labourEstimate.installationDays,
          uplift_days: labourEstimate.upliftDays
        },
        start_date: jobDetails.startDate ? new Date(jobDetails.startDate).toISOString() : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      // console.error('Error creating job:', jobError);
      return res.status(500).json({ error: 'Failed to create job', details: jobError.message });
    }

    // Initialize labour bank
    const { error: labourBankError } = await supabase
      .rpc('initialize_job_labour', {
        p_job_id: jobId,
        p_labour_days: labourEstimate.totalDays
      });

    if (labourBankError) {
      // console.error('Error initializing labour bank:', labourBankError);
      // Continue - this is not critical for job creation
    }

    // Seed build targets from products
    const { error: targetsError } = await supabase
      .rpc('seed_job_build_targets', {
        p_job_id: jobId
      });

    if (targetsError) {
      // console.error('Error seeding build targets:', targetsError);
      // Continue - this is not critical for job creation
    }

    // Update build targets with optimized build order
    if (labourEstimate.products.length > 0) {
      const buildTargetUpdates = labourEstimate.products.map((product) => ({
        job_id: jobId,
        product_code: product.productCode,
        build_order: product.buildPriority,
        total_quantity: product.quantity
      }));

      for (const update of buildTargetUpdates) {
        await supabase
          .from('job_build_targets')
          .update({
            build_order: update.build_order
          })
          .eq('job_id', update.job_id)
          .eq('product_code', update.product_code);
      }
    }

    // Generate tasks from SmartQuote products
    // console.log('🔧 Generating tasks from SmartQuote products...');
    const tasksToCreate = products.map((product, index) => {
      const installOrder = index + 1;
      const taskTitle = `Install ${product.cleanDescription || product.description}`;
      const taskDescription = `Install ${product.quantity}x ${product.cleanDescription || product.description}`;
      const roomZone = jobDetails.title || 'Main Area'; // Use job title as room zone
      const estimatedTimeMinutes = Math.round((product.totalTime || product.timePerUnit * product.quantity || 60) * 60);

      return {
        job_id: jobId,
        title: taskTitle,
        description: taskDescription,
        install_order: installOrder,
        room_zone: roomZone,
        furniture_ids: [product.productCode],
        estimated_time_minutes: estimatedTimeMinutes,
        dependencies: [],
        is_generated: true,
        status: 'Uplift',
        completed_qty: 0,
        total_qty: product.quantity || 1,
        missing_notes: null
      };
    });

    // console.log(`📊 Creating ${tasksToCreate.length} tasks from products...`);
    
    const { error: tasksError } = await supabase
      .from('generated_tasks')
      .insert(tasksToCreate);

    if (tasksError) {
      // console.error('⚠️ Error creating tasks:', tasksError);
      // Continue - task creation is not critical for job creation
    } else {
      // console.log('✅ Successfully created tasks from SmartQuote products');
    }

    // Log the activities
    const userId = await getUserIdFromRequest(req);
    const quoteRef = details.quoteRef || 'Unknown Quote';

    // Log job creation
    await logJobCreated(jobId, jobDetails.title, userId || undefined);

    // Log quote approval (converting to job implies approval)
    if (quoteRef) {
      await logQuoteApproved(jobId, quoteRef, userId || undefined);
    }

    return res.status(200).json({
      success: true,
      jobId: job.id,
      job: job,
      labourEstimate: labourEstimate,
      message: 'Job created successfully from quote'
    });

  } catch (error) {
    // console.error('Error converting quote to job:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}