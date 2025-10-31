/**
 * PDF Task Generation Service - Updated for selective document processing
 * Uses PDF.js to extract text from specific PDF documents and Gemini AI to generate installation tasks
 */

import { supabase } from './supabaseClient';

export type GeneratedTaskData = {
  title: string;
  description: string | null;
  install_order: number;
  room_zone: string | null;
  estimated_time_minutes: number | null;
  total_qty: number;
  dependencies: string[];
};

declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (params: { data: ArrayBuffer | Uint8Array }) => { promise: Promise<{
        numPages: number;
        getPage: (num: number) => Promise<{
          getTextContent: () => Promise<{
            items: Array<{ str: string }>;
          }>;
          getViewport: (params: { scale: number }) => { height: number; width: number };
          render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { height: number; width: number } }) => { promise: Promise<void> };
        }>;
        destroy?: () => void;
      }> };
    } | null;
  }
}

const extractTextFromPdf = async (file: File): Promise<string> => {
  // console.log('Starting PDF text extraction...');
  
  let retries = 0;
  while (typeof window.pdfjsLib === 'undefined' && retries < 10) {
    // console.log('Waiting for PDF.js to load...');
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }

  if (typeof window.pdfjsLib === 'undefined' || !window.pdfjsLib) {
    throw new Error('PDF.js library not loaded. Please refresh the page.');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib!.getDocument({ data: arrayBuffer }).promise;
    
    // console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
      fullText += `Page ${pageNum}:\n${pageText}\n\n`;
      // console.log(`Extracted text from page ${pageNum}: ${pageText.length} characters`);
    }
    
    // console.log(`Total extracted text: ${fullText.length} characters`);
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const generateTasksFromText = async (text: string, documentTitle: string): Promise<GeneratedTaskData[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key not found. Please check your environment configuration.');
  }

  // console.log(`Sending text to Gemini for task generation from ${documentTitle}...`);
  
  const prompt = `
You are an expert installation project manager. Analyze the following document text and generate a comprehensive list of installation tasks.

Document: ${documentTitle}

For each task, provide:
- title: Short, clear task name (e.g., "Install Kitchen Cabinets")
- description: Brief description of what needs to be done
- install_order: Sequential number (1, 2, 3, etc.) based on logical installation sequence
- room_zone: Which room/area this task is for (e.g., "Kitchen", "Living Room", "Bathroom 1")
- estimated_time_minutes: Realistic time estimate in minutes
- total_qty: Number of items/units to install for this task
- dependencies: Array of task titles that must be completed first (empty array if no dependencies)

Focus on:
- Furniture assembly and installation
- Built-in components
- Fixtures and fittings  
- Any items that require installation, mounting, or assembly
- Logical sequence (e.g., electrical before fixtures, structural before cosmetic)

Return a JSON array of tasks. Be realistic about quantities and timing.

Document text:
${text}

Respond with only a JSON array, no additional text:`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    let responseText = data.candidates[0].content.parts[0].text.trim();
    // console.log('Raw Gemini response:', responseText);

    // Clean up the response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const tasks = JSON.parse(responseText);
      
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }
      
      // Validate and clean task data
      const validatedTasks = tasks.map((task: Record<string, unknown>, index: number) => ({
        title: String(task.title || `Task ${index + 1}`).substring(0, 255),
        description: task.description ? String(task.description).substring(0, 1000) : null,
        install_order: typeof task.install_order === 'number' ? task.install_order : index + 1,
        room_zone: task.room_zone ? String(task.room_zone).substring(0, 100) : null,
        estimated_time_minutes: typeof task.estimated_time_minutes === 'number' ? Math.max(5, task.estimated_time_minutes) : 60,
        total_qty: typeof task.total_qty === 'number' ? Math.max(1, task.total_qty) : 1,
        dependencies: Array.isArray(task.dependencies) ? task.dependencies.filter((dep: unknown): dep is string => typeof dep === 'string') : []
      }));

      // console.log(`Generated ${validatedTasks.length} tasks from ${documentTitle}`);
      return validatedTasks;
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse task generation response. The AI may have returned invalid JSON.');
    }
  } catch (error) {
    console.error('Error generating tasks from text:', error);
    throw error;
  }
};

export const generateTasksFromSelectedDocuments = async (jobId: string, documentIds: string[]): Promise<GeneratedTaskData[]> => {
  // console.log(`Generating tasks from ${documentIds.length} selected documents for job ${jobId}...`);
  
  try {
    if (documentIds.length === 0) {
      throw new Error('No documents selected for task generation.');
    }

    // Fetch the selected documents
    const { data: documents, error: docError } = await supabase
      .from('job_documents')
      .select('*')
      .eq('job_id', jobId)
      .in('id', documentIds)
      .in('file_ext', ['pdf', 'PDF']);

    if (docError) {
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    if (!documents || documents.length === 0) {
      throw new Error('No valid PDF documents found from selection.');
    }

    // console.log(`Found ${documents.length} PDF document(s) to process`);

    let allTasks: GeneratedTaskData[] = [];
    let processedCount = 0;

    // Process each selected PDF document
    for (const doc of documents) {
      // console.log(`Processing document: ${doc.title}`);
      
      try {
        // Get signed URL to download the file
        // console.log(`Attempting to get signed URL for: ${doc.title} at path: ${doc.storage_path}`);
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('job-docs')
          .createSignedUrl(doc.storage_path, 60 * 60); // 1 hour expiry

        if (urlError) {
          console.warn(`Failed to get signed URL for ${doc.title}: ${urlError.message}. Path: ${doc.storage_path}`);
          console.warn('This may be due to invalid characters in the file path. Please re-upload the document.');
          continue;
        }

        // Fetch the file
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          console.warn(`Failed to download ${doc.title}: ${response.status} ${response.statusText}`);
          continue;
        }

        const blob = await response.blob();
        const file = new File([blob], doc.title, { type: 'application/pdf' });

        // Extract text from PDF
        const extractedText = await extractTextFromPdf(file);
        
        if (extractedText.length < 50) {
          console.warn(`Document ${doc.title} contains very little text, skipping...`);
          continue;
        }

        // Generate tasks from text
        const documentTasks = await generateTasksFromText(extractedText, doc.title);
        
        // Add document reference and adjust install order to avoid conflicts
        const adjustedTasks = documentTasks.map((task) => ({
          ...task,
          install_order: allTasks.length + task.install_order,
          description: task.description ? `${task.description} (from ${doc.title})` : `Task from ${doc.title}`
        }));

        allTasks.push(...adjustedTasks);
        processedCount++;
        // console.log(`Generated ${documentTasks.length} tasks from ${doc.title}`);
        
      } catch (docError) {
        console.error(`Error processing document ${doc.title}:`, docError);
        // Continue with other documents
      }
    }

    if (allTasks.length === 0) {
      throw new Error(`No tasks could be generated from the ${processedCount} selected document(s). Please ensure the PDFs contain installation-related content.`);
    }

    // Sort tasks by install_order
    allTasks.sort((a, b) => a.install_order - b.install_order);

    // console.log(`Successfully generated ${allTasks.length} total tasks from ${processedCount} document(s)`);
    return allTasks;

  } catch (error) {
    console.error('Error in generateTasksFromSelectedDocuments:', error);
    throw error;
  }
};