import { QuoteDetails, CalculationResults, CalculatedProduct } from '../types';

// These libraries are loaded globally via <script> tags in index.html.
// We assign them to constants from the window object to make them available in this module.
// Using typeof check to ensure we're in browser environment
const jspdf = typeof window !== 'undefined' ? (window as { jspdf?: { jsPDF: new (options: unknown) => { addImage: (img: string, format: string, x: number, y: number, w: number, h: number) => void; save: (name: string) => void; internal: { pageSize: { getWidth: () => number; getHeight: () => number } } } } }).jspdf : null;
const html2canvas = typeof window !== 'undefined' ? (window as { html2canvas?: (element: HTMLElement, options: { scale: number }) => Promise<HTMLCanvasElement> }).html2canvas : null;
const XLSX = typeof window !== 'undefined' ? (window as { XLSX?: { utils: { json_to_sheet: (data: unknown[]) => unknown; aoa_to_sheet: (data: unknown[][]) => unknown; book_new: () => unknown; book_append_sheet: (wb: unknown, ws: unknown, name: string) => void }; writeFile: (wb: unknown, name: string) => void } }).XLSX : null;

export const generatePdf = (quoteDetails: QuoteDetails, _results: CalculationResults) => {
    if (typeof window === 'undefined') {
        // PDF generation is only available in browser environment
        return;
    }
    
    const pdfLayout = document.getElementById('pdf-layout');
    if (!pdfLayout) {
        // PDF layout element not found
        return;
    }

    if (!jspdf || !html2canvas) {
        // jsPDF or html2canvas library not loaded
        alert("Error: PDF generation library is not available. Please check your network connection and refresh.");
        return;
    }

    html2canvas(pdfLayout, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`BHIT-Quote-${quoteDetails.quoteRef || 'draft'}.pdf`);
    });
};

export const generateXlsx = (quoteDetails: QuoteDetails, products: CalculatedProduct[], results: CalculationResults) => {
    if (typeof window === 'undefined') {
        // Excel generation is only available in browser environment
        return;
    }
    
    if (!XLSX) {
        // XLSX library not loaded
        alert("Error: Excel generation library is not available. Please check your network connection and refresh.");
        return;
    }
    
    const { labour, crew, waste, pricing, notes } = results;

    // --- Worksheet 1: Summary ---
    const summaryData = [
        ['BHIT Internal Quote Summary', ''],
        ['', ''],
        ['Quote Ref', quoteDetails.quoteRef],
        ['Client', quoteDetails.client],
        ['Project', quoteDetails.project],
        ['Delivery Address', quoteDetails.deliveryAddress],
        ['', ''],
        ['PRICING SUMMARY', ''],
        ['Van Cost', `£${pricing.vanCost.toFixed(2)}`],
        ['Additional Fitter Cost', `£${pricing.fitterCost.toFixed(2)}`],
        ['Supervisor Cost', `£${pricing.supervisorCost.toFixed(2)}`],
        ['Specialist Reworking', `£${pricing.reworkingCost.toFixed(2)}`],
        ['TOTAL QUOTE PRICE', `£${pricing.totalCost.toFixed(2)}`],
        ['', ''],
        ['LABOUR SUMMARY', ''],
        ['Total Raw Hours', labour.totalHours.toFixed(2)],
        ['Uplift via Stairs', quoteDetails.upliftViaStairs ? 'Yes' : 'No'],
        ['Extended Uplift', quoteDetails.extendedUplift ? 'Yes' : 'No'],
        ['Specialist Reworking', quoteDetails.specialistReworking ? 'Yes' : 'No'],
        ['Uplift Buffer Applied', `${labour.upliftBufferPercentage.toFixed(0)}%`],
        ['Hours after Uplift Buffer', labour.hoursAfterUplift.toFixed(2)],
        ['Duration Buffer Applied', `${labour.durationBufferPercentage}%`],
        ['Total Buffered Hours', labour.bufferedHours.toFixed(2)],
        ['Total Days (8h/day)', labour.totalDays.toFixed(2)],
        ['', ''],
        ['CREW SUMMARY', ''],
        ['Required Crew Size', `${crew.crewSize} person(s)`],
        ['Fitters', crew.vanFitters + crew.onFootFitters],
        ['Supervisors', crew.supervisorCount],
        ['Days per Person', crew.daysPerFitter.toFixed(2)],
        ['2-Man Van Required?', crew.isTwoManVanRequired ? 'Yes' : 'No'],
        ['', ''],
        ['WASTE SUMMARY', ''],
        ['Total Waste Volume (m³)', waste.totalVolumeM3.toFixed(2)],
        ['Waste Loads Required', waste.loadsRequired.toFixed(2)],
        ['High Waste Flagged?', waste.isFlagged ? 'Yes' : 'No'],
        ['', ''],
        ['NOTES', ''],
        ['Parking', notes.parking],
        ['Mileage', notes.mileage],
        ['ULEZ', notes.ulez],
        ['Delivery Notes', notes.delivery],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData) as Record<string, unknown>;
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];


    // --- Worksheet 2: Product Schedule (BHIT Format) ---
    const productHeader = ['Works Order Line', 'Product Code', 'Description', 'Quantity', 'Time (hours per unit)'];

    // Sort products - power items at end
    const sortedProducts = [...products].sort((a, b) => {
        if (a.lineNumber === 999) return 1; // Power at end
        if (b.lineNumber === 999) return -1;
        return a.lineNumber - b.lineNumber;
    });

    const productData = sortedProducts.map(p => {
        const lineNum = p.lineNumber === 999 ? 'END' : p.lineNumber;
        const description = p.cleanDescription || p.description || p.rawDescription;
        const formattedDesc = `Line ${lineNum} – ${description}`;

        return [
            `Line ${lineNum}`,
            p.productCode,
            formattedDesc,
            p.quantity,
            p.timePerUnit ? p.timePerUnit.toFixed(2) : 'TBC'
        ];
    });

    // Add totals row
    const totalTime = products.reduce((sum, p) => sum + p.totalTime, 0);
    const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);
    productData.push(['', '', 'TOTAL', totalQty, totalTime.toFixed(2)]);

    const wsProducts = XLSX.utils.aoa_to_sheet([productHeader, ...productData]) as Record<string, unknown>;
    wsProducts['!cols'] = [
        { wch: 18 }, // Works Order Line
        { wch: 20 }, // Product Code
        { wch: 60 }, // Description
        { wch: 10 }, // Quantity
        { wch: 18 }  // Time
    ];

    // --- Worksheet 3: Internal Breakdown (detailed) ---
    const breakdownHeader = ['Line', 'Qty', 'Product Code', 'Description', 'Install Time (hrs)', 'Total Time (hrs)', 'Waste (m³)', 'Total Waste (m³)', 'Heavy Item'];
    const breakdownData = products.map(p => [
        p.lineNumber === 999 ? 'END' : p.lineNumber,
        p.quantity,
        p.productCode,
        p.cleanDescription || p.description || p.rawDescription,
        p.timePerUnit.toFixed(2),
        p.totalTime.toFixed(2),
        p.wastePerUnit.toFixed(4),
        p.totalWaste.toFixed(4),
        p.isHeavy ? 'Yes' : 'No',
    ]);
    const wsBreakdown = XLSX.utils.aoa_to_sheet([breakdownHeader, ...breakdownData]) as Record<string, unknown>;
     wsBreakdown['!cols'] = [
        { wch: 5 }, { wch: 5 }, { wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Quote Summary');
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Product Schedule');
    XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Internal Details');

    XLSX.writeFile(wb, `BHIT-Quote-${quoteDetails.quoteRef || 'draft'}.xlsx`);
};