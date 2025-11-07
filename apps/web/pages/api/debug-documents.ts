import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../lib/apiAuth';

// Create a Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Require authentication for debug endpoints
  const user = await requireAuth(req, res);
  if (!user) {
    return; // requireAuth already sent 401 response
  }

  try {
    const { jobId, documentIds = [] } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    // console.log(`Debug: Checking documents for job ${jobId} with document IDs:`, documentIds);

    // 1. Check all documents for this job
    const { data: allDocuments, error: allDocsError } = await supabaseAdmin
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId);

    // console.log(`Found ${allDocuments?.length || 0} total documents for job ${jobId}`);
    
    if (allDocsError) {
      console.error('Error fetching all documents:', allDocsError);
    }

    // 2. If document IDs provided, check specific documents
    let selectedDocuments = null;
    let selectedDocsError = null;
    
    if (documentIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('job_documents')
        .select('*')
        .in('id', documentIds)
        .eq('job_id', jobId);
        
      selectedDocuments = data;
      selectedDocsError = error;
      
      // console.log(`Found ${selectedDocuments?.length || 0} selected documents`);
      if (selectedDocsError) {
        console.error('Error fetching selected documents:', selectedDocsError);
      }
    }

    // 3. Check PDF documents specifically
    const { data: pdfDocuments, error: pdfDocsError } = await supabaseAdmin
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId)
      .or('file_ext.eq.pdf,file_ext.eq.PDF');

    // console.log(`Found ${pdfDocuments?.length || 0} PDF documents`);
    if (pdfDocsError) {
      console.error('Error fetching PDF documents:', pdfDocsError);
    }

    return res.status(200).json({
      success: true,
      jobId,
      documentIds,
      results: {
        allDocuments: {
          count: allDocuments?.length || 0,
          documents: allDocuments?.map(doc => ({
            id: doc.id,
            title: doc.title,
            file_ext: doc.file_ext,
            storage_path: doc.storage_path
          })) || [],
          error: allDocsError?.message || null
        },
        selectedDocuments: {
          count: selectedDocuments?.length || 0,
          documents: selectedDocuments?.map(doc => ({
            id: doc.id,
            title: doc.title,
            file_ext: doc.file_ext,
            storage_path: doc.storage_path
          })) || [],
          error: selectedDocsError?.message || null
        },
        pdfDocuments: {
          count: pdfDocuments?.length || 0,
          documents: pdfDocuments?.map(doc => ({
            id: doc.id,
            title: doc.title,
            file_ext: doc.file_ext,
            storage_path: doc.storage_path
          })) || [],
          error: pdfDocsError?.message || null
        }
      }
    });

  } catch (error: unknown) {
    console.error('Debug documents error:', error);
    return res.status(500).json({
      error: 'Failed to debug documents',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}