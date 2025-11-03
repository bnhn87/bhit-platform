// Simple debug test
const input = "FLX-4P-2816-A";
const upperCode = input.toUpperCase();
const strippedCode = upperCode.replace(/[\s()-_]/g, '');

console.log("Input:", input);
console.log("Upper:", upperCode);
console.log("Stripped:", strippedCode);

// Test regex on both
const pattern1 = /FLX[-_]*(\d+)P/;
const pattern2 = /FLX(\d+)P/;

console.log("\nPattern 1 on upper:", upperCode.match(pattern1));
console.log("Pattern 2 on stripped:", strippedCode.match(pattern2));

// Check what we'd be looking for
const match1 = upperCode.match(pattern1);
const match2 = strippedCode.match(pattern2);

if (match1) {
    console.log("\n✅ Found person count:", match1[1]);
    const personCount = match1[1];
    console.log("Would look for: 'FLX " + personCount + "P'");
}

// Test the catalogue keys
const catalogueKeys = ['FLX 4P', '4P FLX', 'FLX-COWORK-4P-L2400'];
console.log("\nCatalogue has:", catalogueKeys);

const targetKey = "FLX 4P";
console.log("Looking for:", targetKey);
console.log("Is it in catalogue?", catalogueKeys.includes(targetKey));

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

console.log("\n" + "=".repeat(50));
console.log("FULL TEST:");
const result = testMatch("FLX-4P-2816-A");
console.log("Result:", result ? `✅ Found '${result}'` : "❌ Not found");