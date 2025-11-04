import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/apiAuth';
import { validateRequestBody, ClientAddressSchema } from '../../../lib/apiValidation';
import { safeParseIntWithDefault } from '../../../lib/safeParsing';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    // Require authentication for all methods
    const user = await requireAuth(req, res);
    if (!user) {
        return; // requireAuth already sent 401 response
    }

    try {
        switch (method) {
            case 'GET': {
                const { client_id, recent, type } = req.query;

                if (recent) {
                    // Get recent addresses across all clients
                    const limit = safeParseIntWithDefault(recent as string, 10);
                    if (limit < 1 || limit > 100) {
                        return res.status(400).json({ error: 'Limit must be between 1 and 100' });
                    }

                    const { data: addresses, error } = await supabase
                        .from('client_addresses')
                        .select(`
                            *,
                            clients:client_id(name, company_name)
                        `)
                        .eq('is_active', true)
                        .order('updated_at', { ascending: false })
                        .limit(limit);

                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }

                    return res.status(200).json(addresses || []);
                }

                if (client_id) {
                    // Get addresses for specific client
                    let query = supabase
                        .from('client_addresses')
                        .select('*')
                        .eq('client_id', client_id)
                        .eq('is_active', true);

                    if (type) {
                        query = query.eq('address_type', type);
                    }

                    const { data: addresses, error } = await query.order('is_default', { ascending: false });

                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }

                    return res.status(200).json(addresses || []);
                }

                return res.status(400).json({ error: 'Either client_id or recent parameter is required' });
            }

            case 'POST': {
                // Validate request body
                const validatedData = validateRequestBody(ClientAddressSchema, req, res);
                if (!validatedData) {
                    return; // validateRequestBody already sent 400 response
                }

                const {
                    client_id,
                    address_line1,
                    address_line2,
                    city,
                    postcode,
                    type: address_type,
                    is_primary
                } = validatedData;

                // If setting as primary, unset other primary addresses of same type
                if (is_primary && client_id && address_type) {
                    await supabase
                        .from('client_addresses')
                        .update({ is_primary: false })
                        .eq('client_id', client_id)
                        .eq('type', address_type);
                }

                const { data: newAddress, error } = await supabase
                    .from('client_addresses')
                    .insert({
                        ...validatedData,
                        postcode: postcode.toUpperCase(),
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('[clients/addresses] Create error:', error);
                    return res.status(500).json({ error: 'Failed to create address', details: error.message });
                }

                return res.status(201).json(newAddress);
            }

            case 'PUT': {
                const { id } = req.query;
                const updates = req.body;

                if (!id) {
                    return res.status(400).json({ error: 'Address ID is required' });
                }

                // If setting as default, unset other defaults of same type
                if (updates.is_default) {
                    const { data: currentAddress } = await supabase
                        .from('client_addresses')
                        .select('client_id, address_type')
                        .eq('id', id)
                        .single();

                    if (currentAddress) {
                        await supabase
                            .from('client_addresses')
                            .update({ is_default: false })
                            .eq('client_id', currentAddress.client_id)
                            .eq('address_type', currentAddress.address_type)
                            .neq('id', id);
                    }
                }

                const { data: updatedAddress, error } = await supabase
                    .from('client_addresses')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json(updatedAddress);
            }

            case 'DELETE': {
                const { id } = req.query;

                if (!id) {
                    return res.status(400).json({ error: 'Address ID is required' });
                }

                // Soft delete by setting is_active to false
                const { error } = await supabase
                    .from('client_addresses')
                    .update({ is_active: false })
                    .eq('id', id);

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json({ success: true });
            }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
                res.status(405).end(`Method ${method} Not Allowed`);
                return;
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
}