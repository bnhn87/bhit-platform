import { supabase } from '@/lib/supabaseClient';

export interface ClientAddress {
    id: string;
    client_id: string;
    address_type: 'main' | 'site' | 'collection' | 'warehouse' | 'billing' | 'other';
    label: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    country?: string;
    has_loading_bay?: boolean;
    access_restrictions?: string;
    contact_name?: string;
    contact_phone?: string;
    in_ulez_zone?: boolean;
    in_congestion_zone?: boolean;
    distance_from_base_miles?: number;
    travel_time_minutes?: number;
    is_default?: boolean;
    is_active?: boolean;
}

export interface Client {
    id: string;
    name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    addresses?: ClientAddress[];
}

export interface AddressWithDistance {
    address: ClientAddress;
    client: Client;
    distance_to_site?: number;
    total_journey_miles?: number;
    estimated_travel_time?: number;
}

class ClientService {
    /**
     * Search for a client by email or company name
     */
    async searchClient(query: string): Promise<Client | null> {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .or(`email.ilike.%${query}%,company_name.ilike.%${query}%,name.ilike.%${query}%`)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found is ok
                console.error('Error searching client:', error);
                return null;
            }

            return data;
        } catch (error: unknown) {
            console.error('Error in searchClient:', error);
            return null;
        }
    }

    /**
     * Get or create a client based on quote details
     */
    async getOrCreateClient(
        clientName: string,
        email?: string,
        companyName?: string
    ): Promise<Client | null> {
        try {
            // Try to find existing client
            if (email) {
                const existing = await this.searchClient(email);
                if (existing) return existing;
            }

            // Create new client
            const { data, error } = await supabase
                .from('clients')
                .insert({
                    name: clientName,
                    email: email || null,
                    company_name: companyName || clientName,
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating client:', error);
                return null;
            }

            return data;
        } catch (error: unknown) {
            console.error('Error in getOrCreateClient:', error);
            return null;
        }
    }

    /**
     * Get all addresses for a client
     */
    async getClientAddresses(clientId: string): Promise<ClientAddress[]> {
        try {
            const { data, error } = await supabase
                .from('client_addresses')
                .select('*')
                .eq('client_id', clientId)
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching addresses:', error);
                return [];
            }

            return data || [];
        } catch (error: unknown) {
            console.error('Error in getClientAddresses:', error);
            return [];
        }
    }

    /**
     * Add a new address for a client
     */
    async addClientAddress(
        clientId: string,
        address: Omit<ClientAddress, 'id' | 'client_id'>
    ): Promise<ClientAddress | null> {
        try {
            const { data, error } = await supabase
                .from('client_addresses')
                .insert({
                    client_id: clientId,
                    ...address
                })
                .select()
                .single();

            if (error) {
                console.error('Error adding address:', error);
                return null;
            }

            return data;
        } catch (error: unknown) {
            console.error('Error in addClientAddress:', error);
            return null;
        }
    }

    /**
     * Parse an address string into structured format
     */
    parseAddressString(addressString: string): Partial<ClientAddress> {
        const lines = addressString.trim().split('\n').filter(line => line.trim());
        const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;

        // Find the postcode line
        let postcodeLineIndex = -1;
        let postcode = '';

        for (let i = lines.length - 1; i >= 0; i--) {
            const match = lines[i].match(postcodeRegex);
            if (match) {
                postcode = match[1].toUpperCase();
                postcodeLineIndex = i;
                break;
            }
        }

        if (!postcode || lines.length < 3) {
            throw new Error('Invalid UK address format. Address must have at least 3 lines including a valid UK postcode.');
        }

        // Parse the address components
        const result: Partial<ClientAddress> = {
            postcode: postcode
        };

        // The line with postcode might also have the city
        const postcodeLineParts = lines[postcodeLineIndex].replace(postcodeRegex, '').trim();
        if (postcodeLineParts) {
            result.city = postcodeLineParts;
        } else if (postcodeLineIndex > 0) {
            result.city = lines[postcodeLineIndex - 1];
        }

        // First line is usually the company/building name
        if (lines.length > 0) {
            result.address_line1 = lines[0];
        }

        // Second line might be the street/unit
        if (lines.length > 1 && postcodeLineIndex > 1) {
            result.address_line2 = lines[1];
        }

        return result;
    }

    /**
     * Calculate logistics for a quote with multiple addresses
     */
    async calculateLogistics(
        sitePostcode: string,
        collectionPostcode?: string,
        clientId?: string
    ): Promise<{
        totalDistance: number;
        totalTravelTime: number;
        ulezCharges: number;
        congestionCharges: number;
        route: Array<{ from: string; to: string; miles: number; minutes: number }>;
    }> {
        const bhitBase = 'SE1 4AA'; // BHIT base location
        const route = [];
        let totalDistance = 0;
        let totalTravelTime = 0;
        let ulezCharges = 0;
        let congestionCharges = 0;

        try {
            // If there's a collection address, route is: Base -> Collection -> Site -> Base
            if (collectionPostcode) {
                // Base to Collection
                const { data: leg1 } = await supabase.rpc('calculate_postcode_distance', {
                    postcode1: bhitBase,
                    postcode2: collectionPostcode
                });

                if (leg1) {
                    route.push({
                        from: 'BHIT Base',
                        to: 'Collection Point',
                        miles: leg1[0].distance_miles,
                        minutes: leg1[0].travel_time_minutes
                    });
                    totalDistance += leg1[0].distance_miles;
                    totalTravelTime += leg1[0].travel_time_minutes;
                }

                // Collection to Site
                const { data: leg2 } = await supabase.rpc('calculate_postcode_distance', {
                    postcode1: collectionPostcode,
                    postcode2: sitePostcode
                });

                if (leg2) {
                    route.push({
                        from: 'Collection Point',
                        to: 'Site',
                        miles: leg2[0].distance_miles,
                        minutes: leg2[0].travel_time_minutes
                    });
                    totalDistance += leg2[0].distance_miles;
                    totalTravelTime += leg2[0].travel_time_minutes;
                }

                // Check ULEZ for collection
                const { data: collectionUlez } = await supabase.rpc('is_in_ulez_zone', {
                    postcode: collectionPostcode
                });
                if (collectionUlez) ulezCharges += 12.50;

            } else {
                // Direct: Base -> Site
                const { data: leg1 } = await supabase.rpc('calculate_postcode_distance', {
                    postcode1: bhitBase,
                    postcode2: sitePostcode
                });

                if (leg1) {
                    route.push({
                        from: 'BHIT Base',
                        to: 'Site',
                        miles: leg1[0].distance_miles,
                        minutes: leg1[0].travel_time_minutes
                    });
                    totalDistance += leg1[0].distance_miles;
                    totalTravelTime += leg1[0].travel_time_minutes;
                }
            }

            // Site back to Base
            const { data: returnLeg } = await supabase.rpc('calculate_postcode_distance', {
                postcode1: sitePostcode,
                postcode2: bhitBase
            });

            if (returnLeg) {
                route.push({
                    from: 'Site',
                    to: 'BHIT Base',
                    miles: returnLeg[0].distance_miles,
                    minutes: returnLeg[0].travel_time_minutes
                });
                totalDistance += returnLeg[0].distance_miles;
                totalTravelTime += returnLeg[0].travel_time_minutes;
            }

            // Check ULEZ and congestion for site
            const { data: siteUlez } = await supabase.rpc('is_in_ulez_zone', {
                postcode: sitePostcode
            });
            if (siteUlez) ulezCharges += 12.50;

            const { data: siteCongestion } = await supabase.rpc('is_in_congestion_zone', {
                postcode: sitePostcode
            });
            if (siteCongestion) congestionCharges += 15.00;

        } catch (error: unknown) {
            console.error('Error calculating logistics:', error);
        }

        return {
            totalDistance,
            totalTravelTime,
            ulezCharges,
            congestionCharges,
            route
        };
    }

    /**
     * Get recent addresses across all clients for quick selection
     */
    async getRecentAddresses(limit: number = 10): Promise<ClientAddress[]> {
        try {
            const { data, error } = await supabase
                .from('client_addresses')
                .select(`
                    *,
                    clients:client_id(name, company_name)
                `)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching recent addresses:', error);
                return [];
            }

            return data || [];
        } catch (error: unknown) {
            console.error('Error in getRecentAddresses:', error);
            return [];
        }
    }

    /**
     * Link a quote to a client and addresses
     */
    async linkQuoteToClient(
        quoteId: string,
        clientId: string,
        siteAddressId?: string,
        collectionAddressId?: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('quote_clients')
                .insert({
                    quote_id: quoteId,
                    client_id: clientId,
                    site_address_id: siteAddressId || null,
                    collection_address_id: collectionAddressId || null
                });

            if (error) {
                console.error('Error linking quote to client:', error);
                return false;
            }

            return true;
        } catch (error: unknown) {
            console.error('Error in linkQuoteToClient:', error);
            return false;
        }
    }
}

export const clientService = new ClientService();