// Core application types
export interface CostRow {
  id: string;
  job_id: string;
  category: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface DayRates {
  installer: number;
  supervisor: number;
  vehicle: number;
  waste_load: number;
}

export interface OrganizationSettings {
  id: number;
  day_rates: DayRates;
  vat_rate: number;
  created_at: string;
  updated_at: string;
}

export interface JobPayload {
  title: string;
  client_name: string | null;
  reference: string | null;
  status: 'planned' | 'in_progress' | 'snagging' | 'completed';
  location_x: number | null;
  location_y: number | null;
  created_by: string;
  account_id: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  subtext: string;
  border: string;
  panelBorder: string;
  danger: string;
  success: string;
  warning: string;
  brand?: string;
}

export interface Theme {
  colors: ThemeColors;
}

export interface NavigationItem {
  label: string;
  href: string;
}


export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface User {
  id: string;
  email?: string;
  role?: string;
  account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  title: string;
  client_name: string | null;
  reference: string | null;
  status: 'planned' | 'in_progress' | 'snagging' | 'completed';
  location_x: number | null;
  location_y: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  account_id: string;
}

export interface DayReport {
  id: string;
  job_id: string;
  crew_count: number;
  waste_loads: number;
  buffer_used_percent: number;
  photos_count: number;
  notes: string;
  created_at: string;
}