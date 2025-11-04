import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../lib/apiAuth';

// import { generateTasksFromSelectedDocuments } from '../../lib/pdfTaskGeneration';

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) {
    return; // requireAuth already sent 401 response
  }

  try {
    const { jobId, documentIds = [], clearExisting = false } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // console.log(`API: Generating tasks for job ${jobId} with ${documentIds.length} documents`);

    // Get job data to access SmartQuote products
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('products, quote_details, labour_summary')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('Failed to fetch job data:', jobError);
      return res.status(500).json({ error: `Failed to fetch job data: ${jobError.message}` });
    }

    // console.log(`Job has ${jobData?.products?.length || 0} products from SmartQuote`);

    // Clear existing tasks if requested
    if (clearExisting) {
      const { error: deleteError } = await supabaseAdmin
        .from('generated_tasks')
        .delete()
        .eq('job_id', jobId);
        
      if (deleteError) {
        console.error('Failed to delete existing tasks:', deleteError);
        return res.status(500).json({ error: `Failed to clear existing tasks: ${deleteError.message}` });
      }
      // console.log('Cleared existing tasks');
    }

    let tasksToInsert: Array<{
      job_id: string;
      title: string;
      description: string;
      install_order: number;
      room_zone: string;
      furniture_ids: string[];
      estimated_time_minutes: number;
      dependencies: string[];
      is_generated: boolean;
      status: string;
      completed_qty: number;
      total_qty: number;
      missing_notes: string | null;
    }> = [];

    // Check if we have selected documents
    if (documentIds.length > 0) {
      // console.log(`Generating tasks from ${documentIds.length} selected documents...`);
      
      try {
        // Fetch the selected PDF documents using admin client
        // console.log(`Fetching documents with IDs:`, documentIds);
        const { data: documents, error: docError } = await supabaseAdmin
          .from('job_documents')
          .select('*')
          .eq('job_id', jobId)
          .in('id', documentIds)
          .in('file_ext', ['pdf', 'PDF']);

        if (docError) {
          console.error('Document fetch error:', docError);
          throw new Error(`Failed to fetch documents: ${docError.message}`);
        }

        // console.log(`Found ${documents?.length || 0} documents for processing`);

        if (!documents || documents.length === 0) {
          throw new Error('No valid PDF documents found from selection.');
        }

        // For now, generate sample tasks (we'll implement PDF parsing later)
        // This will bypass the PDF parsing complexity and focus on the workflow
        const sampleTasksFromDocs = documents.flatMap((doc, index) => [
          {
            job_id: jobId,
            title: `Install Items from ${doc.title.substring(0, 20)}...`,
            description: `Install items specified in ${doc.title}`,
            install_order: (index * 2) + 1,
            room_zone: 'Ground Floor',
            furniture_ids: [],
            estimated_time_minutes: 90,
            dependencies: [],
            is_generated: true,
            status: 'Uplift',
            completed_qty: 0,
            total_qty: 5,
            missing_notes: null
          },
          {
            job_id: jobId,
            title: `Quality Check for ${doc.title.substring(0, 20)}...`,
            description: `Verify installation quality for items from ${doc.title}`,
            install_order: (index * 2) + 2,
            room_zone: 'Ground Floor', 
            furniture_ids: [],
            estimated_time_minutes: 30,
            dependencies: [],
            is_generated: true,
            status: 'Uplift',
            completed_qty: 0,
            total_qty: 1,
            missing_notes: null
          }
        ]);

        tasksToInsert = sampleTasksFromDocs;
        // console.log(`Generated ${tasksToInsert.length} tasks from ${documents.length} documents`);
      } catch (pdfError: unknown) {
        console.error('PDF generation error:', pdfError);
        return res.status(500).json({ error: `Failed to generate tasks from documents: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}` });
      }
    } else {
      // Generate tasks from SmartQuote product data if available
      if (jobData?.products && Array.isArray(jobData.products) && jobData.products.length > 0) {
        // console.log('Generating tasks from SmartQuote product data...');
        
        tasksToInsert = jobData.products.map((product: {
          isHeavy?: boolean;
          cleanDescription?: string;
          description?: string;
          quantity?: number;
          totalTime?: number;
          timePerUnit?: number;
          productCode?: string;
        }, index: number) => {
          // Determine if this is a heavy item that needs special handling
          const isHeavy = product.isHeavy || false;
          
          // Calculate room zone based on product type or use quote details
          const roomZone = determineRoomZone(product, jobData?.quote_details?.project);
          
          // Create task title and description
          const taskTitle = `Install ${product.cleanDescription || product.description}`;
          const taskDescription = `Install ${product.quantity}x ${product.cleanDescription || product.description}${isHeavy ? ' (Heavy item - requires special handling)' : ''}`;
          
          // Calculate estimated time in minutes
          const estimatedTimeMinutes = Math.round((product.totalTime || (product.timePerUnit || 1) * (product.quantity || 1) || 60) * 60);
          
          return {
            job_id: jobId,
            title: taskTitle,
            description: taskDescription,
            install_order: index + 1,
            room_zone: roomZone,
            furniture_ids: [product.productCode || `product_${index}`],
            estimated_time_minutes: estimatedTimeMinutes,
            dependencies: isHeavy ? [] : [], // Heavy items could have dependencies in the future
            is_generated: true,
            status: 'Uplift',
            completed_qty: 0,
            total_qty: product.quantity || 1,
            missing_notes: null
          };
        });
        
        // console.log(`Generated ${tasksToInsert.length} tasks from SmartQuote products`);
      } else {
        // Final fallback to sample tasks if no SmartQuote data available
        // console.log('No SmartQuote products found, generating sample tasks...');
        tasksToInsert = [
          {
            job_id: jobId,
            title: 'Install Office Furniture',
            description: 'Install office furniture items as per quote',
            install_order: 1,
            room_zone: 'Ground Floor',
            furniture_ids: [],
            estimated_time_minutes: 120,
            dependencies: [],
            is_generated: true,
            status: 'Uplift',
            completed_qty: 0,
            total_qty: 1,
            missing_notes: null
          }
        ];
      }
    }

    // Helper function to determine room zone based on product data
    function determineRoomZone(product: { cleanDescription?: string; description?: string }, projectName?: string): string {
      // Use project name as default room zone
      if (projectName) {
        return projectName;
      }
      
      // Try to infer from product description
      const description = (product.cleanDescription || product.description || '').toLowerCase();
      
      if (description.includes('kitchen') || description.includes('cabinet')) {
        return 'Kitchen';
      } else if (description.includes('bathroom') || description.includes('vanity')) {
        return 'Bathroom';
      } else if (description.includes('office') || description.includes('desk') || description.includes('chair')) {
        return 'Office Area';
      } else if (description.includes('bedroom')) {
        return 'Bedroom';
      } else if (description.includes('living') || description.includes('lounge')) {
        return 'Living Room';
      }
      
      // Default fallback
      return 'General Area';
    }

    // Insert tasks using admin client (bypasses RLS)
    const { data: insertedTasks, error: insertError } = await supabaseAdmin
      .from('generated_tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert tasks:', insertError);
      return res.status(500).json({ error: `Failed to insert tasks: ${insertError.message}` });
    }

    // console.log(`Successfully inserted ${insertedTasks?.length || 0} tasks`);

    return res.status(200).json({
      success: true,
      tasksGenerated: insertedTasks?.length || 0,
      tasks: insertedTasks
    });

  } catch (error) {
    console.error('Task generation API error:', error);
    return res.status(500).json({
      error: 'Failed to generate tasks',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}