// Test FLX product matching fix

// Simulate the catalogue
const catalogue = {
    'FLX-COWORK-4P-L2400': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX 4P': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    '4P FLX': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX 6P': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX 8P': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
};

// Enhanced matching function with the fix
const findBestCatalogueMatch = (productCode) => {
    const cleanCode = productCode.toUpperCase().replace(/^ES[-_]/, '').replace(/^ESSENTIALS[-_]/, '').trim();
    const catalogueKeys = Object.keys(catalogue);

    // 1. Try exact match
    if (catalogue[cleanCode]) {
        return cleanCode;
    }

    // 2. Case-insensitive exact match
    const exactMatch = catalogueKeys.find(key => key.toUpperCase() === cleanCode);
    if (exactMatch) {
        return exactMatch;
    }

    // 2.5. NEW FIX: Check for specific FLX formats like "FLX-4P-2816-A"
    const flxFormatMatch = cleanCode.match(/FLX[-_]?(\d+)P[-_]/);
    if (flxFormatMatch) {
        const personCount = flxFormatMatch[1];

        // Try to find specific size variant first
        const sizeMatch = cleanCode.match(/(\d{4})/);
        if (sizeMatch && personCount !== '1') {
            const size = sizeMatch[1];
            const specificKey = `FLX-COWORK-${personCount}P-L${size}`;
            if (catalogue[specificKey]) return specificKey;
        }

        // Otherwise return generic FLX variant
        const genericKey = `FLX ${personCount}P`;
        if (catalogue[genericKey]) return genericKey;

        // Also try alternative formats
        const altKey = `${personCount}P FLX`;
        if (catalogue[altKey]) return altKey;
    }

    // 3. Pattern matching (improved)
    const patterns = {
        flx4p: /FLX[-_\s]*4P|4P[-_\s]*FLX|FOUR.?PERSON.*FLX|FLX[-_]4P[-_]/i,
        flx6p: /FLX[-_\s]*6P|6P[-_\s]*FLX|SIX.?PERSON.*FLX|FLX[-_]6P[-_]/i,
        flx8p: /FLX[-_\s]*8P|8P[-_\s]*FLX|EIGHT.?PERSON.*FLX|FLX[-_]8P[-_]/i,
    };

    if (patterns.flx4p.test(cleanCode)) return 'FLX 4P';
    if (patterns.flx6p.test(cleanCode)) return 'FLX 6P';
    if (patterns.flx8p.test(cleanCode)) return 'FLX 8P';

    return null;
};


const testCases = [
    { code: "FLX-4P-2816-A", expected: "FLX 4P", description: "The exact case from user" },
    { code: "FLX_4P_2816_A", expected: "FLX 4P", description: "Underscore variant" },
    { code: "FLX-4P-2800", expected: "FLX 4P", description: "Without suffix letter" },
    { code: "FLX-COWORK-4P-L2400", expected: "FLX-COWORK-4P-L2400", description: "Exact catalogue match" },
    { code: "4P FLX", expected: "4P FLX", description: "Alternative format" },
    { code: "ESSENTIALS_FLX_4P_L2800", expected: "FLX 4P", description: "With ESSENTIALS prefix" },
    { code: "FLX 4 PERSON WORKSTATION", expected: "FLX 4P", description: "Natural language" },
    { code: "FLX-6P-3600-B", expected: "FLX 6P", description: "6 person variant" },
    { code: "FLX-8P-4800-C", expected: "FLX 8P", description: "8 person variant" }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
    const result = findBestCatalogueMatch(test.code);
    const status = result === test.expected ? "✅ PASS" : "❌ FAIL";

    if (result === test.expected) passed++;
    else failed++;


    if (result && catalogue[result]) {
    } else {
    }
});


if (failed === 0) {
} else {
}

