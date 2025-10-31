
import { AppConfig, ProductReference, Vehicle } from '../types';

const CONFIG_STORAGE_KEY = 'bhit_app_config';

const createReferenceEntry = (name: string, timeMinutes: number): ProductReference => {
    const installTimeHours = parseFloat((timeMinutes / 60).toFixed(2));
    const lowerName = name.toLowerCase();
    const isHeavy = installTimeHours > 0.75 || ['sofa', 'co-work', 'duo', 'large'].some(term => lowerName.includes(term));
    return {
        installTimeHours,
        isHeavy,
        wasteVolumeM3: 0.035,
    };
};

const DEFAULT_PRODUCT_REFERENCE_SHEET: Record<string, ProductReference> = {
    // October 2025 Rawside Catalogue
    // FLX Range
    'FLX-SINGLE-L1200': { installTimeHours: 0.60, wasteVolumeM3: 0.035, isHeavy: false },
    'FLX-SINGLE-L1400': { installTimeHours: 0.60, wasteVolumeM3: 0.035, isHeavy: false },
    'FLX-SINGLE-L1600': { installTimeHours: 0.60, wasteVolumeM3: 0.035, isHeavy: false },
    'FLX-COWORK-4P-L2400': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX-COWORK-6P-L3600': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX-COWORK-6P-L4200': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX-COWORK-8P-L4800': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'FLX-ESSENTIALS': { installTimeHours: 0.65, wasteVolumeM3: 0.035, isHeavy: false }, // Standard + 0.05

    // Simplified FLX aliases for easier matching (based on locked times configuration)
    'FLX Single': { installTimeHours: 0.60, wasteVolumeM3: 0.035, isHeavy: false },
    'FLX 4P': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    '4P FLX': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true }, // Alternative format
    'FLX 6P': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true },
    '6P FLX': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true }, // Alternative format
    'FLX 8P': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    '8P FLX': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true }, // Alternative format

    // Additional locked times from configuration
    'Glow Lamp:any': { installTimeHours: 0.35, wasteVolumeM3: 0.035, isHeavy: false },
    'Hi-Lo Single': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'Hi-Lo Duo': { installTimeHours: 1.65, wasteVolumeM3: 0.035, isHeavy: true },
    'Snakey Riser': { installTimeHours: 0.05, wasteVolumeM3: 0.035, isHeavy: false },
    'Just A Chair': { installTimeHours: 0.30, wasteVolumeM3: 0.035, isHeavy: false },
    'Planter Shell': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'Locker Carcass': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'Bass Pill': { installTimeHours: 1.80, wasteVolumeM3: 0.035, isHeavy: true },
    'Arne Coffee': { installTimeHours: 1.20, wasteVolumeM3: 0.035, isHeavy: true },
    'Bass Rect 2400x1200': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'Frank 2400x1200': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },

    // Workaround / Woody (all use same times as Workaround)
    'WORKAROUND-MEETING-L2000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'WA-MEETING-L2000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'WOODY-MEETING-L2000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'WORKAROUND-MEETING-L2800': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'WORKAROUND-MEETING-L3600': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'WORKAROUND-MEETING-L4000': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'WORKAROUND-MEETING-L5200': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'WORKAROUND-CIRCULAR-D1000': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'WORKAROUND-CIRCULAR-D1200': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'WORKAROUND-CIRCULAR-D1800': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },
    'WA-RND-10': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'WA-RND-12': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'WA-RND-18': { installTimeHours: 1.45, wasteVolumeM3: 0.035, isHeavy: true },

    // Cage products
    'CAGE-SOFA-L1800': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'CAGE-SOFA-L2400': { installTimeHours: 0.70, wasteVolumeM3: 0.035, isHeavy: false },
    'CAGE-BASE-CUPBOARD': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'CAGE-STEEL-CUBE': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'CAGE-SC-4': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'CAGE-OPEN-CUBE': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },

    // Cafe products
    'CAFE-ROUND-D1000': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CAFE-ROUND-D1200': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CAFE-BAR-L1800': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },

    // Cat products
    'CAT-BAR-L1800': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-BAR-L2400': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-BAR-L3000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-BAR-L4000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-TABLE': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },

    // Credenza/Enza (all treated as Credenza)
    'CREDENZA-L1000': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CREDENZA-L1600': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CREDENZA-L2000': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CREDENZA-L2200': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'CREDENZA-L2400': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'ENZA-L1600': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'ENZA-L2000': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'ENZ': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },

    // Roller, Surf, Duke, Ludo, BadBoy, Indy, Naz
    'ROLLER-L2400': { installTimeHours: 1.80, wasteVolumeM3: 0.035, isHeavy: true },
    'ROLLER-L3200': { installTimeHours: 2.25, wasteVolumeM3: 0.035, isHeavy: true },
    'ROL-L2400': { installTimeHours: 1.80, wasteVolumeM3: 0.035, isHeavy: true },
    'ROL-L3200': { installTimeHours: 2.25, wasteVolumeM3: 0.035, isHeavy: true },
    'SURF-L2000': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'SURF-L3000': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'SURF-L4000': { installTimeHours: 1.80, wasteVolumeM3: 0.035, isHeavy: true },
    'DUKE-L2400': { installTimeHours: 1.50, wasteVolumeM3: 0.035, isHeavy: true },
    'DUKE-L3000': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'DUKE-L4000': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'LUDO-L2000': { installTimeHours: 1.50, wasteVolumeM3: 0.035, isHeavy: true },
    'LUDO-L2800': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'BADBOY-L1000': { installTimeHours: 0.65, wasteVolumeM3: 0.035, isHeavy: false },
    'BADBOY-L2000': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'BADBOY-L3000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'BADBOY-L4000': { installTimeHours: 1.50, wasteVolumeM3: 0.035, isHeavy: true },
    'BADBOY-L4800': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L1800': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L3000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L5600': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'NAZ-CUPBOARD': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'NAZ-LOCKER': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },

    // Desk End, Planter, Lockers
    'DESK-END-CUPBOARD-L1400': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'DESK-END-CUPBOARD-L1600': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'DESK-END-PLANTER': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },

    // Seating
    'LOTTUS-SLEDGE': { installTimeHours: 0.01, wasteVolumeM3: 0.035, isHeavy: false },
    'BILLY-SINGLE': { installTimeHours: 1.35, wasteVolumeM3: 0.035, isHeavy: true },

    // Code aliases from configuration
    'JAC BLACK': { installTimeHours: 0.30, wasteVolumeM3: 0.035, isHeavy: false },
    'R-JAC': { installTimeHours: 0.30, wasteVolumeM3: 0.035, isHeavy: false },
    'ACC MCR B': { installTimeHours: 0.05, wasteVolumeM3: 0.035, isHeavy: false },
    'POW TRAY': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'GLOW-20': { installTimeHours: 0.35, wasteVolumeM3: 0.035, isHeavy: false },

    // Hi-Lo accessories (zero time)
    'HI-LO-DIVIDER': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'HI-LO-CABLE-SPINE': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'H-FRAME-DIVIDER': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'ACC-DD': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },

    // Power (all 0.2 hours per unit when grouped)
    'POWER-MODULE': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'R-POW': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'ACC-POW': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'P60': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'SPM': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'SPM-B': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },

    // Bass Range
    'BASS-RECT-L2000': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-RECT-L2400': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-RECT-L2800': { installTimeHours: 1.75, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-RECT-L3200': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-PLUS-L4000': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-PLUS-L5200': { installTimeHours: 2.30, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-PLUS-TRIANGULAR': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-ROUND-D1200': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'BASS-COFFEE-TABLE': { installTimeHours: 0.10, wasteVolumeM3: 0.035, isHeavy: false },
    'BASS-CREDENZA-L2200': { installTimeHours: 0.40, wasteVolumeM3: 0.035, isHeavy: false },
    'BASS-TAPERED-SMALL': { installTimeHours: 1.85, wasteVolumeM3: 0.035, isHeavy: true }, // Base + 0.25
    'BASS-TAPERED-LARGE': { installTimeHours: 2.05, wasteVolumeM3: 0.035, isHeavy: true }, // Base + 0.45
    'BASS-PILL': { installTimeHours: 1.80, wasteVolumeM3: 0.035, isHeavy: true },

    // Frank Range
    'FRANK-L2000': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-L2400': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-L3200': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-L3600': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-L4800': { installTimeHours: 2.80, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-L5200': { installTimeHours: 2.75, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-BENCH-L1200': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'FRANK-BENCH-L1500': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },

    // Arne Range
    'ARNE-L1800': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'ARNE-L4000': { installTimeHours: 3.00, wasteVolumeM3: 0.035, isHeavy: true },
    'ARNE-L6600': { installTimeHours: 3.60, wasteVolumeM3: 0.035, isHeavy: true },
    'ARNE-COFFEE-TABLE': { installTimeHours: 1.20, wasteVolumeM3: 0.035, isHeavy: true },

    // Hi-Lo Range
    'HILO-SINGLE-L1200': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-SINGLE-L1400': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-SINGLE-L1600': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-DUO-L1200': { installTimeHours: 1.65, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-DUO-L1400': { installTimeHours: 1.65, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-DUO-L1600': { installTimeHours: 1.65, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-DUO-H-FRAME': { installTimeHours: 1.65, wasteVolumeM3: 0.035, isHeavy: true },
    'HILO-DIVIDER': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'HILO-CABLE-SPINE': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },


    // Cat Range
    'CAT-TABLE-L1800': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-TABLE-L2400': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-TABLE-L3000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },
    'CAT-TABLE-L4000': { installTimeHours: 1.30, wasteVolumeM3: 0.035, isHeavy: true },

    // Cage Range

    // Credenza / Enza

    // Desk End / Planter
    'DESK-END-CUPBOARD': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'PLANTER-SHELL': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },

    // Lockers
    'LOCKER-CARCASS-2H': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'LOCKER-CARCASS-3H': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'LOCKER-CARCASS-4H': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'LOCKER-CARCASS-5H': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'CLOAKING-PANELS': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },

    // Seating
    'JUST-A-CHAIR': { installTimeHours: 0.30, wasteVolumeM3: 0.035, isHeavy: false },

    // Roller / Duke / Surf / Ludo / Bad Boy / Indy / Naz
    'SURF-L2400': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'LUDO-L2400': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L2400': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L3600': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },
    'INDY-L4800': { installTimeHours: 1.60, wasteVolumeM3: 0.035, isHeavy: true },

    // Glow Range
    'GLOW-LAMP': { installTimeHours: 0.35, wasteVolumeM3: 0.035, isHeavy: false },
    'GLOW-INTEGRATED': { installTimeHours: 1.90, wasteVolumeM3: 0.035, isHeavy: true }, // Frank + 0.3

    // Power / Accessories
    'POWER-TRAY': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'POWER-BAR': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'NEOPRENE-CABLE-RISER': { installTimeHours: 0.05, wasteVolumeM3: 0.035, isHeavy: false },
    'MESH-CABLE-RISER': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'CABLE-SPINE': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'DIVIDER-UNIVERSAL': { installTimeHours: 0.00, wasteVolumeM3: 0.035, isHeavy: false },
    'SNAKEY-RISER-DUO': { installTimeHours: 0.05, wasteVolumeM3: 0.035, isHeavy: false },
    'SNAKEY-RISER-SINGLE': { installTimeHours: 0.05, wasteVolumeM3: 0.035, isHeavy: false },

    // Bespoke / Custom
    'WOODY-MEETING-L3000': { installTimeHours: 1.70, wasteVolumeM3: 0.035, isHeavy: true },
    'WOODY-MEETING-L4000': { installTimeHours: 2.00, wasteVolumeM3: 0.035, isHeavy: true },
    'WOODY-MEETING-L5000': { installTimeHours: 2.20, wasteVolumeM3: 0.035, isHeavy: true },
    'WOODY-MEETING-L7000': { installTimeHours: 2.40, wasteVolumeM3: 0.035, isHeavy: true },
    'BESPOKE-DESK-END-PLANTER': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: false },
    'CUSTOM-POWER-ADDON': { installTimeHours: 0.30, wasteVolumeM3: 0.035, isHeavy: false },

    // Legacy codes (keep for backwards compatibility)
    'T9b': { installTimeHours: 0.42, wasteVolumeM3: 0.035, isHeavy: false },
    'D1': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false },
    'D2a': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: true },
    'WK-S1': { installTimeHours: 0.25, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-01': { installTimeHours: 0.17, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-05': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'SOFA-3': { installTimeHours: 0.75, wasteVolumeM3: 0.035, isHeavy: true },
    'ST-P1': { installTimeHours: 0.58, wasteVolumeM3: 0.035, isHeavy: false },
    'ST-L2': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'DEFAULT': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false },
};

const DEFAULT_VEHICLES: Record<string, Vehicle> = {
    'small-van': {
        id: 'small-van',
        name: 'Small Van (Transit)',
        costPerDay: 325,
        euroPalletCapacity: 4, // Euro pallets (1200mm x 800mm)
        standardPalletCapacity: 3, // Standard pallets (1200mm x 1000mm)
        isActive: true,
    },
    'large-van': {
        id: 'large-van', 
        name: 'Large Van (Sprinter)',
        costPerDay: 550,
        euroPalletCapacity: 8,
        standardPalletCapacity: 6,
        isActive: true,
    },
    'luton-van': {
        id: 'luton-van',
        name: 'Luton Van',
        costPerDay: 685,
        euroPalletCapacity: 12,
        standardPalletCapacity: 10,
        isActive: true,
    },
    '75t-lorry': {
        id: '75t-lorry',
        name: '7.5T Lorry',
        costPerDay: 850,
        euroPalletCapacity: 16,
        standardPalletCapacity: 13,
        isActive: true,
    },
};

export const getDefaultConfig = (): AppConfig => ({
    pricing: {
        oneManVanDayRate: 325,
        twoManVanDayRate: 550,
        additionalFitterDayRate: 185,
        supervisorDayRate: 245,
        specialistReworkingFlatRate: 740,
    },
    laborCosts: {
        oneManVanCostToCompany: 200,
        twoManVanCostToCompany: 350,
        additionalFitterCostToCompany: 120,
        supervisorCostToCompany: 150,
        specialistReworkingCostToCompany: 500,
        useHourlyRate: false,
        hourlyRateMultiplier: 0.125, // 8 hours per day
    },
    rules: {
        hoursPerDay: 8,
        vanCapacityM3: 13.6,
        upliftStairsBufferPercent: 15,
        extendedUpliftBufferPercent: 10,
        defaultWasteVolumeM3: 0.035,
        supervisorThresholdDays: 4,
        preparedByOptions: [
            'Rawside Contact',
            'John Smith',
            'Emily Jones',
            'Chris Wilson',
        ],
    },
    productCatalogue: DEFAULT_PRODUCT_REFERENCE_SHEET,
    vehicles: DEFAULT_VEHICLES,
});


export const loadConfig = (): AppConfig => {
    try {
        if (typeof window === 'undefined') {
            return getDefaultConfig();
        }
        const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (storedConfig) {
            const parsedConfig = JSON.parse(storedConfig);
            // Basic validation to ensure the stored config has the right shape
            if (parsedConfig.pricing && parsedConfig.rules && parsedConfig.productCatalogue) {
                // Merge with defaults to pick up any new properties not in storage
                const defaultConfig = getDefaultConfig();
                return {
                    pricing: { ...defaultConfig.pricing, ...parsedConfig.pricing },
                    laborCosts: { ...defaultConfig.laborCosts, ...parsedConfig.laborCosts },
                    rules: { ...defaultConfig.rules, ...parsedConfig.rules },
                    productCatalogue: { ...defaultConfig.productCatalogue, ...parsedConfig.productCatalogue },
                    vehicles: { ...defaultConfig.vehicles, ...parsedConfig.vehicles },
                };
            }
        }
    } catch {
        // Failed to load config from localStorage. Using default config.
    }
    return getDefaultConfig();
};


export const saveConfig = (config: AppConfig) => {
    try {
        if (typeof window === 'undefined') {
            return; // Skip saving during SSR
        }
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Failed to save config to localStorage
    }
};
