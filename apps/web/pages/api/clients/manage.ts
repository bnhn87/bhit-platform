import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { requireAuth } from '../../../lib/apiAuth';
import { validateRequestBody, ClientSchema } from '../../../lib/apiValidation';

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
                const { email, company, id } = req.query;

                if (id) {
                    // Get specific client with addresses
                    const { data: client, error: clientError } = await supabase
                        .from('clients')
                        .select(`
                            *,
                            addresses:client_addresses(*)
                        `)
                        .eq('id', id)
                        .single();

                    if (clientError) {
                        return res.status(404).json({ error: 'Client not found' });
                    }

                    return res.status(200).json(client);
                }

                // Search clients
                let query = supabase.from('clients').select('*');

                if (email) {
                    query = query.ilike('email', `%${email}%`);
                } else if (company) {
                    query = query.ilike('company_name', `%${company}%`);
                } else {
                    // Get all clients
                    query = query.limit(10);
                }

                const { data: clients, error } = await query;

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                return res.status(200).json(clients || []);
            }

            case 'POST': {
                // Validate request body
                const validatedData = validateRequestBody(ClientSchema, req, res);
                if (!validatedData) {
                    return; // validateRequestBody already sent 400 response
                }

                const { name, company_name, email, phone } = validatedData;

                // Check if client exists
                if (email) {
                    const { data: existing } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (existing) {
                        return res.status(200).json(existing);
                    }
                }

                // Create new client
                const { data: newClient, error } = await supabase
                    .from('clients')
                    .insert({
                        name,
                        company_name: company_name || name,
                        email,
                        phone,
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('[clients/manage] Create error:', error);
                    return res.status(500).json({ error: 'Failed to create client', details: error.message });
                }

                return res.status(201).json(newClient);
            }

            case 'PUT': {
                const { id } = req.query;

                if (!id || typeof id !== 'string') {
                    return res.status(400).json({ error: 'Valid client ID is required' });
                }

                // Validate request body (partial updates allowed)
                const validatedData = validateRequestBody(ClientSchema.partial(), req, res);
                if (!validatedData) {
                    return; // validateRequestBody already sent 400 response
                }

                const { data: updatedClient, error } = await supabase
                    .from('clients')
                    .update({
                        ...validatedData,
                        updated_by: user.id,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    console.error('[clients/manage] Update error:', error);
                    return res.status(500).json({ error: 'Failed to update client', details: error.message });
                }

                return res.status(200).json(updatedClient);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                res.status(405).end(`Method ${method} Not Allowed`);
                return;
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
}