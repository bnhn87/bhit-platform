// App-wide context provider for BHIT Work OS
import type { User as SupabaseUser } from '@supabase/supabase-js';
import React, { createContext, useContext, useReducer, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';

import { STORAGE_KEYS, THEME_CONFIG as _THEME_CONFIG } from './constants';
import { log } from './logger';
import { Job, User as _User } from './types';

// App state interface
interface AppState {
  // UI State
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  loading: boolean;
  notifications: Notification[];
  
  // Data state
  jobs: Job[];
  selectedJob: Job | null;
  
  // User preferences
  preferences: UserPreferences;
  
  // Feature flags
  features: FeatureFlags;
}

interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  autoSave: boolean;
  emailNotifications: boolean;
}

interface FeatureFlags {
  advancedPlanner: boolean;
  aiFeatures: boolean;
  guestAccess: boolean;
  darkMode: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

// Action types
type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: Job }
  | { type: 'SELECT_JOB'; payload: Job | null }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_FEATURES'; payload: Partial<FeatureFlags> }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: AppState = {
  theme: 'light',
  sidebarCollapsed: false,
  loading: false,
  notifications: [],
  jobs: [],
  selectedJob: null,
  preferences: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MMM dd, yyyy',
    autoSave: true,
    emailNotifications: true,
  },
  features: {
    advancedPlanner: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_PLANNER === 'true',
    aiFeatures: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES === 'true',
    guestAccess: process.env.NEXT_PUBLIC_ENABLE_GUEST_ACCESS === 'true',
    darkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE === 'true',
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'ADD_NOTIFICATION':
      const notification: Notification = {
        ...action.payload,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      };
      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case 'SET_JOBS':
      return { ...state, jobs: action.payload };
    
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
    
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job => 
          job.id === action.payload.id ? action.payload : job
        ),
        selectedJob: state.selectedJob?.id === action.payload.id ? action.payload : state.selectedJob,
      };
    
    case 'SELECT_JOB':
      return { ...state, selectedJob: action.payload };
    
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
    
    case 'SET_FEATURES':
      return {
        ...state,
        features: { ...state.features, ...action.payload },
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  selectJob: (job: Job | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Computed values
  currentUser: SupabaseUser | null;
  userRole: string;
  canEdit: boolean;
  canViewFinancials: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, loading: _authLoading } = useAuth();
  const { role, loading: _roleLoading } = useUserRole();

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.preferences.theme) as 'light' | 'dark';
      const savedSidebar = localStorage.getItem(STORAGE_KEYS.preferences.sidebarCollapsed);
      const savedLanguage = localStorage.getItem(STORAGE_KEYS.preferences.language);

      if (savedTheme) {
        dispatch({ type: 'SET_THEME', payload: savedTheme });
      }

      if (savedSidebar) {
        const collapsed = JSON.parse(savedSidebar);
        if (collapsed !== state.sidebarCollapsed) {
          dispatch({ type: 'TOGGLE_SIDEBAR' });
        }
      }

      if (savedLanguage) {
        dispatch({ 
          type: 'SET_PREFERENCES', 
          payload: { language: savedLanguage } 
        });
      }
    } catch (error: unknown) {
      log.warn('Failed to load preferences from localStorage', { error });
    }
  }, [state.sidebarCollapsed]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.preferences.theme, state.theme);
  }, [state.theme]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.preferences.sidebarCollapsed, 
      JSON.stringify(state.sidebarCollapsed)
    );
  }, [state.sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.preferences.language, state.preferences.language);
  }, [state.preferences.language]);

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    state.notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
        }, notification.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [state.notifications]);

  // Convenience methods
  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    log.userAction('theme_changed', { theme });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
    log.userAction('sidebar_toggled', { collapsed: !state.sidebarCollapsed });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    log.info('Notification added', { type: notification.type, title: notification.title });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const selectJob = (job: Job | null) => {
    dispatch({ type: 'SELECT_JOB', payload: job });
    log.userAction('job_selected', { jobId: job?.id });
  };

  const updatePreferences = (preferences: Partial<UserPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: preferences });
    log.userAction('preferences_updated', preferences);
  };

  // Computed values
  const canEdit = ['director', 'ops', 'admin'].includes(role);
  const canViewFinancials = ['director', 'ops'].includes(role);

  const contextValue: AppContextType = {
    state,
    dispatch,
    setTheme,
    toggleSidebar,
    setLoading,
    addNotification,
    removeNotification,
    selectJob,
    updatePreferences,
    currentUser: user,
    userRole: role,
    canEdit,
    canViewFinancials,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Custom hooks for specific functionality
export function useNotifications() {
  const { state, addNotification, removeNotification } = useApp();
  
  const showSuccess = (title: string, message: string, duration = 5000) => {
    addNotification({ type: 'success', title, message, duration });
  };

  const showError = (title: string, message: string, duration = 0) => {
    addNotification({ type: 'error', title, message, duration });
  };

  const showWarning = (title: string, message: string, duration = 7000) => {
    addNotification({ type: 'warning', title, message, duration });
  };

  const showInfo = (title: string, message: string, duration = 5000) => {
    addNotification({ type: 'info', title, message, duration });
  };

  return {
    notifications: state.notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
  };
}

export function useJobs() {
  const { state, dispatch } = useApp();

  const setJobs = (jobs: Job[]) => {
    dispatch({ type: 'SET_JOBS', payload: jobs });
  };

  const addJob = (job: Job) => {
    dispatch({ type: 'ADD_JOB', payload: job });
  };

  const updateJob = (job: Job) => {
    dispatch({ type: 'UPDATE_JOB', payload: job });
  };

  return {
    jobs: state.jobs,
    selectedJob: state.selectedJob,
    setJobs,
    addJob,
    updateJob,
    selectJob: (job: Job | null) => dispatch({ type: 'SELECT_JOB', payload: job }),
  };
}

export default AppProvider;