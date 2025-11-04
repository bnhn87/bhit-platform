import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabase = supabaseAdmin;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '')
    );

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        switch (req.method) {
            case 'GET':
                // Get all products with their aliases
                const { data: products, error: fetchError } = await supabase
                    .from('product_catalogue_view')
                    .select('*')
                    .order('canonical_name');

                if (fetchError) throw fetchError;
                return res.status(200).json({ products });

            case 'POST':
                // Create a new product or save from manual entry
                const {
                    productCode,
                    productName,
                    installTimeHours,
                    wasteVolumeM3,
                    dimensions,
                    category,
                    source = 'manual',
                    aliases = []
                } = req.body;

                // Insert the main product
                const { data: newProduct, error: insertError } = await (supabase
                    .from('product_catalogue_items') as any)
                    .insert({
                        canonical_code: productCode,
                        canonical_name: productName,
                        install_time_hours: installTimeHours,
                        waste_volume_m3: wasteVolumeM3 || 0.035,
                        dimensions_format: dimensions?.format,
                        dimension_l: dimensions?.l,
                        dimension_w: dimensions?.w,
                        dimension_h: dimensions?.h,
                        dimension_d: dimensions?.d,
                        category,
                        source,
                        created_by: user.id
                    })
                    .select()
                    .single();

                if (insertError) {
                    // If product exists, update it instead
                    if (insertError.code === '23505') {
                        const { data: updatedProduct, error: updateError } = await (supabase
                            .from('product_catalogue_items') as any)
                            .update({
                                install_time_hours: installTimeHours,
                                waste_volume_m3: wasteVolumeM3 || 0.035,
                                updated_by: user.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('canonical_code', productCode)
                            .eq('locked', false) // Only update if not locked
                            .select()
                            .single();

                        if (updateError) throw updateError;

                        // Add any new aliases
                        if (aliases.length > 0 && updatedProduct) {
                            await addAliases(supabase, updatedProduct.id, aliases, user.id);
                        }

                        return res.status(200).json({
                            product: updatedProduct,
                            message: 'Product updated successfully'
                        });
                    }
                    throw insertError;
                }

                // Add aliases if provided
                if (aliases.length > 0 && newProduct) {
                    await addAliases(supabase, newProduct.id, aliases, user.id);
                }

                return res.status(201).json({
                    product: newProduct,
                    message: 'Product created successfully'
                });

            case 'PUT':
                // Update existing product
                const { id, ...updateData } = req.body;

                const { data: updated, error: updateError } = await (supabase
                    .from('product_catalogue_items') as any)
                    .update({
                        ...updateData,
                        updated_by: user.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .eq('locked', false) // Only update if not locked
                    .select()
                    .single();

                if (updateError) throw updateError;
                return res.status(200).json({ product: updated });

            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Catalogue API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

async function addAliases(
    supabase: any,
    productId: string,
    aliases: string[],
    userId: string
) {
    const aliasInserts = aliases.map(alias => ({
        product_id: productId,
        alias_code: alias,
        alias_type: 'code',
        created_by: userId
    }));

    const { error } = await supabase
        .from('product_aliases')
        .insert(aliasInserts)
        .select();

    if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error adding aliases:', error);
    }
}