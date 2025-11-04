import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteSegment {
    from: string;
    to: string;
    miles: number;
    minutes: number;
    fromPostcode: string;
    toPostcode: string;
}

interface LogisticsResult {
    totalDistance: number;
    totalTravelTime: number;
    ulezCharges: number;
    congestionCharges: number;
    route: RouteSegment[];
    warnings: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    try {
        const { sitePostcode, collectionPostcode, clientId } = req.body;

        if (!sitePostcode) {
            return res.status(400).json({ error: 'Site postcode is required' });
        }

        const bhitBase = 'SE1 4AA'; // BHIT base location
        const route: RouteSegment[] = [];
        let totalDistance = 0;
        let totalTravelTime = 0;
        let ulezCharges = 0;
        let congestionCharges = 0;
        const warnings: string[] = [];

        // Helper function to calculate distance between two postcodes
        const calculateDistance = async (from: string, to: string, fromLabel: string, toLabel: string) => {
            const { data, error } = await supabase.rpc('calculate_postcode_distance', {
                postcode1: from,
                postcode2: to
            });

            if (error || !data || data.length === 0) {
                warnings.push(`Could not calculate distance from ${fromLabel} to ${toLabel}`);
                return null;
            }

            return {
                from: fromLabel,
                to: toLabel,
                miles: data[0].distance_miles,
                minutes: data[0].travel_time_minutes,
                fromPostcode: from,
                toPostcode: to
            };
        };

        // Check ULEZ and congestion charges
        const checkCharges = async (postcode: string, label: string) => {
            const { data: ulezData } = await supabase.rpc('is_in_ulez_zone', { postcode });
            const { data: congestionData } = await supabase.rpc('is_in_congestion_zone', { postcode });

            if (ulezData) {
                ulezCharges += 12.50;
                warnings.push(`${label} is in ULEZ zone - £12.50 daily charge`);
            }
            if (congestionData) {
                congestionCharges += 15.00;
                warnings.push(`${label} is in Congestion zone - £15.00 daily charge`);
            }
        };

        // Calculate route
        if (collectionPostcode && collectionPostcode !== sitePostcode) {
            // Route with collection: Base -> Collection -> Site -> Base

            // Base to Collection
            const leg1 = await calculateDistance(bhitBase, collectionPostcode, 'BHIT Base', 'Collection Point');
            if (leg1) {
                route.push(leg1);
                totalDistance += leg1.miles;
                totalTravelTime += leg1.minutes;
            }

            // Collection to Site
            const leg2 = await calculateDistance(collectionPostcode, sitePostcode, 'Collection Point', 'Installation Site');
            if (leg2) {
                route.push(leg2);
                totalDistance += leg2.miles;
                totalTravelTime += leg2.minutes;
            }

            // Check charges for collection
            await checkCharges(collectionPostcode, 'Collection Point');

        } else {
            // Direct route: Base -> Site
            const leg1 = await calculateDistance(bhitBase, sitePostcode, 'BHIT Base', 'Installation Site');
            if (leg1) {
                route.push(leg1);
                totalDistance += leg1.miles;
                totalTravelTime += leg1.minutes;
            }
        }

        // Site back to Base
        const returnLeg = await calculateDistance(sitePostcode, bhitBase, 'Installation Site', 'BHIT Base');
        if (returnLeg) {
            route.push(returnLeg);
            totalDistance += returnLeg.miles;
            totalTravelTime += returnLeg.minutes;
        }

        // Check charges for site
        await checkCharges(sitePostcode, 'Installation Site');

        // Additional logistics considerations
        if (totalDistance > 200) {
            warnings.push(`Long distance journey (${totalDistance.toFixed(0)} miles) - consider overnight accommodation`);
        }

        if (totalTravelTime > 240) {
            warnings.push(`Extended travel time (${(totalTravelTime / 60).toFixed(1)} hours) - may require multiple drivers`);
        }

        // Calculate fuel costs (estimate)
        const fuelCostPerMile = 0.15; // £0.15 per mile estimate
        const estimatedFuelCost = totalDistance * fuelCostPerMile;

        const result: LogisticsResult & { estimatedFuelCost: number } = {
            totalDistance: Math.round(totalDistance),
            totalTravelTime: Math.round(totalTravelTime),
            ulezCharges,
            congestionCharges,
            route,
            warnings,
            estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100
        };

        // Save logistics calculation if we have a client
        if (clientId) {
            try {
                await supabase
                    .from('quote_clients')
                    .insert({
                        quote_id: `logistics-calc-${Date.now()}`,
                        client_id: clientId,
                        site_address_id: null, // Could be enhanced to link actual addresses
                        collection_address_id: null
                    });
            } catch (error) {
                console.error('Error saving logistics record:', error);
            }
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Logistics calculation error:', error);
        return res.status(500).json({ error: 'Failed to calculate logistics' });
    }
}