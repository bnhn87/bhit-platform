// Simple debug test
const input = "FLX-4P-2816-A";
const upperCode = input.toUpperCase();
const strippedCode = upperCode.replace(/[\s()-_]/g, '');


// Test regex on both
const pattern1 = /FLX[-_]*(\d+)P/;
const pattern2 = /FLX(\d+)P/;


// Check what we'd be looking for
const match1 = upperCode.match(pattern1);
const match2 = strippedCode.match(pattern2);

if (match1) {
    const personCount = match1[1];
}

// Test the catalogue keys
const catalogueKeys = ['FLX 4P', '4P FLX', 'FLX-COWORK-4P-L2400'];

const targetKey = "FLX 4P";

// Full test with correct logic
function testMatch(productCode) {
    const upperCode = productCode.toUpperCase();
    const strippedCode = upperCode.replace(/[\s()-_]/g, '');

    // Match FLX#P pattern
    let flxMatch = upperCode.match(/FLX[-_]*(\d+)P/);
    if (!flxMatch) {
        flxMatch = strippedCode.match(/FLX(\d+)P/);
    }

    if (flxMatch) {
        const personCount = flxMatch[1];
        const keysToTry = [
            `FLX ${personCount}P`,
            `${personCount}P FLX`
        ];

        for (const key of keysToTry) {
            if (catalogueKeys.includes(key)) {
                return key;
            }
        }
    }
    return null;
}

const result = testMatch("FLX-4P-2816-A");
