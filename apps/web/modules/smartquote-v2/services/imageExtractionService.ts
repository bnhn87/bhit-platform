// ========================================
// SmartQuote v2.0 - Image Extraction Service
// ========================================
// Features:
// - Extract images from PDF documents
// - Upload and manage images
// - Generate thumbnails
// - Track image usage in quotes

import { supabase } from '../../../lib/supabaseClient';
import {
    QuoteImage,
    ImageExtractionService as IImageExtractionService
} from '../types';

// Type for PDF.js import
declare const pdfjsLib: any;

class ImageExtractionService implements IImageExtractionService {
    
    // Extract all images from a PDF
    async extractImagesFromPDF(
        pdfData: string | Uint8Array,
        quoteId: string
    ): Promise<QuoteImage[]> {
        try {
            // Load PDF.js (assumes it's available globally via CDN)
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }
            
            // Convert base64 to Uint8Array if needed
            const pdfBytes = typeof pdfData === 'string' 
                ? this.base64ToUint8Array(pdfData)
                : pdfData;
            
            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
            const pdf = await loadingTask.promise;
            
            const extractedImages: QuoteImage[] = [];
            
            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                
                const operatorList = await page.getOperatorList();
                const imagePositions: any[] = [];
                
                // Find image operations
                for (let i = 0; i < operatorList.fnArray.length; i++) {
                    // 82 = paintImageXObject operation
                    if (operatorList.fnArray[i] === 82) {
                        imagePositions.push({
                            index: i,
                            args: operatorList.argsArray[i]
                        });
                    }
                }
                
                // Extract images for this page
                if (imagePositions.length > 0) {
                    const pageImages = await this.extractPageImages(
                        page,
                        imagePositions,
                        quoteId,
                        pageNum
                    );
                    extractedImages.push(...pageImages);
                }
            }
            
            return extractedImages;
            
        } catch (error: unknown) {
            console.error('Error extracting images from PDF:', error);
            throw error;
        }
    }
    
    // Extract images from a specific page
    private async extractPageImages(
        page: any,
        imagePositions: any[],
        quoteId: string,
        pageNum: number
    ): Promise<QuoteImage[]> {
        const images: QuoteImage[] = [];
        
        try {
            // Render page to canvas to capture images
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) return images;
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), 'image/png');
            });
            
            // Upload to storage
            const filename = `page_${pageNum}.png`;
            const storagePath = `quotes/${quoteId}/images/${filename}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('quote-images')
                .upload(storagePath, blob, {
                    contentType: 'image/png',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('Upload error:', uploadError);
                return images;
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('quote-images')
                .getPublicUrl(storagePath);
            
            // Create image record
            const { data: imageRecord, error: dbError } = await supabase
                .from('smartquote_v2_quote_images')
                .insert({
                    quote_id: quoteId,
                    image_url: urlData.publicUrl,
                    storage_path: storagePath,
                    filename: filename,
                    mime_type: 'image/png',
                    file_size: blob.size,
                    source_type: 'pdf',
                    page_number: pageNum,
                    extraction_method: 'pdfjs',
                    width: canvas.width,
                    height: canvas.height,
                    display_order: images.length
                })
                .select()
                .single();
            
            if (!dbError && imageRecord) {
                images.push(imageRecord);
            }
            
        } catch (error: unknown) {
            console.error(`Error extracting images from page ${pageNum}:`, error);
        }
        
        return images;
    }
    
    // Upload an image manually
    async uploadImage(
        quoteId: string,
        imageData: Blob,
        metadata: Partial<QuoteImage>
    ): Promise<QuoteImage> {
        try {
            const filename = metadata.filename || `image_${Date.now()}.png`;
            const storagePath = `quotes/${quoteId}/images/${filename}`;
            
            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('quote-images')
                .upload(storagePath, imageData, {
                    contentType: metadata.mimeType || 'image/png',
                    upsert: false
                });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('quote-images')
                .getPublicUrl(storagePath);
            
            // Create image record
            const { data: imageRecord, error: dbError } = await supabase
                .from('smartquote_v2_quote_images')
                .insert({
                    quote_id: quoteId,
                    image_url: urlData.publicUrl,
                    storage_path: storagePath,
                    filename: filename,
                    mime_type: metadata.mimeType || 'image/png',
                    file_size: imageData.size,
                    source_type: metadata.sourceType || 'upload',
                    width: metadata.width,
                    height: metadata.height,
                    display_order: metadata.displayOrder || 0,
                    included_in_output: metadata.includedInOutput ?? true
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            
            return imageRecord;
            
        } catch (error: unknown) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }
    
    // Get all images for a quote
    async getQuoteImages(quoteId: string): Promise<QuoteImage[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_quote_images')
                .select('*')
                .eq('quote_id', quoteId)
                .order('display_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
            
        } catch (error: unknown) {
            console.error('Error fetching quote images:', error);
            return [];
        }
    }
    
    // Delete an image
    async deleteImage(imageId: string): Promise<void> {
        try {
            // Get image record
            const { data: image, error: fetchError } = await supabase
                .from('smartquote_v2_quote_images')
                .select('storage_path')
                .eq('id', imageId)
                .single();
            
            if (fetchError || !image) throw new Error('Image not found');
            
            // Delete from storage
            await supabase.storage
                .from('quote-images')
                .remove([image.storage_path]);
            
            // Delete database record
            await supabase
                .from('smartquote_v2_quote_images')
                .delete()
                .eq('id', imageId);
                
        } catch (error: unknown) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }
    
    // Helper: Convert base64 to Uint8Array
    private base64ToUint8Array(base64: string): Uint8Array {
        const binaryString = atob(base64.split(',')[1] || base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    
    // Create thumbnail for an image
    async createThumbnail(imageUrl: string, maxWidth: number = 200): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                
                const scale = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = imageUrl;
        });
    }
}

export const imageExtractionService = new ImageExtractionService();
export default imageExtractionService;
