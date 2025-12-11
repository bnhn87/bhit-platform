// Test demonstrating SmartQuote improvements

// Import the waste calculation logic
const calculateWasteVolume = (productCode, installTimeHours, isHeavy) => {
    const code = productCode.toUpperCase();

    // Product-specific waste profiles (in m³)
    const wasteProfiles = {
        'FLX-8P': 0.120,        // 120 liters
        'FLX-6P': 0.095,        // 95 liters
        'FLX-4P': 0.075,        // 75 liters
        'FLX-SINGLE': 0.035,    // 35 liters
        'JUST A CHAIR': 0.015,  // 15 liters
        'BASS-RECT': 0.085,     // 85 liters
        'PEDESTAL': 0.030,      // 30 liters
        'POWER-MODULE': 0.008,  // 8 liters
    };

    // Check for matches
    for (const [pattern, waste] of Object.entries(wasteProfiles)) {
        if (code.includes(pattern.replace('-', ''))) {
            return waste;
        }
    }

    // Default calculation
    const BASE_WASTE = 0.02;
    const TIME_FACTOR = 0.015;
    let waste = BASE_WASTE + (installTimeHours * TIME_FACTOR);
    if (isHeavy) waste *= 1.5;
    return Math.min(waste, 0.150);
};

// Test fuzzy product matching
const findBestMatch = (productCode, description) => {
    const catalogue = {
        'FLX 4P': { time: 1.45, waste: 0.075 },
        'FLX 6P': { time: 1.90, waste: 0.095 },
        'BASS-RECT-2400': { time: 1.60, waste: 0.085 },
        'JUST A CHAIR': { time: 0.30, waste: 0.015 },
        'PEDESTAL': { time: 0.50, waste: 0.030 }
    };

    const combined = `${productCode} ${description}`.toUpperCase();

    // Pattern matching
    if (/FLX.*4P|4.*PERSON.*FLX/i.test(combined)) return 'FLX 4P';
    if (/FLX.*6P|6.*PERSON.*FLX/i.test(combined)) return 'FLX 6P';
    if (/BASS.*RECT/i.test(combined)) return 'BASS-RECT-2400';
    if (/JUST.*A.*CHAIR|JAC/i.test(combined)) return 'JUST A CHAIR';
    if (/PEDESTAL|PED[-_]/i.test(combined)) return 'PEDESTAL';

    return null;
};


const testProducts = [
    { input: "FLX_4_PERSON_WORKSTATION", expected: "FLX 4P" },
    { input: "4P FLX Desk", expected: "FLX 4P" },
    { input: "ESSENTIALS_FLX_4P_L2800", expected: "FLX 4P" },
    { input: "Bass Rectangular Table", expected: "BASS-RECT-2400" },
    { input: "JAC_BLACK_FINISH", expected: "JUST A CHAIR" },
    { input: "PED-3DR-MOB", expected: "PEDESTAL" }
];

testProducts.forEach(test => {
    const match = findBestMatch(test.input, "");
    const status = match === test.expected ? "✅" : "❌";
    if (match) {
    }
});


const wasteTests = [
    { product: "FLX-8P", time: 2.0, heavy: true, name: "8-Person Workstation" },
    { product: "FLX-SINGLE", time: 0.6, heavy: false, name: "Single Desk" },
    { product: "JUST A CHAIR", time: 0.3, heavy: false, name: "Chair" },
    { product: "BASS-RECT", time: 1.6, heavy: true, name: "Large Meeting Table" },
    { product: "POWER-MODULE", time: 0.1, heavy: false, name: "Power Module" },
];


wasteTests.forEach(test => {
    const oldWaste = 0.035; // Fixed for all
    const newWaste = calculateWasteVolume(test.product, test.time, test.heavy);
    const liters = (newWaste * 1000).toFixed(0);
    const change = ((newWaste - oldWaste) / oldWaste * 100).toFixed(0);

});


const mockQuote = `
Client: Tech Solutions Ltd
Site: Birmingham Office, B1 1RS
Collection: Rawside Warehouse, SE1 3ER

Products:
10x FLX 4P Workstations
20x Just A Chair
`;





const jobProducts = [
    { code: "FLX-4P", quantity: 10, wastePerUnit: 0.075 },
    { code: "JUST A CHAIR", quantity: 20, wastePerUnit: 0.015 },
    { code: "BASS-RECT", quantity: 2, wastePerUnit: 0.085 },
    { code: "PEDESTAL", quantity: 10, wastePerUnit: 0.030 }
];

const oldTotalWaste = jobProducts.reduce((sum, p) => sum + (0.035 * p.quantity), 0);
const newTotalWaste = jobProducts.reduce((sum, p) => sum + (p.wastePerUnit * p.quantity), 0);

jobProducts.forEach(p => {
});


jobProducts.forEach(p => {
    const total = p.wastePerUnit * p.quantity;
});

const skipSize = 6.1; // Standard 8-yard skip in m³
const oldSkips = Math.ceil(oldTotalWaste / skipSize);
const newSkips = Math.ceil(newTotalWaste / skipSize);







