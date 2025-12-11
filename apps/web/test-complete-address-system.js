// Complete Multi-Address System Test with Database Integration
// This demonstrates the full workflow from quote parsing to logistics calculation


// Mock API helper functions
const mockAPI = {
    createClient: async (clientData) => {
        return {
            id: 'client-' + Date.now(),
            name: clientData.name,
            company_name: clientData.company_name,
            email: clientData.email,
            created_at: new Date().toISOString()
        };
    },

    addClientAddress: async (clientId, address) => {
        return {
            id: 'addr-' + Date.now(),
            client_id: clientId,
            ...address,
            distance_from_base_miles: Math.floor(Math.random() * 100) + 10,
            in_ulez_zone: address.postcode.startsWith('EC') || address.postcode.startsWith('WC'),
            in_congestion_zone: address.postcode.startsWith('SW1') || address.postcode.startsWith('W1')
        };
    },

    calculateLogistics: async (sitePostcode, collectionPostcode) => {
        const basePostcode = 'SE1 4AA';

        // Mock distance calculation
        const distances = {
            'SE1-SE1': 5,
            'SE1-B1': 120,
            'B1-SE1': 120,
            'SE1-BS2': 115,
            'BS2-B1': 85,
            'B1-BS2': 85
        };

        const getDistance = (from, to) => {
            const key1 = `${from.split(' ')[0]}-${to.split(' ')[0]}`;
            const key2 = `${to.split(' ')[0]}-${from.split(' ')[0]}`;
            return distances[key1] || distances[key2] || 50;
        };

        const route = [];
        let totalDistance = 0;
        let totalTime = 0;

        if (collectionPostcode) {
            // Base to Collection
            const dist1 = getDistance(basePostcode, collectionPostcode);
            route.push({
                from: 'BHIT Base',
                to: 'Collection Point',
                miles: dist1,
                minutes: dist1 * 1.5
            });
            totalDistance += dist1;
            totalTime += dist1 * 1.5;

            // Collection to Site
            const dist2 = getDistance(collectionPostcode, sitePostcode);
            route.push({
                from: 'Collection Point',
                to: 'Installation Site',
                miles: dist2,
                minutes: dist2 * 1.5
            });
            totalDistance += dist2;
            totalTime += dist2 * 1.5;
        } else {
            // Direct to site
            const dist1 = getDistance(basePostcode, sitePostcode);
            route.push({
                from: 'BHIT Base',
                to: 'Installation Site',
                miles: dist1,
                minutes: dist1 * 1.5
            });
            totalDistance += dist1;
            totalTime += dist1 * 1.5;
        }

        // Return journey
        const returnDist = getDistance(sitePostcode, basePostcode);
        route.push({
            from: 'Installation Site',
            to: 'BHIT Base',
            miles: returnDist,
            minutes: returnDist * 1.5
        });
        totalDistance += returnDist;
        totalTime += returnDist * 1.5;

        return {
            totalDistance,
            totalTravelTime: totalTime,
            route,
            ulezCharges: 0,
            congestionCharges: 0,
            estimatedFuelCost: totalDistance * 0.15
        };
    }
};

// Test Scenario 1: Complex quote with multiple addresses
async function testComplexQuoteWorkflow() {

    const quoteText = `
QUOTATION REF: Q-2025-001
Date: 2025-01-02

Client: Global Tech Solutions Ltd
Contact: John Smith
Email: john@globaltech.com
Invoice To: Finance Department
1 Corporate Plaza
London
EC1V 9HX

Project: New Birmingham Office Fit-out

Collection: Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
SE1 3ER
Note: Loading bay at rear, access 8am-5pm only

Installation Site: Tech Hub Birmingham
Floor 3-5, The Mailbox
Commercial Street
Birmingham
B1 1RS
Note: Goods lift max 2000kg, no access before 9am

Products:
20x FLX-4P Workstations
10x BASS-RECT-L2400 Tables
`;

    // Step 1: Extract addresses from quote
    const extractedAddresses = [
        {
            type: 'client',
            label: 'Global Tech Solutions (Invoice)',
            fullAddress: 'Finance Department\n1 Corporate Plaza\nLondon\nEC1V 9HX',
            postcode: 'EC1V 9HX'
        },
        {
            type: 'collection',
            label: 'Rawside Furniture Ltd',
            fullAddress: 'Unit 5, The Leather Market\nWeston Street\nLondon\nSE1 3ER',
            postcode: 'SE1 3ER',
            accessRestrictions: 'Loading bay at rear, access 8am-5pm only'
        },
        {
            type: 'site',
            label: 'Tech Hub Birmingham',
            fullAddress: 'Floor 3-5, The Mailbox\nCommercial Street\nBirmingham\nB1 1RS',
            postcode: 'B1 1RS',
            accessRestrictions: 'Goods lift max 2000kg, no access before 9am'
        }
    ];

    extractedAddresses.forEach(addr => {
    });

    // Step 2: Create/fetch client and save addresses
    const client = await mockAPI.createClient({
        name: 'John Smith',
        company_name: 'Global Tech Solutions Ltd',
        email: 'john@globaltech.com'
    });

    // Save each address to the database
    const savedAddresses = [];
    for (const addr of extractedAddresses) {
        const dbAddress = await mockAPI.addClientAddress(client.id, {
            address_type: addr.type === 'site' ? 'site' : addr.type === 'collection' ? 'warehouse' : 'billing',
            label: addr.label,
            address_line1: addr.fullAddress.split('\n')[0],
            address_line2: addr.fullAddress.split('\n')[1],
            city: addr.fullAddress.split('\n')[addr.fullAddress.split('\n').length - 2],
            postcode: addr.postcode,
            access_restrictions: addr.accessRestrictions
        });
        savedAddresses.push(dbAddress);
        if (dbAddress.in_ulez_zone) {
        }
    }

    // Step 3: Calculate logistics
    const siteAddress = extractedAddresses.find(a => a.type === 'site');
    const collectionAddress = extractedAddresses.find(a => a.type === 'collection');

    const logistics = await mockAPI.calculateLogistics(
        siteAddress.postcode,
        collectionAddress.postcode
    );


    logistics.route.forEach((leg, i) => {
    });

    return { client, savedAddresses, logistics };
}

// Test Scenario 2: Client with multiple saved addresses
async function testClientWithMultipleAddresses() {

    // Simulate a returning client with saved addresses
    const existingClient = {
        id: 'client-existing',
        name: 'Sarah Jones',
        company_name: 'Construction Corp',
        email: 'sarah@construction.co.uk'
    };

    const savedAddresses = [
        {
            id: 'addr-1',
            type: 'main',
            label: 'Head Office',
            postcode: 'W1A 1AA',
            is_default: true
        },
        {
            id: 'addr-2',
            type: 'site',
            label: 'Bristol Development',
            postcode: 'BS1 4DJ',
            is_default: false
        },
        {
            id: 'addr-3',
            type: 'warehouse',
            label: 'External Storage Facility',
            postcode: 'BS2 0YQ',
            is_default: false
        }
    ];

    savedAddresses.forEach(addr => {
    });

    // User selects addresses for new quote

    // Calculate logistics with selected addresses
    const logistics = await mockAPI.calculateLogistics('BS1 4DJ', 'BS2 0YQ');


    return { client: existingClient, savedAddresses, logistics };
}

// Test Scenario 3: Manual address entry with validation
async function testManualAddressEntry() {

    const testCases = [
        {
            name: "Valid UK address",
            input: `WeWork Manchester
Floor 8, No 1 Spinningfields
Quay Street
Manchester
M3 3JE`,
            expected: { valid: true, postcode: 'M3 3JE' }
        },
        {
            name: "Missing postcode",
            input: `Some Building
Some Street
London`,
            expected: { valid: false, postcode: null }
        },
        {
            name: "Invalid format (too short)",
            input: `London
W1A 1AA`,
            expected: { valid: false, postcode: null }
        }
    ];

    testCases.forEach(test => {
        const lines = test.input.split('\n');
        const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
        const lastLine = lines[lines.length - 1];
        const postcodeMatch = lastLine.match(postcodeRegex);
        const isValid = postcodeMatch && lines.length >= 3;

        if (postcodeMatch) {
        }
    });

    return true;
}

// Main execution
async function runTests() {
    try {
        // Run all test scenarios
        const scenario1 = await testComplexQuoteWorkflow();
        const scenario2 = await testClientWithMultipleAddresses();
        const scenario3 = await testManualAddressEntry();

        // Summary



    } catch (error) {
        console.error("Test failed:", error);
    }
}

// Run the tests
runTests();