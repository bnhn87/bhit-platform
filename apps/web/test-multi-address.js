// Multi-Address Detection and Management Test


// Import the address extraction logic
const extractAddressesFromQuote = (text) => {
    const addresses = [];
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/gi;

    // Split text into sections that might contain addresses
    const lines = text.split('\n');
    let currentAddress = [];
    let currentType = 'custom';
    let currentLabel = '';

    lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();

        // Check for address markers
        if (lowerLine.includes('site:') || lowerLine.includes('installation at:') || lowerLine.includes('install at:')) {
            currentType = 'site';
            currentLabel = 'Installation Site';
        } else if (lowerLine.includes('collection:') || lowerLine.includes('collect from:') || lowerLine.includes('warehouse:')) {
            currentType = 'collection';
            currentLabel = 'Collection Point';
        } else if (lowerLine.includes('client:') || lowerLine.includes('customer:') || lowerLine.includes('invoice to:')) {
            currentType = 'client';
            currentLabel = 'Client Address';
        }

        // Check if line contains a postcode
        const postcodeMatch = line.match(postcodeRegex);
        if (postcodeMatch) {
            // We found a postcode, compile the address
            currentAddress.push(line);

            // Look back to get previous lines that might be part of the address
            for (let i = index - 1; i >= 0 && i > index - 5; i--) {
                const prevLine = lines[i].trim();
                if (prevLine && !prevLine.toLowerCase().includes('product') && !prevLine.toLowerCase().includes('quantity')) {
                    currentAddress.unshift(prevLine);
                } else {
                    break;
                }
            }

            // Create the address object
            const fullAddress = currentAddress.filter(l => l.trim()).join('\n');
            addresses.push({
                type: currentType,
                label: currentLabel || `Address ${addresses.length + 1}`,
                fullAddress,
                postcode: postcodeMatch[0].toUpperCase(),
                isValid: true
            });

            // Reset for next address
            currentAddress = [];
            currentType = 'custom';
            currentLabel = '';
        }
    });

    return addresses;
};

// Test Scenario 1: Quote with multiple addresses
const complexQuote = `
QUOTATION REF: Q-2025-001

Client: Global Tech Solutions Ltd
Invoice To: Finance Department
Accounts Payable
1 Corporate Plaza
London
EC1V 9HX

Project: New Office Fit-out Birmingham

Collection: Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
SE1 3ER

Installation Site: Tech Hub Birmingham
Floor 3-5, The Mailbox
Commercial Street
Birmingham
B1 1RS

Alternative Collection: BHIT Warehouse
Unit 12, Industrial Estate
Park Road
Bristol
BS2 0YQ

Products:
20x FLX-4P Workstations
10x BASS-RECT-L2400 Tables
30x PEDESTAL Units
50x Power Modules
`;


const extractedAddresses = extractAddressesFromQuote(complexQuote);


extractedAddresses.forEach((addr, index) => {
    addr.fullAddress.split('\n').forEach(line => {
    });
});

// Test address format validation
const validateUKAddressFormat = (address) => {
    const lines = address.trim().split('\n').filter(line => line.trim());
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;

    // Check if last line is a valid UK postcode
    const lastLine = lines[lines.length - 1];
    const postcodeMatch = lastLine ? lastLine.match(postcodeRegex) : null;

    if (!postcodeMatch || lines.length < 3) {
        return { isValid: false, postcode: null };
    }

    return {
        isValid: true,
        postcode: postcodeMatch[0].toUpperCase()
    };
};


const testAddresses = [
    {
        name: "Valid UK format",
        address: `Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
SE1 3ER`
    },
    {
        name: "Missing postcode",
        address: `Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London`
    },
    {
        name: "Too short (no building/street)",
        address: `London
SE1 3ER`
    },
    {
        name: "Invalid postcode format",
        address: `Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
ABC 123`
    }
];

testAddresses.forEach(test => {
    const result = validateUKAddressFormat(test.address);
    if (result.isValid) {
    }
});

// Calculate distances (mock - would integrate with real API)
const calculateDistance = (postcode1, postcode2) => {
    // Mock distance calculation based on postcode areas
    const distances = {
        'SE1-B1': 120,  // London to Birmingham
        'SE1-BS2': 115, // London to Bristol
        'SE1-EC1': 3,   // London to London
        'B1-BS2': 85,   // Birmingham to Bristol
    };

    const key1 = `${postcode1.split(' ')[0]}-${postcode2.split(' ')[0]}`;
    const key2 = `${postcode2.split(' ')[0]}-${postcode1.split(' ')[0]}`;

    return distances[key1] || distances[key2] || Math.floor(Math.random() * 200) + 10;
};


// BHIT Base location
const bhitBase = "SE1 4AA"; // Example BHIT warehouse


// Find collection and site addresses
const collectionAddr = extractedAddresses.find(a => a.type === 'collection');
const siteAddr = extractedAddresses.find(a => a.type === 'site');

if (collectionAddr && siteAddr) {
    const distToCollection = calculateDistance(bhitBase, collectionAddr.postcode);
    const distCollectionToSite = calculateDistance(collectionAddr.postcode, siteAddr.postcode);
    const distSiteToBase = calculateDistance(siteAddr.postcode, bhitBase);
    const totalDistance = distToCollection + distCollectionToSite + distSiteToBase;


    // Estimate travel time (average 30mph in city)
    const travelHours = totalDistance / 30;

    // Check for ULEZ/congestion zones
    const ulezPostcodes = ['EC', 'WC', 'E1', 'SE1', 'SW1', 'N1', 'NW1', 'W1'];
    const inULEZ = (postcode) => ulezPostcodes.some(prefix => postcode.startsWith(prefix));

    if (inULEZ(collectionAddr.postcode)) {
    }
    if (inULEZ(siteAddr.postcode)) {
    }
}


