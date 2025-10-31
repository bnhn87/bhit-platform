import { supabase } from '../../../lib/supabaseClient';
import { ProductReference } from '../types';

export interface DatabaseProduct {
  id: string;
  product_code: string;
  product_name: string | null;
  category: string;
  install_time_hours: number;
  waste_volume_m3: number;
  is_heavy: boolean;
  is_active: boolean;
  source: string;
  confidence_score: number;
  usage_count: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

/**
 * Load product catalogue from database with localStorage fallback
 */
export const loadProductCatalogueFromDatabase = async (): Promise<Record<string, ProductReference>> => {
  try {
    const { data: products, error } = await supabase
      .from('product_catalogue')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error loading product catalogue from database:', error);
      return getDefaultProductCatalogue();
    }

    if (!products || products.length === 0) {
      // Seed the database with default products
      await seedDefaultProducts();
      return getDefaultProductCatalogue();
    }

    // Convert database products to the expected format
    const catalogue: Record<string, ProductReference> = {};
    products.forEach(product => {
      catalogue[product.product_code] = {
        installTimeHours: product.install_time_hours,
        wasteVolumeM3: product.waste_volume_m3,
        isHeavy: product.is_heavy
      };
    });

    return catalogue;

  } catch (error) {
    console.error('Failed to load product catalogue from database:', error);
    return getDefaultProductCatalogue();
  }
};

/**
 * Save or update a product in the database
 */
export const saveProductToDatabase = async (productCode: string, reference: ProductReference): Promise<boolean> => {
  try {
    const productData = {
      product_code: productCode,
      product_name: generateProductName(productCode),
      install_time_hours: reference.installTimeHours,
      waste_volume_m3: reference.wasteVolumeM3,
      is_heavy: reference.isHeavy,
      source: 'user-inputted',
      confidence_score: 1.0
    };

    const { error } = await supabase
      .from('product_catalogue')
      .upsert(productData, {
        onConflict: 'product_code',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error saving product to database:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Failed to save product to database:', error);
    return false;
  }
};

/**
 * Track product usage when it's used in a quote
 */
export const trackProductUsage = async (productCode: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('track_product_usage', {
      p_product_code: productCode
    });

    if (error) {
      console.error('Error tracking product usage:', error);
    }
  } catch (error) {
    console.error('Failed to track product usage:', error);
  }
};

/**
 * Search for products by name or code with fuzzy matching
 */
export const searchProducts = async (searchTerm: string): Promise<DatabaseProduct[]> => {
  try {
    const { data: products, error } = await supabase
      .from('product_catalogue')
      .select('*')
      .eq('is_active', true)
      .or(`product_code.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`)
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching products:', error);
      return [];
    }

    return products || [];

  } catch (error) {
    console.error('Failed to search products:', error);
    return [];
  }
};

/**
 * Get product by code with alias lookup
 */
export const getProductByCode = async (productCode: string): Promise<ProductReference | null> => {
  try {
    // First try direct lookup
    const { data: product, error: directError } = await supabase
      .from('product_catalogue')
      .select('*')
      .eq('product_code', productCode)
      .eq('is_active', true)
      .single();

    if (!directError && product) {
      await trackProductUsage(productCode);
      return {
        installTimeHours: product.install_time_hours,
        wasteVolumeM3: product.waste_volume_m3,
        isHeavy: product.is_heavy
      };
    }

    // Try alias lookup
    const { data: alias, error: aliasError } = await supabase
      .from('product_aliases')
      .select('master_product_code')
      .eq('alias_code', productCode.toUpperCase())
      .single();

    if (!aliasError && alias) {
      const { data: masterProduct, error: masterError } = await supabase
        .from('product_catalogue')
        .select('*')
        .eq('product_code', alias.master_product_code)
        .eq('is_active', true)
        .single();

      if (!masterError && masterProduct) {
        await trackProductUsage(alias.master_product_code);
        return {
          installTimeHours: masterProduct.install_time_hours,
          wasteVolumeM3: masterProduct.waste_volume_m3,
          isHeavy: masterProduct.is_heavy
        };
      }
    }

    return null;

  } catch (error) {
    console.error('Failed to get product by code:', error);
    return null;
  }
};

/**
 * Seed the database with default products
 */
const seedDefaultProducts = async (): Promise<void> => {
  const defaultProducts = [
    { product_code: 'T9b', product_name: 'Standard Office Desk T9b', install_time_hours: 0.42, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'D1', product_name: 'Office Drawer Unit D1', install_time_hours: 0.33, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'D2a', product_name: 'Heavy Drawer Unit D2a', install_time_hours: 0.50, waste_volume_m3: 0.035, is_heavy: true },
    { product_code: 'WK-S1', product_name: 'Workstation Screen WK-S1', install_time_hours: 0.25, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'CH-01', product_name: 'Office Chair CH-01', install_time_hours: 0.17, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'CH-05', product_name: 'Ergonomic Chair CH-05', install_time_hours: 0.20, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'SOFA-3', product_name: '3-Seater Sofa', install_time_hours: 0.75, waste_volume_m3: 0.035, is_heavy: true },
    { product_code: 'ST-P1', product_name: 'Storage Unit ST-P1', install_time_hours: 0.58, waste_volume_m3: 0.035, is_heavy: false },
    { product_code: 'ST-L2', product_name: 'Large Storage Unit ST-L2', install_time_hours: 1.00, waste_volume_m3: 0.035, is_heavy: true },
    { product_code: 'DEFAULT', product_name: 'Standard Office Item', install_time_hours: 0.33, waste_volume_m3: 0.035, is_heavy: false }
  ];

  try {
    const { error } = await supabase
      .from('product_catalogue')
      .insert(defaultProducts.map(product => ({
        ...product,
        source: 'default',
        confidence_score: 1.0,
        category: 'furniture'
      })));

    if (error) {
      console.error('Error seeding default products:', error);
    }
  } catch (error) {
    console.error('Failed to seed default products:', error);
  }
};

/**
 * Generate a readable product name from product code
 */
const generateProductName = (productCode: string): string => {
  const codeMap: Record<string, string> = {
    'T9b': 'Standard Office Desk T9b',
    'D1': 'Office Drawer Unit D1',
    'D2a': 'Heavy Drawer Unit D2a',
    'WK-S1': 'Workstation Screen WK-S1',
    'CH-01': 'Office Chair CH-01',
    'CH-05': 'Ergonomic Chair CH-05',
    'SOFA-3': '3-Seater Sofa',
    'ST-P1': 'Storage Unit ST-P1',
    'ST-L2': 'Large Storage Unit ST-L2',
    'DEFAULT': 'Standard Office Item'
  };

  return codeMap[productCode] || `Product ${productCode}`;
};

/**
 * Fallback default product catalogue
 */
const getDefaultProductCatalogue = (): Record<string, ProductReference> => {
  return {
    'T9b': { installTimeHours: 0.42, wasteVolumeM3: 0.035, isHeavy: false },
    'D1': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false },
    'D2a': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: true },
    'WK-S1': { installTimeHours: 0.25, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-01': { installTimeHours: 0.17, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-05': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'SOFA-3': { installTimeHours: 0.75, wasteVolumeM3: 0.035, isHeavy: true },
    'ST-P1': { installTimeHours: 0.58, wasteVolumeM3: 0.035, isHeavy: false },
    'ST-L2': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'DEFAULT': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false }
  };
};

/**
 * Hybrid service that uses database with localStorage fallback
 */
export const hybridProductService = {
  async loadProductCatalogue(): Promise<Record<string, ProductReference>> {
    // Try database first
    const dbCatalogue = await loadProductCatalogueFromDatabase();

    if (Object.keys(dbCatalogue).length > 0) {
      return dbCatalogue;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('bhit_product_catalogue');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }

    return getDefaultProductCatalogue();
  },

  async saveProduct(productCode: string, reference: ProductReference): Promise<void> {
    // Try database first
    const dbSuccess = await saveProductToDatabase(productCode, reference);

    if (!dbSuccess) {
      // Fallback to localStorage
      try {
        const current = await this.loadProductCatalogue();
        current[productCode] = reference;
        localStorage.setItem('bhit_product_catalogue', JSON.stringify(current));
      } catch (error) {
        console.error('Failed to save to localStorage fallback:', error);
      }
    }
  },

  async getProduct(productCode: string): Promise<ProductReference | null> {
    // Try database first
    const dbProduct = await getProductByCode(productCode);

    if (dbProduct) {
      return dbProduct;
    }

    // Fallback to localStorage
    try {
      const catalogue = await this.loadProductCatalogue();
      return catalogue[productCode] || null;
    } catch (error) {
      console.error('Failed to get product from fallback:', error);
      return null;
    }
  },

  async searchProducts(searchTerm: string): Promise<DatabaseProduct[]> {
    return await searchProducts(searchTerm);
  }
};