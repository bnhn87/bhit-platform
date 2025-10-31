// Central export for all BHIT Work OS utilities

// Core utilities
export * from './supabaseClient';
export * from './supabaseAdmin';
export * from './api';
export * from './errors';
export * from './logger';
export * from './validation';
export * from './constants';

// Data utilities
export * from './jobs';
export * from './storage';
export * from './types';
export * from './roles';

// UI/React utilities
export { AuthProvider, useAuthCtx } from './AuthProvider';
export { AppProvider, useApp, useNotifications, useJobs } from './AppProvider';

// Theme utilities
export * from './theme';
export * from './fonts';

// Other utilities
export * from './docs';
export * from './floorplan';
export * from './jobsFetch';
export * from './jobEditLogger';
export * from './rpc';

// Default export with commonly used utilities
const BHIT = {
  // Constants
  API_ROUTES: require('./constants').API_ROUTES,
  PAGE_ROUTES: require('./constants').PAGE_ROUTES,
  ERROR_MESSAGES: require('./constants').ERROR_MESSAGES,
  SUCCESS_MESSAGES: require('./constants').SUCCESS_MESSAGES,
  
  // Utilities
  log: require('./logger').log,
  validateObject: require('./validation').validateObject,
  apiRequest: require('./api').apiRequest,
  handleSupabaseError: require('./supabaseClient').handleSupabaseError,
  
  // Status helpers
  statusLabel: require('./jobs').statusLabel,
  getStatusColor: require('./jobs').getStatusColor,
  nextStatus: require('./jobs').nextStatus,
  
  // Validation schemas
  JOB_VALIDATION_SCHEMA: require('./validation').JOB_VALIDATION_SCHEMA,
  USER_VALIDATION_SCHEMA: require('./validation').USER_VALIDATION_SCHEMA,
  
  // Role helpers
  canEdit: require('./roles').canEdit,
  canViewFinancials: require('./roles').canViewFinancials,
};

export default BHIT;