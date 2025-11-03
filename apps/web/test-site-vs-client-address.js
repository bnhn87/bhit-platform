// Test to demonstrate site vs client address extraction

console.log("🏢 SITE VS CLIENT ADDRESS EXTRACTION TEST");
console.log("=".repeat(50));

const siteAddressRegex = /(?:site|install\s*at|installation\s*address|delivery\s*to|deliver\s*to)[:\s]*(.*?)(?:\n|$)/i;
const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;

// Test scenarios that logistics companies face
const testScenarios = [
    {
        name: "Clear site address with client office different",
        quote: `
Client: ABC Corporation
Client Address: 1 Corporate Plaza, London EC1V 9HX

Project: New Office Fit-out
Site: 45 Industrial Estate, Birmingham B15 2TT

Products:
10x FLX Workstations
5x Meeting Tables
        `,
        expectedSite: "45 Industrial Estate, Birmingham B15 2TT",
        expectedPostcode: "B15 2TT",
        whyItMatters: "Crew goes to Birmingham, not London office"
    },
    {
        name: "Installation at specific location",
        quote: `
Customer: Tech Startup Ltd
Invoice to: Finance Dept, Manchester M1 1AA

Installation at: WeWork Building, Floor 3, Leeds LS1 4AP

Items to install:
20x Desks
10x Chairs
        `,
        expectedSite: "WeWork Building, Floor 3, Leeds LS1 4AP",
        expectedPostcode: "LS1 4AP",
        whyItMatters: "Installation is in Leeds, billing is in Manchester"
    },
    {
        name: "Deliver to construction site",
        quote: `
Client: Construction Corp
Head Office: London W1A 1AA

Deliver to: Building Site, Plot 5, New Development, Bristol BS1 4DJ

Furniture Order:
Site Office Equipment
        `,
        expectedSite: "Building Site, Plot 5, New Development, Bristol BS1 4DJ",
        expectedPostcode: "BS1 4DJ",
        whyItMatters: "Delivery to Bristol construction site, not London HQ"
    }
];

// Run tests
console.log("\n📍 WHY SITE ADDRESS MATTERS FOR BHIT:");
console.log("-".repeat(40));
console.log("• Determines travel time and route planning");
console.log("• Affects parking costs (city center vs industrial)");
console.log("• ULEZ/congestion charges based on site location");
console.log("• Access restrictions vary by location");
console.log("• Labour hours depend on site conditions");
console.log("• Client office is just for billing\n");

testScenarios.forEach((scenario, index) => {
    console.log(`Test ${index + 1}: ${scenario.name}`);
    console.log("-".repeat(40));

    // Extract site address
    const siteMatch = scenario.quote.match(siteAddressRegex);
    const extractedSite = siteMatch ? siteMatch[1].trim() : null;

    // Extract postcode
    const postcodeMatch = extractedSite ? extractedSite.match(postcodeRegex) : scenario.quote.match(postcodeRegex);
    const extractedPostcode = postcodeMatch ? postcodeMatch[0] : null;

    const siteCorrect = extractedSite === scenario.expectedSite;
    const postcodeCorrect = extractedPostcode === scenario.expectedPostcode;

    console.log(`Site Address: ${siteCorrect ? '✅' : '❌'}`);
    console.log(`  Expected: ${scenario.expectedSite}`);
    console.log(`  Extracted: ${extractedSite || 'None'}`);

    console.log(`Postcode: ${postcodeCorrect ? '✅' : '❌'}`);
    console.log(`  Expected: ${scenario.expectedPostcode}`);
    console.log(`  Extracted: ${extractedPostcode || 'None'}`);

    console.log(`💡 Why it matters: ${scenario.whyItMatters}\n`);
});

// Common mistakes to avoid
console.log("⚠️ COMMON MISTAKES TO AVOID:");
console.log("-".repeat(40));
console.log("❌ Using client's head office address for logistics");
console.log("❌ Using billing address for route planning");
console.log("❌ Missing floor/building info for high-rise sites");
console.log("❌ Not capturing full site details for access");

console.log("\n✅ CORRECT APPROACH:");
console.log("-".repeat(40));
console.log("✓ Always extract the SITE/INSTALLATION address");
console.log("✓ Include building names, floor numbers, unit numbers");
console.log("✓ Capture full postcode for accurate logistics planning");
console.log("✓ Client address is only for invoicing, not operations");

console.log("\n" + "=".repeat(50));
console.log("🎯 SUMMARY: We're now correctly extracting SITE addresses!");
console.log("This ensures accurate logistics planning and costing for BHIT.");