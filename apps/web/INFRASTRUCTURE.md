# BHIT Work OS Infrastructure Documentation

This document outlines the core infrastructure files and utilities that have been implemented for the BHIT Work OS project.

## 📁 File Structure Overview

```
/lib/
├── index.ts                 # Central exports for all utilities
├── supabaseClient.ts        # Main Supabase client with error handling
├── supabaseAdmin.ts         # Admin Supabase client for server operations
├── AuthProvider.tsx         # Authentication context provider
├── AppProvider.tsx          # Global app state management
├── api.ts                   # HTTP request utilities
├── errors.ts                # Error handling and custom error classes
├── logger.ts                # Comprehensive logging system
├── validation.ts            # Form and data validation utilities
├── constants.ts             # Application constants and configuration
├── jobs.ts                  # Job-specific utilities and operations
├── storage.ts               # File storage and upload utilities
├── types.ts                 # Core TypeScript interfaces
└── roles.ts                 # User role and permission utilities

/types/
└── database.ts             # Supabase database type definitions

/hooks/
├── useAuth.ts              # Authentication hook
├── useRequireAuth.ts       # Protected route hook
├── useUserRole.ts          # User role management hook
├── useHasCostAccess.ts     # Financial access permission hook
├── useDashboardData.ts     # Dashboard data fetching hook
└── useJobDetail.ts         # Job-specific data hook
```

## 🔧 Core Infrastructure Components

### 1. Database Layer

**Files:** `supabaseClient.ts`, `supabaseAdmin.ts`, `types/database.ts`

- **Enhanced Supabase Client**: Improved error handling, type safety, and helper functions
- **Admin Client**: Server-side operations with service role key
- **Type Safety**: Complete TypeScript definitions for all database tables
- **Error Handling**: Consistent error response format across all database operations

### 2. Authentication & Authorization

**Files:** `AuthProvider.tsx`, `roles.ts`, `hooks/useAuth.ts`, `hooks/useRequireAuth.ts`

- **AuthProvider**: Centralized authentication state with sign-in/out functionality
- **Role-based Access**: Granular permission system (installer, supervisor, ops, director, admin)
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Session Management**: Persistent sessions with automatic token refresh

### 3. Error Handling & Logging

**Files:** `errors.ts`, `logger.ts`

- **Custom Error Classes**: Specific error types for different scenarios
- **Structured Logging**: Development and production-ready logging
- **Error Reporting**: Foundation for integration with error tracking services
- **Performance Monitoring**: Built-in performance timing utilities

### 4. API & Data Management

**Files:** `api.ts`, `jobs.ts`, `storage.ts`

- **HTTP Utilities**: Standardized API request handling with retry logic
- **Job Management**: Complete CRUD operations for jobs with validation
- **File Storage**: Secure file upload/download with validation and error handling
- **Data Validation**: Schema-based validation for all data operations

### 5. State Management

**Files:** `AppProvider.tsx`

- **Global State**: Centralized app state management
- **Theme Management**: Light/dark theme with persistence
- **Notification System**: Toast-style notifications with auto-dismiss
- **User Preferences**: Persistent user settings and preferences

### 6. Validation & Constants

**Files:** `validation.ts`, `constants.ts`

- **Schema Validation**: Reusable validation schemas for forms and data
- **Application Constants**: Centralized configuration and constants
- **Type Safety**: Full TypeScript support for all validations
- **Error Messages**: Consistent error messaging across the application

## 🚀 Usage Examples

### Authentication
```typescript
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// In a component
function MyComponent() {
  const { user, signOut, loading } = useAuth();
  const { isAuthenticated } = useRequireAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return null; // Will redirect
  
  return <div>Welcome, {user?.email}</div>;
}
```

### Job Management
```typescript
import { createJob, updateJobStatus, getJobs } from '@/lib/jobs';

// Create a new job
const result = await createJob({
  title: "Kitchen Installation",
  client_name: "John Doe",
  status: "planned",
  created_by: user.id,
  account_id: user.account_id
});

if (result.success) {
  console.log('Job created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### File Upload
```typescript
import { uploadJobDrawing, validateFile } from '@/lib/storage';

const handleFileUpload = async (file: File, jobId: string) => {
  // Validate file first
  const validation = validateFile(file, {
    maxSizeMB: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
  });
  
  if (!validation.valid) {
    showError('Upload Failed', validation.error);
    return;
  }
  
  // Upload file
  const result = await uploadJobDrawing(jobId, file);
  if (result.success) {
    showSuccess('Upload Complete', 'File uploaded successfully');
  } else {
    showError('Upload Failed', result.error);
  }
};
```

### Notifications
```typescript
import { useNotifications } from '@/lib/AppProvider';

function MyComponent() {
  const { showSuccess, showError, showWarning } = useNotifications();
  
  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('Saved', 'Data saved successfully');
    } catch (error) {
      showError('Save Failed', error.message);
    }
  };
}
```

### Validation
```typescript
import { validateObject, JOB_VALIDATION_SCHEMA } from '@/lib/validation';

const validateJobData = (jobData: any) => {
  const result = validateObject(jobData, JOB_VALIDATION_SCHEMA);
  
  if (!result.valid) {
    console.error('Validation errors:', result.errors);
    return false;
  }
  
  return true;
};
```

## 🔐 Security Features

1. **Environment Variable Validation**: All required environment variables are validated on startup
2. **Input Sanitization**: All string inputs are automatically sanitized
3. **SQL Injection Prevention**: Using Supabase's built-in query builder
4. **File Upload Security**: File type and size validation
5. **Role-based Access Control**: Granular permissions for different user types

## 🎯 Performance Optimizations

1. **Request Caching**: Built-in caching for frequently accessed data
2. **Lazy Loading**: Dynamic imports for non-critical components
3. **Error Boundaries**: Graceful error handling to prevent app crashes
4. **Debounced Operations**: Automatic debouncing for user inputs
5. **Memory Management**: Proper cleanup of event listeners and subscriptions

## 🔄 Migration & Updates

All infrastructure files are designed to be:
- **Backward Compatible**: Changes won't break existing functionality
- **Extensible**: Easy to add new features and utilities
- **Maintainable**: Clear separation of concerns and documentation
- **Testable**: All utilities can be easily unit tested

## 📝 Configuration

Key configuration files:
- `tsconfig.json`: Enhanced TypeScript configuration
- `.env.local`: Environment variables (with `.env.example` template)
- `next.config.js`: Next.js configuration
- Package dependencies are optimized and up-to-date

## 🚨 Error Handling Strategy

1. **Client-side Errors**: Logged locally and optionally sent to error tracking
2. **Server-side Errors**: Logged with full context for debugging
3. **Network Errors**: Automatic retry with exponential backoff
4. **Validation Errors**: User-friendly messages with field-specific feedback
5. **Authentication Errors**: Automatic token refresh and re-authentication

## 📊 Logging & Monitoring

The logging system provides:
- **Structured Logs**: JSON format for production
- **Context Awareness**: User ID, session ID, and request context
- **Performance Metrics**: Automatic timing for operations
- **Security Events**: Authentication and authorization logging
- **User Actions**: Track user interactions for analytics

This infrastructure provides a solid foundation for the BHIT Work OS application with enterprise-level reliability, security, and maintainability.