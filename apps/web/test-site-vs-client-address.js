// Test to demonstrate site vs client address extraction


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

testScenarios.forEach((scenario, index) => {

    // Extract site address
    const siteMatch = scenario.quote.match(siteAddressRegex);
    const extractedSite = siteMatch ? siteMatch[1].trim() : null;

    // Extract postcode
    const postcodeMatch = extractedSite ? extractedSite.match(postcodeRegex) : scenario.quote.match(postcodeRegex);
    const extractedPostcode = postcodeMatch ? postcodeMatch[0] : null;

    const siteCorrect = extractedSite === scenario.expectedSite;
    const postcodeCorrect = extractedPostcode === scenario.expectedPostcode;



});

// Common mistakes to avoid


