/**
 * SmartQuote Integrated Furniture Library
 * Complete furniture catalog with product codes, dimensions, and installation data
 */

export interface FurnitureProduct {
  id: string;
  name: string;
  category: string;
  productCode: string;
  width_cm: number;
  depth_cm: number;
  height_cm?: number;
  weight_kg?: number;
  installTimeMinutes: number;
  isHeavy: boolean;
  color: string;
  description?: string;
  price?: number;
}

export const FURNITURE_CATEGORIES = {
  SEATING: 'Seating',
  DESKS: 'Desks & Tables',
  STORAGE: 'Storage',
  MEETING: 'Meeting Room',
  RECEPTION: 'Reception',
  ACCESSORIES: 'Accessories'
};

export const SMART_QUOTE_FURNITURE: FurnitureProduct[] = [
  // Seating
  {
    id: 'exec_chair_001',
    name: 'Executive Chair',
    category: FURNITURE_CATEGORIES.SEATING,
    productCode: 'CHR001',
    width_cm: 65,
    depth_cm: 70,
    height_cm: 120,
    weight_kg: 25,
    installTimeMinutes: 15,
    isHeavy: false,
    color: '#2563eb',
    description: 'High-back executive chair with lumbar support',
    price: 450
  },
  {
    id: 'task_chair_001',
    name: 'Task Chair',
    category: FURNITURE_CATEGORIES.SEATING,
    productCode: 'CHR002',
    width_cm: 60,
    depth_cm: 60,
    height_cm: 100,
    weight_kg: 15,
    installTimeMinutes: 10,
    isHeavy: false,
    color: '#059669',
    description: 'Ergonomic task chair with adjustable height',
    price: 280
  },
  {
    id: 'lounge_chair_001',
    name: 'Lounge Chair',
    category: FURNITURE_CATEGORIES.SEATING,
    productCode: 'CHR003',
    width_cm: 80,
    depth_cm: 85,
    height_cm: 85,
    weight_kg: 30,
    installTimeMinutes: 20,
    isHeavy: true,
    color: '#dc2626',
    description: 'Comfortable lounge chair for break areas',
    price: 650
  },
  
  // Desks & Tables
  {
    id: 'exec_desk_001',
    name: 'Executive Desk',
    category: FURNITURE_CATEGORIES.DESKS,
    productCode: 'DSK001',
    width_cm: 160,
    depth_cm: 80,
    height_cm: 75,
    weight_kg: 60,
    installTimeMinutes: 45,
    isHeavy: true,
    color: '#7c3aed',
    description: 'Large executive desk with built-in drawers',
    price: 1200
  },
  {
    id: 'standing_desk_001',
    name: 'Standing Desk',
    category: FURNITURE_CATEGORIES.DESKS,
    productCode: 'DSK002',
    width_cm: 120,
    depth_cm: 60,
    height_cm: 75,
    weight_kg: 45,
    installTimeMinutes: 35,
    isHeavy: true,
    color: '#ea580c',
    description: 'Height-adjustable standing desk',
    price: 800
  },
  {
    id: 'meeting_table_001',
    name: 'Meeting Table',
    category: FURNITURE_CATEGORIES.MEETING,
    productCode: 'TBL001',
    width_cm: 240,
    depth_cm: 120,
    height_cm: 75,
    weight_kg: 80,
    installTimeMinutes: 60,
    isHeavy: true,
    color: '#be123c',
    description: '8-person conference table',
    price: 1800
  },
  {
    id: 'round_table_001',
    name: 'Round Table',
    category: FURNITURE_CATEGORIES.MEETING,
    productCode: 'TBL002',
    width_cm: 120,
    depth_cm: 120,
    height_cm: 75,
    weight_kg: 50,
    installTimeMinutes: 30,
    isHeavy: true,
    color: '#0891b2',
    description: '4-person round meeting table',
    price: 950
  },
  
  // Storage
  {
    id: 'filing_cabinet_001',
    name: 'Filing Cabinet',
    category: FURNITURE_CATEGORIES.STORAGE,
    productCode: 'CAB001',
    width_cm: 40,
    depth_cm: 60,
    height_cm: 135,
    weight_kg: 70,
    installTimeMinutes: 25,
    isHeavy: true,
    color: '#4338ca',
    description: '4-drawer filing cabinet with lock',
    price: 420
  },
  {
    id: 'bookshelf_001',
    name: 'Bookshelf',
    category: FURNITURE_CATEGORIES.STORAGE,
    productCode: 'SHF001',
    width_cm: 80,
    depth_cm: 30,
    height_cm: 180,
    weight_kg: 45,
    installTimeMinutes: 40,
    isHeavy: true,
    color: '#059669',
    description: '5-shelf bookcase',
    price: 320
  },
  {
    id: 'credenza_001',
    name: 'Credenza',
    category: FURNITURE_CATEGORIES.STORAGE,
    productCode: 'CRD001',
    width_cm: 160,
    depth_cm: 45,
    height_cm: 75,
    weight_kg: 65,
    installTimeMinutes: 50,
    isHeavy: true,
    color: '#7c2d12',
    description: 'Executive credenza with sliding doors',
    price: 950
  },
  
  // Reception
  {
    id: 'reception_desk_001',
    name: 'Reception Desk',
    category: FURNITURE_CATEGORIES.RECEPTION,
    productCode: 'RCP001',
    width_cm: 180,
    depth_cm: 90,
    height_cm: 110,
    weight_kg: 90,
    installTimeMinutes: 90,
    isHeavy: true,
    color: '#1e40af',
    description: 'L-shaped reception desk with counter',
    price: 1400
  },
  {
    id: 'waiting_sofa_001',
    name: 'Waiting Sofa',
    category: FURNITURE_CATEGORIES.RECEPTION,
    productCode: 'SOF001',
    width_cm: 180,
    depth_cm: 80,
    height_cm: 80,
    weight_kg: 55,
    installTimeMinutes: 30,
    isHeavy: true,
    color: '#dc2626',
    description: '3-seat waiting area sofa',
    price: 750
  },
  
  // Accessories
  {
    id: 'monitor_arm_001',
    name: 'Monitor Arm',
    category: FURNITURE_CATEGORIES.ACCESSORIES,
    productCode: 'ACC001',
    width_cm: 10,
    depth_cm: 10,
    height_cm: 50,
    weight_kg: 3,
    installTimeMinutes: 20,
    isHeavy: false,
    color: '#374151',
    description: 'Adjustable dual monitor arm',
    price: 150
  },
  {
    id: 'desk_lamp_001',
    name: 'Desk Lamp',
    category: FURNITURE_CATEGORIES.ACCESSORIES,
    productCode: 'ACC002',
    width_cm: 15,
    depth_cm: 15,
    height_cm: 45,
    weight_kg: 2,
    installTimeMinutes: 5,
    isHeavy: false,
    color: '#fbbf24',
    description: 'LED desk lamp with USB charging',
    price: 80
  },
  {
    id: 'waste_bin_001',
    name: 'Waste Bin',
    category: FURNITURE_CATEGORIES.ACCESSORIES,
    productCode: 'ACC003',
    width_cm: 25,
    depth_cm: 25,
    height_cm: 30,
    weight_kg: 1,
    installTimeMinutes: 2,
    isHeavy: false,
    color: '#6b7280',
    description: 'Small office waste bin',
    price: 25
  }
];

// Helper functions
export const getFurnitureByCategory = (category: string): FurnitureProduct[] => {
  return SMART_QUOTE_FURNITURE.filter(item => item.category === category);
};

export const getFurnitureByProductCode = (productCode: string): FurnitureProduct | undefined => {
  return SMART_QUOTE_FURNITURE.find(item => item.productCode === productCode);
};

export const getInstallationTime = (furnitureIds: string[]): number => {
  return SMART_QUOTE_FURNITURE
    .filter(item => furnitureIds.includes(item.id))
    .reduce((total, item) => total + item.installTimeMinutes, 0);
};

export const getHeavyItems = (furnitureIds: string[]): FurnitureProduct[] => {
  return SMART_QUOTE_FURNITURE
    .filter(item => furnitureIds.includes(item.id) && item.isHeavy);
};

export const calculateTotalPrice = (furnitureIds: string[]): number => {
  return SMART_QUOTE_FURNITURE
    .filter(item => furnitureIds.includes(item.id))
    .reduce((total, item) => total + (item.price || 0), 0);
};