// Test the calculation service FLX matching fix

// Mock the catalogue reference keys
const referenceKeys = [
    'FLX-COWORK-4P-L2400',
    'FLX 4P',
    '4P FLX',
    'FLX 6P',
    'FLX 8P',
    'FLX-SINGLE-L1200',
    'FLX-SINGLE-L1400',
    'FLX-SINGLE-L1600'
];

// Recreate the findBestMatchKey function with the fix
const findBestMatchKey = (productCodeOrDesc, referenceKeys) => {
    const lookupCode = productCodeOrDesc.toUpperCase().replace(/[\s()-_]/g, '');
    if (!lookupCode) return undefined;

    // Create lookup map
    const productLookupCache = new Map();
    referenceKeys.forEach(key => {
        const cleanedKey = key.toUpperCase().replace(/[\s()-_]/g, '');
        productLookupCache.set(cleanedKey, key);
    });

    // Strategy 1: Direct exact match
    const directMatch = productLookupCache.get(lookupCode);
    if (directMatch) return directMatch;

    // Strategy 1.5: NEW FIX - Special handling for FLX-#P-####-X format
    const upperCode = productCodeOrDesc.toUpperCase();
    const flxPatternMatch = upperCode.match(/FLX[-_]?(\d+)P[-_]/);
    if (flxPatternMatch) {
        const personCount = flxPatternMatch[1];

        // First try specific size variant
        const sizeMatch = upperCode.match(/L?(\d{4})/);
        if (sizeMatch && personCount !== '1') {
            const size = sizeMatch[1];
            const specificKey = `FLX-COWORK-${personCount}P-L${size}`;
            if (referenceKeys.includes(specificKey)) return specificKey;
        }

        // Then try generic variants
        const genericKey1 = `FLX ${personCount}P`;
        const genericKey2 = `${personCount}P FLX`;
        const genericKey3 = `FLX-${personCount}P`;

        if (referenceKeys.includes(genericKey1)) return genericKey1;
        if (referenceKeys.includes(genericKey2)) return genericKey2;
        if (referenceKeys.includes(genericKey3)) return genericKey3;
    }

    // Other strategies would follow...
    return undefined;
};


const testCases = [
    { code: "FLX-4P-2816-A", expected: "FLX 4P", description: "The exact problematic code from user" },
    { code: "FLX_4P_2816_A", expected: "FLX 4P", description: "Underscore variant" },
    { code: "FLX-4P-2800", expected: "FLX 4P", description: "Without suffix letter" },
    { code: "FLX-4P-2400", expected: "FLX-COWORK-4P-L2400", description: "Should match specific size variant" },
    { code: "FLX-6P-3600-B", expected: "FLX 6P", description: "6 person variant" },
    { code: "FLX-8P-4800-C", expected: "FLX 8P", description: "8 person variant" },
    { code: "4P FLX", expected: "4P FLX", description: "Direct match should still work" },
    { code: "FLX 4P", expected: "FLX 4P", description: "Direct match should still work" }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const result = findBestMatchKey(test.code, referenceKeys);
    const status = result === test.expected ? "✅ PASS" : "❌ FAIL";

    if (result === test.expected) passed++;
    else failed++;

});


if (failed === 0) {
} else {
}

