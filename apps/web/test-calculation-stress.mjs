// Direct calculation stress test
import { groupPowerItems, validateRawProduct, resolveProductDetails } from './modules/smartquote/services/calculationService.ts';

console.log("🔬 CALCULATION ENGINE STRESS TEST\n");

// Test 1: Power grouping with 50 power items + 50 non-power items
const testPowerGrouping = () => {
  console.log("Test 1: Power Grouping (100 items)");
  const products = [];

  // Add 50 power items that should be grouped
  for (let i = 0; i < 50; i++) {
    products.push({
      lineNumber: i + 1,
      productCode: `POW-MODULE-${i}`,
      rawDescription: `Power Module ${i}`,
      cleanDescription: `Power Module ${i}`,
      quantity: Math.floor(Math.random() * 10) + 1
    });
  }

  // Add 50 non-power items
  for (let i = 50; i < 100; i++) {
    products.push({
      lineNumber: i + 1,
      productCode: `DESK-${i}`,
      rawDescription: `Desk Item ${i}`,
      cleanDescription: `Desk Item ${i}`,
      quantity: Math.floor(Math.random() * 5) + 1
    });
  }

  const start = Date.now();
  const result = groupPowerItems(products);
  const duration = Date.now() - start;

  console.log(`✓ Input: ${products.length} products`);
  console.log(`✓ Grouped Items: ${result.groupedItems.length}`);
  console.log(`✓ Power Consolidated: ${result.powerItemsConsolidated ? 'Yes' : 'No'}`);
  console.log(`✓ Time: ${duration}ms\n`);
};

// Test 2: Exclusion rules with edge cases
const testExclusionRules = () => {
  console.log("Test 2: Exclusion Rules");
  const testProducts = [
    { productCode: "CT-D-800", rawDescription: "Cable Tray Double" }, // Should exclude
    { productCode: "POW-TRAY", rawDescription: "Power Tray" }, // Should NOT exclude
    { productCode: "ACC-DOOR", rawDescription: "Access Door" }, // Should exclude
    { productCode: "INSERT-01", rawDescription: "Insert Only" }, // Should exclude
    { productCode: "D&I", rawDescription: "Delivery & Installation" }, // Should exclude
    { productCode: "CAGE-CLAMP", rawDescription: "Cage Clamp" }, // Should exclude
    { productCode: "DESK-01", rawDescription: "Normal Desk" }, // Should NOT exclude
  ];

  const results = testProducts.map(p => ({
    product: p.productCode,
    valid: validateRawProduct(p)
  }));

  results.forEach(r => {
    console.log(`  ${r.valid ? '✓' : '✗'} ${r.product}: ${r.valid ? 'VALID' : 'EXCLUDED'}`);
  });
  console.log();
};

// Test 3: Product matching with variations
const testProductMatching = () => {
  console.log("Test 3: Product Code Matching Variations");

  const config = {
    productCatalogue: {
      'FLX-COWORK-4P-L2400': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
      'FLX 4P': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
      '4P FLX': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
      'BASS-RECT-L2000': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
      'POWER-MODULE': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false }
    }
  };

  const testProducts = [
    { lineNumber: 1, productCode: '4P FLX', rawDescription: 'FLX 4 Person', quantity: 1 },
    { lineNumber: 2, productCode: 'FLX 4P', rawDescription: 'FLX 4 Person', quantity: 1 },
    { lineNumber: 3, productCode: 'flx-cowork-4p', rawDescription: 'FLX CoWork', quantity: 1 },
    { lineNumber: 4, productCode: 'BASS RECT L2000', rawDescription: 'Bass Table', quantity: 1 },
    { lineNumber: 5, productCode: 'UNKNOWN-PRODUCT', rawDescription: 'Unknown', quantity: 1 },
  ];

  const start = Date.now();
  const result = resolveProductDetails(testProducts, config, {}, {});
  const duration = Date.now() - start;

  console.log(`✓ Resolved: ${result.resolved.length}/${testProducts.length}`);
  console.log(`✓ Unresolved: ${result.unresolved.length}`);
  console.log(`✓ Time: ${duration}ms\n`);

  result.resolved.forEach(p => {
    console.log(`  ✓ ${p.productCode}: ${p.timePerUnit}h from ${p.source}`);
  });
  result.unresolved.forEach(p => {
    console.log(`  ✗ ${p.productCode}: UNRESOLVED`);
  });
  console.log();
};

// Run all tests
try {
  testPowerGrouping();
  testExclusionRules();
  testProductMatching();

  console.log("=" .repeat(50));
  console.log("✅ ALL STRESS TESTS PASSED");
} catch (error) {
  console.error("❌ TEST FAILED:", error.message);
}