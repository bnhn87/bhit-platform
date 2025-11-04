// ============================================================================
// SmartQuote v3 - Template Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import { QuoteTemplate, Quote, QuoteDetails, CalculatedProduct } from '../types';

class TemplateService {
    /**
     * Save quote as template
     */
    async saveAsTemplate(
        quote: Quote,
        name: string,
        category?: string,
        options?: {
            description?: string;
            tags?: string[];
            variables?: string[];
            variableDescriptions?: Record<string, string>;
            isPublic?: boolean;
        }
    ): Promise<{ success: boolean; data?: QuoteTemplate; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Create template data from quote
            const templateData = {
                quoteDetails: quote.quoteDetails,
                products: quote.products,
                defaultValues: {
                    preparedBy: quote.quoteDetails.preparedBy,
                    upliftViaStairs: quote.quoteDetails.upliftViaStairs,
                    extendedUplift: quote.quoteDetails.extendedUplift,
                },
            };

            const { data, error } = await supabase
                .from('smartquote_v3_templates')
                .insert({
                    name,
                    description: options?.description,
                    category,
                    tags: options?.tags || [],
                    template_data: templateData,
                    variables: options?.variables || [],
                    variable_descriptions: options?.variableDescriptions || {},
                    is_public: options?.isPublic || false,
                    created_by: userId,
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data: data as QuoteTemplate };
        } catch (error) {
            console.error('Failed to save template:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save template',
            };
        }
    }

    /**
     * Apply template to create new quote
     */
    async applyTemplate(
        templateId: string,
        variableValues?: Record<string, string>
    ): Promise<{
        success: boolean;
        data?: { quoteDetails: Partial<QuoteDetails>; products: Partial<CalculatedProduct>[] };
        error?: string;
    }> {
        try {
            // Get template
            const { data: template, error } = await supabase
                .from('smartquote_v3_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error || !template) {
                return { success: false, error: 'Template not found' };
            }

            // Clone template data
            let quoteDetails = JSON.parse(JSON.stringify(template.template_data.quoteDetails));
            let products = JSON.parse(JSON.stringify(template.template_data.products));

            // Replace variables if provided
            if (variableValues && template.variables) {
                const dataStr = JSON.stringify({ quoteDetails, products });
                let replacedStr = dataStr;

                for (const variable of template.variables) {
                    if (variableValues[variable]) {
                        const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                        replacedStr = replacedStr.replace(regex, variableValues[variable]);
                    }
                }

                const replaced = JSON.parse(replacedStr);
                quoteDetails = replaced.quoteDetails;
                products = replaced.products;
            }

            // Update usage stats
            await supabase
                .from('smartquote_v3_templates')
                .update({
                    usage_count: template.usage_count + 1,
                    last_used_at: new Date().toISOString(),
                })
                .eq('id', templateId);

            return {
                success: true,
                data: { quoteDetails, products },
            };
        } catch (error) {
            console.error('Failed to apply template:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to apply template',
            };
        }
    }

    /**
     * Get all templates
     */
    async getTemplates(options?: {
        category?: string;
        searchTerm?: string;
        publicOnly?: boolean;
    }): Promise<QuoteTemplate[]> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            let query = supabase
                .from('smartquote_v3_templates')
                .select('*')
                .eq('is_active', true)
                .order('usage_count', { ascending: false });

            if (options?.category) {
                query = query.eq('category', options.category);
            }

            if (options?.searchTerm) {
                query = query.or(
                    `name.ilike.%${options.searchTerm}%,description.ilike.%${options.searchTerm}%`
                );
            }

            if (options?.publicOnly) {
                query = query.eq('is_public', true);
            } else if (userId) {
                // Show public templates + user's own templates
                query = query.or(`is_public.eq.true,created_by.eq.${userId}`);
            } else {
                query = query.eq('is_public', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data as QuoteTemplate[];
        } catch (error) {
            console.error('Failed to get templates:', error);
            return [];
        }
    }

    /**
     * Get template by ID
     */
    async getTemplate(templateId: string): Promise<QuoteTemplate | null> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) throw error;

            return data as QuoteTemplate;
        } catch (error) {
            console.error('Failed to get template:', error);
            return null;
        }
    }

    /**
     * Update template
     */
    async updateTemplate(
        templateId: string,
        updates: Partial<QuoteTemplate>
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            // Check ownership
            const { data: template } = await supabase
                .from('smartquote_v3_templates')
                .select('created_by')
                .eq('id', templateId)
                .single();

            if (!template || template.created_by !== userId) {
                return { success: false, error: 'You can only edit your own templates' };
            }

            const { error } = await supabase
                .from('smartquote_v3_templates')
                .update(updates)
                .eq('id', templateId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Failed to update template:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update template',
            };
        }
    }

    /**
     * Delete template
     */
    async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            // Check ownership
            const { data: template } = await supabase
                .from('smartquote_v3_templates')
                .select('created_by')
                .eq('id', templateId)
                .single();

            if (!template || template.created_by !== userId) {
                return { success: false, error: 'You can only delete your own templates' };
            }

            // Soft delete
            const { error } = await supabase
                .from('smartquote_v3_templates')
                .update({
                    is_active: false,
                    archived_at: new Date().toISOString(),
                })
                .eq('id', templateId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Failed to delete template:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete template',
            };
        }
    }

    /**
     * Get template categories
     */
    async getCategories(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_templates')
                .select('category')
                .eq('is_active', true)
                .not('category', 'is', null);

            if (error) throw error;

            const categories = [...new Set(data.map((t) => t.category).filter(Boolean))];
            return categories as string[];
        } catch (error) {
            console.error('Failed to get categories:', error);
            return [];
        }
    }

    /**
     * Get popular templates
     */
    async getPopularTemplates(limit: number = 10): Promise<QuoteTemplate[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_templates')
                .select('*')
                .eq('is_active', true)
                .eq('is_public', true)
                .order('usage_count', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data as QuoteTemplate[];
        } catch (error) {
            console.error('Failed to get popular templates:', error);
            return [];
        }
    }
}

export const templateService = new TemplateService();
