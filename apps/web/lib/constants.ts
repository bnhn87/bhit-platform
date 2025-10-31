// Application constants for BHIT Work OS

export const APP_CONFIG = {
  name: 'BHIT Work OS',
  version: '1.0.0',
  description: 'Comprehensive work management system for BHIT installations',
  author: 'BHIT Team',
} as const;

// API endpoints
export const API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    profile: '/api/auth/profile',
  },
  jobs: {
    list: '/api/jobs',
    create: '/api/jobs',
    detail: (id: string) => `/api/jobs/${id}`,
    update: (id: string) => `/api/jobs/${id}`,
    delete: (id: string) => `/api/jobs/${id}`,
    status: (id: string) => `/api/jobs/${id}/status`,
  },
  quotes: {
    list: '/api/quotes',
    create: '/api/quotes',
    detail: (id: string) => `/api/quotes/${id}`,
    save: '/api/save-quote',
    parse: '/api/parse-quote',
  },
  storage: {
    signedUrl: '/api/storage/signed-url',
    upload: '/api/storage/upload',
    delete: (path: string) => `/api/storage/${encodeURIComponent(path)}`,
  },
  guest: {
    listPhotos: '/api/guest/list-photos',
    session: '/api/guest/session',
  },
  ai: {
    test: '/api/test-ai',
    generate: '/api/ai/generate',
  }
} as const;

// Page routes
export const PAGE_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  jobs: {
    list: '/jobs',
    new: '/job/new',
    detail: (id: string) => `/job/${id}`,
    edit: (id: string) => `/job/${id}/edit`,
  },
  clients: '/clients',
  settings: {
    index: '/settings',
    organization: '/settings/organization',
    users: '/settings/users',
  },
  today: {
    index: '/today',
    guest: '/today/guest',
  },
  admin: {
    costing: '/admin/costing',
    users: '/admin/users',
  },
  closeDay: (jobId: string) => `/close-day/${jobId}`,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  auth: {
    token: 'bhit-auth-token',
    user: 'bhit-user',
    session: 'bhit-session-id',
  },
  preferences: {
    theme: 'bhit-theme',
    language: 'bhit-language',
    sidebarCollapsed: 'bhit-sidebar-collapsed',
  },
  cache: {
    jobs: 'bhit-jobs-cache',
    dashboard: 'bhit-dashboard-cache',
  },
} as const;

// File upload constraints
export const FILE_CONSTRAINTS = {
  maxSize: {
    image: 10 * 1024 * 1024, // 10MB
    pdf: 50 * 1024 * 1024,   // 50MB
    general: 100 * 1024 * 1024, // 100MB
  },
  allowedTypes: {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    drawings: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    all: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'],
  },
} as const;

// Date and time formats
export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  input: 'yyyy-MM-dd',
  datetime: 'MMM dd, yyyy HH:mm',
  time: 'HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
} as const;

// Pagination defaults
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

// Job statuses with metadata
export const JOB_STATUS_CONFIG = {
  planned: {
    label: 'Planned',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    icon: 'calendar',
    order: 1,
  },
  in_progress: {
    label: 'Installing',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-200',
    icon: 'wrench',
    order: 2,
  },
  snagging: {
    label: 'Snagging',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    icon: 'exclamation-triangle',
    order: 3,
  },
  completed: {
    label: 'Completed',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    icon: 'check-circle',
    order: 4,
  },
} as const;

// User role configurations
export const USER_ROLE_CONFIG = {
  guest: {
    label: 'Guest',
    permissions: ['view_public'],
    color: 'gray',
    priority: 0,
  },
  installer: {
    label: 'Installer',
    permissions: ['view_jobs', 'update_job_status', 'upload_photos'],
    color: 'blue',
    priority: 1,
  },
  supervisor: {
    label: 'Supervisor',
    permissions: ['view_jobs', 'create_jobs', 'update_jobs', 'view_reports'],
    color: 'indigo',
    priority: 2,
  },
  ops: {
    label: 'Operations',
    permissions: ['view_all', 'edit_all', 'view_financials', 'manage_users'],
    color: 'purple',
    priority: 3,
  },
  director: {
    label: 'Director',
    permissions: ['full_access'],
    color: 'red',
    priority: 4,
  },
  admin: {
    label: 'Administrator',
    permissions: ['full_access', 'system_admin'],
    color: 'black',
    priority: 5,
  },
} as const;

// Theme configuration
export const THEME_CONFIG = {
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
} as const;

// Validation constraints
export const VALIDATION_CONSTRAINTS = {
  job: {
    title: { minLength: 1, maxLength: 255 },
    clientName: { maxLength: 255 },
    reference: { maxLength: 100 },
  },
  user: {
    email: { maxLength: 255 },
    name: { minLength: 1, maxLength: 100 },
  },
  quote: {
    notes: { maxLength: 1000 },
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  auth: {
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Your session has expired. Please log in again.',
    insufficientPermissions: 'You do not have permission to perform this action',
    accountLocked: 'Your account has been locked. Please contact support.',
  },
  validation: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidFormat: 'Invalid format',
    tooShort: 'Value is too short',
    tooLong: 'Value is too long',
  },
  network: {
    connectionError: 'Unable to connect to the server. Please check your internet connection.',
    serverError: 'A server error occurred. Please try again later.',
    notFound: 'The requested resource was not found',
    timeout: 'Request timed out. Please try again.',
  },
  file: {
    tooLarge: 'File size exceeds the maximum allowed limit',
    invalidType: 'File type is not supported',
    uploadFailed: 'File upload failed. Please try again.',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  job: {
    created: 'Job created successfully',
    updated: 'Job updated successfully',
    deleted: 'Job deleted successfully',
    statusChanged: 'Job status updated successfully',
  },
  user: {
    created: 'User created successfully',
    updated: 'Profile updated successfully',
    deleted: 'User deleted successfully',
  },
  quote: {
    saved: 'Quote saved successfully',
    generated: 'Quote generated successfully',
  },
  file: {
    uploaded: 'File uploaded successfully',
    deleted: 'File deleted successfully',
  },
} as const;

// Feature flags (for gradual rollouts or A/B testing)
export const FEATURE_FLAGS = {
  enableAdvancedPlanner: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_PLANNER === 'true',
  enableAiFeatures: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true',
  enableGuestAccess: process.env.NEXT_PUBLIC_ENABLE_GUEST_ACCESS === 'true',
  enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
} as const;

// Time intervals (in milliseconds)
export const INTERVALS = {
  autoSave: 5 * 60 * 1000, // 5 minutes
  sessionCheck: 60 * 1000, // 1 minute
  dataRefresh: 30 * 1000,  // 30 seconds
  debounce: 300,           // 300ms
  tooltip: 150,            // 150ms
} as const;

// Chart and visualization defaults
export const CHART_CONFIG = {
  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'],
  defaultHeight: 300,
  animation: {
    duration: 750,
    easing: 'ease-in-out',
  },
} as const;

const constants = {
  APP_CONFIG,
  API_ROUTES,
  PAGE_ROUTES,
  STORAGE_KEYS,
  FILE_CONSTRAINTS,
  DATE_FORMATS,
  PAGINATION,
  JOB_STATUS_CONFIG,
  USER_ROLE_CONFIG,
  THEME_CONFIG,
  VALIDATION_CONSTRAINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
  INTERVALS,
  CHART_CONFIG,
};

export default constants;