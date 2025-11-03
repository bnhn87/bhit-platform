// Debug the regex pattern
console.log("🔍 DEBUGGING FLX REGEX PATTERN");
console.log("=".repeat(50));

const testCodes = [
    "FLX-4P-2816-A",
    "FLX_4P_2816_A",
    "FLX-4P-2800",
    "FLX4P2816A" // After stripping
];

const patterns = [
    /FLX[-_]?(\d+)P[-_]/,           // Current pattern
    /FLX[-_]?(\d+)P/,                // Without trailing separator
    /FLX[-_]*(\d+)P/,                // Zero or more separators
    /FLX\D*(\d+)P/,                  // Any non-digit between FLX and #P
];

console.log("Testing patterns:\n");

testCodes.forEach(code => {
    console.log(`Testing: "${code}"`);
    patterns.forEach((pattern, index) => {
        const match = code.match(pattern);
        if (match) {
            console.log(`  Pattern ${index + 1}: ✅ Matches! Captured: ${match[1]}P`);
        } else {
            console.log(`  Pattern ${index + 1}: ❌ No match`);
        }
    });
    console.log();
});

console.log("BEST PATTERN:");
console.log("Pattern 3 (/FLX[-_]*(\d+)P/) works for most cases");
console.log("But after stripping, we need a different approach");