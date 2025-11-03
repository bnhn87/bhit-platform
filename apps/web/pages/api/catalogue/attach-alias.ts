import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = supabaseAdmin;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '')
    );

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const {
            productCode,      // The new alias to attach
            targetProductId,  // The product to attach it to
            aliasType = 'code',
            quoteContext      // Optional: which quote this came from
        } = req.body;

        if (!productCode || !targetProductId) {
            return res.status(400).json({
                error: 'Missing required fields: productCode and targetProductId'
            });
        }

        // Check if the alias already exists
        const { data: existingAlias, error: checkError } = await supabase
            .from('product_aliases')
            .select('id, product_id')
            .eq('alias_code', productCode)
            .single();

        if (existingAlias) {
            // If it exists but points to a different product, we need to update it
            if ((existingAlias as any).product_id !== targetProductId) {
                const { error: updateError } = await supabase
                    .from('product_aliases')
                    .update({
                        product_id: targetProductId,
                        usage_count: 0, // Reset usage count when reassigning
                        created_by: user.id,
                        created_at: new Date().toISOString()
                    })
                    .eq('id', (existingAlias as any).id);

                if (updateError) throw updateError;

                return res.status(200).json({
                    message: 'Alias reassigned to new product',
                    aliasCode: productCode,
                    productId: targetProductId
                });
            } else {
                return res.status(200).json({
                    message: 'Alias already attached to this product',
                    aliasCode: productCode,
                    productId: targetProductId
                });
            }
        }

        // Create new alias
        const { data: newAlias, error: insertError } = await supabase
            .from('product_aliases')
            .insert({
                product_id: targetProductId,
                alias_code: productCode,
                alias_type: aliasType,
                created_by: user.id,
                learned_from_quote: quoteContext
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Get the product details to return
        const { data: product, error: productError } = await supabase
            .from('product_catalogue_items')
            .select('canonical_name, canonical_code, install_time_hours')
            .eq('id', targetProductId)
            .single();

        if (productError) throw productError;

        return res.status(201).json({
            message: 'Alias attached successfully',
            alias: newAlias,
            product: product,
            recommendation: `Future quotes with "${productCode}" will now automatically use ${product.install_time_hours} hours`
        });

    } catch (error) {
        console.error('Attach alias error:', error);
        return res.status(500).json({
            error: 'Failed to attach alias',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}