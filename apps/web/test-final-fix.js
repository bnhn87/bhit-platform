// Final test of the FLX matching fix

// Mock the catalogue reference keys (from actual configService.ts)
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

// The FIXED findBestMatchKey function
const findBestMatchKey = (productCodeOrDesc, referenceKeys) => {
    const lookupCode = productCodeOrDesc.toUpperCase().replace(/[\s()-_]/g, '');
    if (!lookupCode) return undefined;

    // Create lookup map for direct matches
    const productLookupCache = new Map();
    referenceKeys.forEach(key => {
        const cleanedKey = key.toUpperCase().replace(/[\s()-_]/g, '');
        productLookupCache.set(cleanedKey, key);
    });

    // Strategy 1: Direct exact match
    const directMatch = productLookupCache.get(lookupCode);
    if (directMatch) return directMatch;

    // Strategy 1.5: FIXED - Special handling for FLX-#P-####-X format
    const upperCode = productCodeOrDesc.toUpperCase();
    const strippedCode = upperCode.replace(/[\s()-_]/g, '');

    // Try to match FLX#P pattern in both versions
    let flxPatternMatch = upperCode.match(/FLX[-_]*(\d+)P/);
    if (!flxPatternMatch && strippedCode.match(/FLX(\d+)P/)) {
        flxPatternMatch = strippedCode.match(/FLX(\d+)P/);
    }

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
        const possibleKeys = [
            `FLX ${personCount}P`,
            `${personCount}P FLX`,
            `FLX-${personCount}P`,
            `FLX-COWORK-${personCount}P`
        ];

        for (const possibleKey of possibleKeys) {
            if (referenceKeys.includes(possibleKey)) {
                return possibleKey;
            }
        }
    }

    return undefined;
};


const criticalTest = "FLX-4P-2816-A";
const result = findBestMatchKey(criticalTest, referenceKeys);


if (result === "FLX 4P") {
} else {
}


const additionalTests = [
    { code: "FLX_4P_2816_A", expected: "FLX 4P" },
    { code: "FLX-6P-3600-B", expected: "FLX 6P" },
    { code: "FLX-8P-4800-C", expected: "FLX 8P" },
    { code: "FLX-4P-2400", expected: "FLX-COWORK-4P-L2400" },
    { code: "4P FLX", expected: "4P FLX" },
    { code: "FLX 4P", expected: "FLX 4P" }
];

let allPassed = result === "FLX 4P";

additionalTests.forEach(test => {
    const testResult = findBestMatchKey(test.code, referenceKeys);
    const status = testResult === test.expected ? "✅" : "❌";
    if (testResult !== test.expected) allPassed = false;
});

if (allPassed) {
} else {
}