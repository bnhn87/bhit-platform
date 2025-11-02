// Test for SmartQuote Postcode Extraction

console.log("🔍 TESTING POSTCODE EXTRACTION");
console.log("=" .repeat(50));

// UK Postcode regex pattern
const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;

// Test cases with various quote formats
const testCases = [
    {
        name: "Standard format with delivery address",
        text: `
        Client: ACME Corporation
        Project: Office Refurbishment
        Delivery Address: 123 High Street, London, SW1A 1AA

        Products:
        2x FLX-4P Workstations
        3x BASS-RECT-L2400 Tables
        `,
        expectedPostcode: "SW1A 1AA"
    },
    {
        name: "Postcode in separate line",
        text: `
        Customer: Tech Startup Ltd
        Location: Manchester Office
        Postcode: M1 2JW

        Items:
        5x CAGE-SOFA Sofas
        10x PEDESTAL Units
        `,
        expectedPostcode: "M1 2JW"
    },
    {
        name: "Address with embedded postcode",
        text: `
        BHIT Quote
        Deliver to: Unit 5, Business Park, Birmingham B15 2TT

        Furniture:
        8x FLX Single Desks
        4x Meeting Tables
        `,
        expectedPostcode: "B15 2TT"
    },
    {
        name: "Multiple postcodes (should find first)",
        text: `
        From: BHIT Warehouse, Bristol BS1 4DJ
        To: Client Office, Edinburgh EH1 1LB

        Products to install:
        15x Workstations
        `,
        expectedPostcode: "BS1 4DJ"
    },
    {
        name: "Postcode without spaces",
        text: `
        Site Address: 45 Queen Street, Cardiff CF101BH

        Order:
        3x Boardroom Tables
        `,
        expectedPostcode: "CF101BH"
    },
    {
        name: "London special postcode",
        text: `
        Government Building
        Westminster, London SW1A 0AA

        Required:
        20x Executive Desks
        `,
        expectedPostcode: "SW1A 0AA"
    }
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log("-".repeat(40));

    const match = testCase.text.match(postcodeRegex);
    const extractedPostcode = match ? match[0] : null;

    if (extractedPostcode === testCase.expectedPostcode ||
        (extractedPostcode && extractedPostcode.replace(/\s/g, '') === testCase.expectedPostcode.replace(/\s/g, ''))) {
        console.log(`✅ PASSED`);
        console.log(`   Expected: ${testCase.expectedPostcode}`);
        console.log(`   Extracted: ${extractedPostcode}`);
        passed++;
    } else {
        console.log(`❌ FAILED`);
        console.log(`   Expected: ${testCase.expectedPostcode}`);
        console.log(`   Extracted: ${extractedPostcode || 'None'}`);
        failed++;
    }
});

// Additional pattern tests
console.log("\n" + "=".repeat(50));
console.log("📋 ADDITIONAL PATTERN TESTS");
console.log("-".repeat(40));

const validPostcodes = [
    "SW1A 1AA",  // Westminster
    "EC1A 1BB",  // City of London
    "W1A 0AX",   // BBC
    "M1 1AE",    // Manchester
    "B33 8TH",   // Birmingham
    "CR2 6XH",   // Croydon
    "DN55 1PT",  // Doncaster
    "GIR 0AA",   // Girobank (special case)
];

const invalidPostcodes = [
    "123 456",   // Just numbers
    "ABC DEF",   // Just letters
    "SW1 11A",   // Wrong format
    "1AA 1AA",   // Starts with number
];

console.log("\nValid Postcodes Test:");
validPostcodes.forEach(pc => {
    const isValid = postcodeRegex.test(pc);
    console.log(`  ${pc}: ${isValid ? '✅' : '❌'}`);
});

console.log("\nInvalid Postcodes Test:");
invalidPostcodes.forEach(pc => {
    const isValid = postcodeRegex.test(pc);
    console.log(`  ${pc}: ${!isValid ? '✅ (correctly rejected)' : '❌ (incorrectly accepted)'}`);
});

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 TEST SUMMARY");
console.log(`✅ Passed: ${passed}/${testCases.length} extraction tests`);
console.log(`❌ Failed: ${failed}/${testCases.length} extraction tests`);

if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Postcode extraction is working correctly.");
} else {
    console.log("\n⚠️ Some tests failed. Review the extraction logic.");
}

console.log("\n💡 NOTES:");
console.log("- The system now extracts delivery addresses and postcodes from quotes");
console.log("- Both the parse-quote API and Gemini service have been updated");
console.log("- UK postcode format supported: XX## #XX (with or without space)");
console.log("- The extracted postcode is automatically populated in the delivery address field");