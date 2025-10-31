/**
 * Export Template Types
 * Defines customizable export template configurations for PDF and Excel exports
 */

export interface ExportTemplateConfig {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    isDefault: boolean;

    // Branding
    branding: {
        companyName: string;
        logoUrl?: string;
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
    };

    // Document Styling
    styling: {
        fontFamily: 'Arial' | 'Helvetica' | 'Times New Roman' | 'Courier';
        fontSize: {
            heading: number;
            subheading: number;
            body: number;
            small: number;
        };
        margins: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        showBorders: boolean;
        showGridLines: boolean; // For Excel
    };

    // PDF Specific
    pdf: {
        orientation: 'portrait' | 'landscape';
        pageSize: 'A4' | 'letter' | 'legal';
        showHeader: boolean;
        showFooter: boolean;
        showWatermark: boolean;
        watermarkText?: string;
        showPageNumbers: boolean;
    };

    // Excel Specific
    excel: {
        showSummarySheet: boolean;
        showBreakdownSheet: boolean;
        showChartsSheet: boolean;
        freezeHeaders: boolean;
        autoFilter: boolean;
        columnWidths: 'auto' | 'fixed';
    };

    // Content Sections
    content: {
        // Quote Details Section
        showQuoteDetails: boolean;
        quoteDetailsFields: {
            quoteRef: boolean;
            client: boolean;
            project: boolean;
            deliveryAddress: boolean;
            preparedBy: boolean;
            date: boolean;
        };

        // Pricing Section
        showPricing: boolean;
        pricingFields: {
            vanCost: boolean;
            fitterCost: boolean;
            supervisorCost: boolean;
            reworkingCost: boolean;
            subtotal: boolean;
            vat: boolean;
            grandTotal: boolean;
        };

        // Labour Section
        showLabour: boolean;
        labourFields: {
            totalHours: boolean;
            upliftBuffer: boolean;
            durationBuffer: boolean;
            bufferedHours: boolean;
            totalDays: boolean;
            upliftOptions: boolean;
        };

        // Crew Section
        showCrew: boolean;
        crewFields: {
            crewSize: boolean;
            fitters: boolean;
            supervisors: boolean;
            daysPerFitter: boolean;
            vanRequirements: boolean;
        };

        // Waste Section
        showWaste: boolean;
        wasteFields: {
            totalVolume: boolean;
            loadsRequired: boolean;
            flagged: boolean;
        };

        // Products Section
        showProducts: boolean;
        productColumns: {
            lineNumber: boolean;
            quantity: boolean;
            productCode: boolean;
            description: boolean;
            timePerUnit: boolean;
            totalTime: boolean;
            wastePerUnit: boolean;
            totalWaste: boolean;
            isHeavy: boolean;
        };

        // Notes Section
        showNotes: boolean;
        notesFields: {
            parking: boolean;
            mileage: boolean;
            ulez: boolean;
            delivery: boolean;
        };

        // Additional Sections
        showTermsAndConditions: boolean;
        termsAndConditionsText?: string;
        showSignatureSection: boolean;
        showValidityPeriod: boolean;
        validityDays?: number;
    };
}

export interface ExportTemplate extends ExportTemplateConfig {
    // Additional runtime properties
}

export type ExportTemplatePreset = 'default' | 'client-friendly' | 'internal-detailed' | 'minimal';

export const DEFAULT_EXPORT_TEMPLATE: ExportTemplateConfig = {
    id: 'default',
    name: 'Default Template',
    description: 'Standard export template with all sections enabled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,

    branding: {
        companyName: 'BHIT',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        accentColor: '#60a5fa',
    },

    styling: {
        fontFamily: 'Arial',
        fontSize: {
            heading: 24,
            subheading: 18,
            body: 12,
            small: 10,
        },
        margins: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
        },
        showBorders: true,
        showGridLines: true,
    },

    pdf: {
        orientation: 'portrait',
        pageSize: 'A4',
        showHeader: true,
        showFooter: true,
        showWatermark: false,
        showPageNumbers: true,
    },

    excel: {
        showSummarySheet: true,
        showBreakdownSheet: true,
        showChartsSheet: false,
        freezeHeaders: true,
        autoFilter: true,
        columnWidths: 'auto',
    },

    content: {
        showQuoteDetails: true,
        quoteDetailsFields: {
            quoteRef: true,
            client: true,
            project: true,
            deliveryAddress: true,
            preparedBy: true,
            date: true,
        },

        showPricing: true,
        pricingFields: {
            vanCost: true,
            fitterCost: true,
            supervisorCost: true,
            reworkingCost: true,
            subtotal: true,
            vat: true,
            grandTotal: true,
        },

        showLabour: true,
        labourFields: {
            totalHours: true,
            upliftBuffer: true,
            durationBuffer: true,
            bufferedHours: true,
            totalDays: true,
            upliftOptions: true,
        },

        showCrew: true,
        crewFields: {
            crewSize: true,
            fitters: true,
            supervisors: true,
            daysPerFitter: true,
            vanRequirements: true,
        },

        showWaste: true,
        wasteFields: {
            totalVolume: true,
            loadsRequired: true,
            flagged: true,
        },

        showProducts: true,
        productColumns: {
            lineNumber: true,
            quantity: true,
            productCode: true,
            description: true,
            timePerUnit: true,
            totalTime: true,
            wastePerUnit: true,
            totalWaste: true,
            isHeavy: true,
        },

        showNotes: true,
        notesFields: {
            parking: true,
            mileage: true,
            ulez: true,
            delivery: true,
        },

        showTermsAndConditions: false,
        showSignatureSection: false,
        showValidityPeriod: false,
        validityDays: 30,
    },
};

export const CLIENT_FRIENDLY_TEMPLATE: Partial<ExportTemplateConfig> = {
    name: 'Client-Friendly Template',
    description: 'Simplified template for client-facing quotes',
    content: {
        showQuoteDetails: true,
        quoteDetailsFields: {
            quoteRef: true,
            client: true,
            project: true,
            deliveryAddress: true,
            preparedBy: false,
            date: true,
        },
        showPricing: true,
        pricingFields: {
            vanCost: false,
            fitterCost: false,
            supervisorCost: false,
            reworkingCost: false,
            subtotal: true,
            vat: true,
            grandTotal: true,
        },
        showLabour: false,
        labourFields: {
            totalHours: false,
            upliftBuffer: false,
            durationBuffer: false,
            bufferedHours: false,
            totalDays: false,
            upliftOptions: false,
        },
        showCrew: false,
        crewFields: {
            crewSize: false,
            fitters: false,
            supervisors: false,
            daysPerFitter: false,
            vanRequirements: false,
        },
        showWaste: false,
        wasteFields: {
            totalVolume: false,
            loadsRequired: false,
            flagged: false,
        },
        showProducts: true,
        productColumns: {
            lineNumber: true,
            quantity: true,
            productCode: true,
            description: true,
            timePerUnit: false,
            totalTime: false,
            wastePerUnit: false,
            totalWaste: false,
            isHeavy: false,
        },
        showNotes: true,
        notesFields: {
            parking: true,
            mileage: true,
            ulez: true,
            delivery: true,
        },
        showTermsAndConditions: true,
        showSignatureSection: true,
        showValidityPeriod: true,
        validityDays: 30,
    },
};
