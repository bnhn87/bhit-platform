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
                    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
                }

                return res.status(200).json(clients || []);
            }

            case 'POST': {
                const { name, company_name, email, phone } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Name is required' });
                }

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
                        phone
                    })
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
                }

                return res.status(201).json(newClient);
            }

            case 'PUT': {
                const { id } = req.query;
                const updates = req.body;

                if (!id) {
                    return res.status(400).json({ error: 'Client ID is required' });
                }

                const { data: updatedClient, error } = await supabase
                    .from('clients')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
                }

                return res.status(200).json(updatedClient);
            }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT']);
                res.status(405).end(`Method ${method} Not Allowed`);
                return;
        }
    } catch (error: unknown) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
}