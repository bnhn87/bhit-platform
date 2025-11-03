import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        switch (method) {
            case 'GET': {
                const { client_id, recent, type } = req.query;

                if (recent) {
                    // Get recent addresses across all clients
                    const { data: addresses, error } = await supabase
                        .from('client_addresses')
                        .select(`
                            *,
                            clients:client_id(name, company_name)
                        `)
                        .eq('is_active', true)
                        .order('updated_at', { ascending: false })
                        .limit(parseInt(recent as string) || 10);

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
                const {
                    client_id,
                    address_type,
                    label,
                    address_line1,
                    address_line2,
                    city,
                    postcode,
                    has_loading_bay,
                    access_restrictions,
                    contact_name,
                    contact_phone,
                    is_default
                } = req.body;

                if (!client_id || !address_type || !label || !address_line1 || !city || !postcode) {
                    return res.status(400).json({
                        error: 'Required fields: client_id, address_type, label, address_line1, city, postcode'
                    });
                }

                // If setting as default, unset other defaults of same type
                if (is_default) {
                    await supabase
                        .from('client_addresses')
                        .update({ is_default: false })
                        .eq('client_id', client_id)
                        .eq('address_type', address_type);
                }

                const { data: newAddress, error } = await supabase
                    .from('client_addresses')
                    .insert({
                        client_id,
                        address_type,
                        label,
                        address_line1,
                        address_line2,
                        city,
                        postcode: postcode.toUpperCase(),
                        has_loading_bay: has_loading_bay || false,
                        access_restrictions,
                        contact_name,
                        contact_phone,
                        is_default: is_default || false
                    })
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
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