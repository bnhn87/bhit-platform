// POD Upload API - Production Quality
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import crypto from 'crypto';
import { PODService } from '../../../lib/pod/pod.service';
import { AIParsingService } from '../../../lib/pod/ai-parsing.service';
import { supabase } from '../../../lib/supabaseClient';
import type { APIResponse, DeliveryPOD } from '../../../lib/pod/types';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for multipart/form-data
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<{ pod: DeliveryPOD }>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract file
    const fileField = files.file;
    if (!fileField) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(uploadedFile.mimetype || '')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only PDF and images are allowed.'
      });
    }

    // Generate file hash for deduplication
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for duplicate
    const { data: existingPOD } = await supabase
      .from('delivery_pods')
      .select('id')
      .eq('file_hash', fileHash)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingPOD) {
      return res.status(409).json({
        success: false,
        error: 'This file has already been uploaded',
        data: { pod: { id: existingPOD.id } as any }
      });
    }

    // Upload to Supabase Storage
    const fileExtension = uploadedFile.originalFilename?.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;
    const filePath = `pods/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('pods')
      .upload(filePath, fileBuffer, {
        contentType: uploadedFile.mimetype || 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Extract form fields
    const supplierId = Array.isArray(fields.supplier_id)
      ? fields.supplier_id[0]
      : fields.supplier_id;

    const notes = Array.isArray(fields.notes)
      ? fields.notes[0]
      : fields.notes;

    const uploadSource = Array.isArray(fields.upload_source)
      ? fields.upload_source[0]
      : fields.upload_source || 'web_dashboard';

    // Create POD record
    const pod = await PODService.create({
      file: uploadedFile,
      filePath,
      fileHash,
      uploadedBy: session.user.id,
      uploadSource: uploadSource as any,
      supplierId: supplierId || null,
      originalSender: session.user.email || null,
    });

    // Trigger AI parsing asynchronously (don't wait for it)
    AIParsingService.parsePOD(pod.id, filePath)
      .then(async (parsedData) => {
        await PODService.update(pod.id, {
          ...parsedData,
          change_reason: 'AI parsing completed'
        });
      })
      .catch((err) => {
        console.error(`AI parsing failed for POD ${pod.id}:`, err);
      });

    // Clean up temp file
    fs.unlinkSync(uploadedFile.filepath);

    return res.status(201).json({
      success: true,
      message: 'POD uploaded successfully. AI processing in progress.',
      data: { pod }
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
}
