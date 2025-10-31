import { QuoteDetails, CalculatedProduct } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateQuoteDetails(details: QuoteDetails): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!details.client || details.client.trim().length === 0) {
    errors.push({ field: 'client', message: 'Client name is required' });
  }

  if (!details.project || details.project.trim().length === 0) {
    errors.push({ field: 'project', message: 'Project name is required' });
  }

  if (details.client && details.client.length > 200) {
    errors.push({ field: 'client', message: 'Client name too long (max 200 characters)' });
  }

  if (details.project && details.project.length > 200) {
    errors.push({ field: 'project', message: 'Project name too long (max 200 characters)' });
  }

  if (details.deliveryAddress && details.deliveryAddress.length > 500) {
    errors.push({ field: 'deliveryAddress', message: 'Delivery address too long (max 500 characters)' });
  }

  if (details.overrideFitterCount !== null && details.overrideFitterCount !== undefined) {
    if (details.overrideFitterCount < 0) {
      errors.push({ field: 'overrideFitterCount', message: 'Fitter count cannot be negative' });
    }
    if (details.overrideFitterCount > 100) {
      errors.push({ field: 'overrideFitterCount', message: 'Fitter count seems unrealistic (max 100)' });
    }
  }

  if (details.overrideSupervisorCount !== null && details.overrideSupervisorCount !== undefined) {
    if (details.overrideSupervisorCount < 0) {
      errors.push({ field: 'overrideSupervisorCount', message: 'Supervisor count cannot be negative' });
    }
    if (details.overrideSupervisorCount > 50) {
      errors.push({ field: 'overrideSupervisorCount', message: 'Supervisor count seems unrealistic (max 50)' });
    }
  }

  if (details.dailyParkingCharge !== null && details.dailyParkingCharge !== undefined) {
    if (details.dailyParkingCharge < 0) {
      errors.push({ field: 'dailyParkingCharge', message: 'Parking charge cannot be negative' });
    }
    if (details.dailyParkingCharge > 1000) {
      errors.push({ field: 'dailyParkingCharge', message: 'Parking charge seems unrealistic (max £1000)' });
    }
  }

  if (details.overrideWasteVolumeM3 !== null && details.overrideWasteVolumeM3 !== undefined) {
    if (details.overrideWasteVolumeM3 < 0) {
      errors.push({ field: 'overrideWasteVolumeM3', message: 'Waste volume cannot be negative' });
    }
    if (details.overrideWasteVolumeM3 > 1000) {
      errors.push({ field: 'overrideWasteVolumeM3', message: 'Waste volume seems unrealistic (max 1000 m³)' });
    }
  }

  if (details.customExtendedUpliftDays !== null && details.customExtendedUpliftDays !== undefined) {
    if (details.customExtendedUpliftDays < 0) {
      errors.push({ field: 'customExtendedUpliftDays', message: 'Uplift days cannot be negative' });
    }
    if (details.customExtendedUpliftDays > 365) {
      errors.push({ field: 'customExtendedUpliftDays', message: 'Uplift days seems unrealistic (max 365)' });
    }
  }

  if (details.customExtendedUpliftFitters !== null && details.customExtendedUpliftFitters !== undefined) {
    if (details.customExtendedUpliftFitters < 0) {
      errors.push({ field: 'customExtendedUpliftFitters', message: 'Uplift fitters cannot be negative' });
    }
    if (details.customExtendedUpliftFitters > 50) {
      errors.push({ field: 'customExtendedUpliftFitters', message: 'Uplift fitters seems unrealistic (max 50)' });
    }
  }

  if (details.outOfHoursDays !== null && details.outOfHoursDays !== undefined) {
    if (details.outOfHoursDays < 0) {
      errors.push({ field: 'outOfHoursDays', message: 'Out-of-hours days cannot be negative' });
    }
    if (details.outOfHoursDays > 365) {
      errors.push({ field: 'outOfHoursDays', message: 'Out-of-hours days seems unrealistic (max 365)' });
    }
  }

  return errors;
}

export function validateProducts(products: CalculatedProduct[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!products || products.length === 0) {
    errors.push({ field: 'products', message: 'At least one product is required' });
    return errors;
  }

  products.forEach((product, index) => {
    if (!product.productCode || product.productCode.trim().length === 0) {
      errors.push({
        field: `product_${index}_code`,
        message: `Product line ${product.lineNumber}: product code is required`
      });
    }

    if (product.quantity <= 0) {
      errors.push({
        field: `product_${index}_quantity`,
        message: `Product line ${product.lineNumber}: quantity must be greater than 0`
      });
    }

    if (product.quantity > 10000) {
      errors.push({
        field: `product_${index}_quantity`,
        message: `Product line ${product.lineNumber}: quantity seems unrealistic (max 10000)`
      });
    }

    if (product.timePerUnit < 0) {
      errors.push({
        field: `product_${index}_time`,
        message: `Product line ${product.lineNumber}: time cannot be negative`
      });
    }

    if (product.timePerUnit > 100) {
      errors.push({
        field: `product_${index}_time`,
        message: `Product line ${product.lineNumber}: time per unit seems unrealistic (max 100 hours)`
      });
    }

    if (product.wastePerUnit < 0) {
      errors.push({
        field: `product_${index}_waste`,
        message: `Product line ${product.lineNumber}: waste volume cannot be negative`
      });
    }

    if (product.wastePerUnit > 10) {
      errors.push({
        field: `product_${index}_waste`,
        message: `Product line ${product.lineNumber}: waste per unit seems unrealistic (max 10 m³)`
      });
    }
  });

  return errors;
}

export function validateAll(details: QuoteDetails, products: CalculatedProduct[]): {
  valid: boolean;
  errors: ValidationError[];
} {
  const detailErrors = validateQuoteDetails(details);
  const productErrors = validateProducts(products);
  const allErrors = [...detailErrors, ...productErrors];

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0].message;
  }

  return 'Multiple validation errors:\n' + errors.map(e => `• ${e.message}`).join('\n');
}