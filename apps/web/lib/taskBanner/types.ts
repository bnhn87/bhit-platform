// Task Banner Types for BHIT Work OS

export type TaskType = 'invoicing' | 'costs' | 'calls' | 'admin';
export type TaskFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskAssignment = 'all' | 'directors' | 'managers';
export type TextStyle =
  | 'CLEAN_NEON'
  | 'DOT_MATRIX'
  | 'RETRO_GLOW'
  | 'CYBERPUNK'
  | 'NEON_TUBES'
  | 'HOLOGRAPHIC'
  | 'ELECTRIC_PULSE'
  | 'SYNTHWAVE';
export type TextColor =
  | 'neon-blue'
  | 'cyber-pink'
  | 'electric-purple'
  | 'toxic-green'
  | 'laser-red'
  | 'plasma-orange'
  | 'cosmic-teal'
  | 'radioactive-yellow'
  | 'hot-magenta'
  | 'ultra-violet'
  | 'neon-lime'
  | 'bright-cyan'
  | 'fire-orange'
  | 'shocking-pink'
  | 'vivid-gold'
  | 'rainbow'; // Special: cycles through colors
export type BackgroundColor =
  | 'black'
  | 'charcoal'
  | 'grey'
  | 'silver'
  | 'gold'
  | 'green'
  | 'teal'
  | 'navy'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'orange'
  | 'white'
  | 'cream';

export interface TaskBannerItem {
  id: string;
  title: string;
  type: TaskType;
  frequency: TaskFrequency;
  due_date: string; // ISO string
  status: TaskStatus;
  navigation_route: string;
  assigned_to: TaskAssignment;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskBannerItemWithBrightness extends TaskBannerItem {
  brightness: number; // 1-5, calculated on backend
  dueIn: string; // "30 MINS", "2 HOURS", etc.
  saved: boolean; // true if in_progress (for half-fade effect)
}

export interface TaskBannerSettings {
  id: string;
  show_background: boolean;
  background_color: BackgroundColor;
  text_style: TextStyle;
  text_color: TextColor;
  font_size: number; // 12-48
  scroll_speed: number; // 10-60 seconds
  message_spacing: number; // 48-400 pixels
  empty_message?: string; // Custom message when no tasks are active
  created_at: string;
  updated_at: string;
}

export interface UserBannerPreferences {
  id: string;
  user_id: string;
  show_background: boolean;
  background_color: BackgroundColor;
  text_style: TextStyle;
  text_color: TextColor;
  font_size: number; // 12-48
  scroll_speed: number; // 10-60 seconds
  message_spacing: number; // 48-400 pixels
  created_at: string;
  updated_at: string;
}

export interface UserBannerPermission {
  id: string;
  user_id: string;
  banner_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface TasksResponse {
  success: boolean;
  tasks: TaskBannerItemWithBrightness[];
}

export interface SettingsResponse {
  success: boolean;
  settings: TaskBannerSettings;
}

export interface UserPermissionResponse {
  success: boolean;
  enabled: boolean;
}

// Request types
export interface CreateTaskRequest {
  title: string;
  type: TaskType;
  frequency: TaskFrequency;
  due_date: string; // ISO string
  navigation_route: string;
  assigned_to: TaskAssignment;
}

export interface UpdateTaskRequest {
  id: string;
  title?: string;
  type?: TaskType;
  frequency?: TaskFrequency;
  due_date?: string;
  status?: TaskStatus;
  navigation_route?: string;
  assigned_to?: TaskAssignment;
}

export interface UpdateSettingsRequest {
  show_background?: boolean;
  background_color?: BackgroundColor;
  text_style?: TextStyle;
  text_color?: TextColor;
  font_size?: number;
  scroll_speed?: number;
  message_spacing?: number;
  empty_message?: string;
}

export interface UpdateUserPreferencesRequest {
  show_background?: boolean;
  background_color?: BackgroundColor;
  text_style?: TextStyle;
  text_color?: TextColor;
  font_size?: number;
  scroll_speed?: number;
  message_spacing?: number;
}

export interface UpdateUserPermissionRequest {
  user_id: string;
  banner_enabled: boolean;
}
