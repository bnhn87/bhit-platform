// Debug the regex pattern

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


testCodes.forEach(code => {
    patterns.forEach((pattern, index) => {
        const match = code.match(pattern);
        if (match) {
        } else {
        }
    });
});

