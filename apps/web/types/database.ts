export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          client_name: string | null
          reference: string | null
          status: 'planned' | 'in_progress' | 'snagging' | 'completed'
          location_x: number | null
          location_y: number | null
          created_at: string
          updated_at: string
          created_by: string
          account_id: string
        }
        Insert: {
          id?: string
          title: string
          client_name?: string | null
          reference?: string | null
          status?: 'planned' | 'in_progress' | 'snagging' | 'completed'
          location_x?: number | null
          location_y?: number | null
          created_at?: string
          updated_at?: string
          created_by: string
          account_id: string
        }
        Update: {
          id?: string
          title?: string
          client_name?: string | null
          reference?: string | null
          status?: 'planned' | 'in_progress' | 'snagging' | 'completed'
          location_x?: number | null
          location_y?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string
          account_id?: string
        }
      }
      accounts: {
        Row: {
          id: string
          company_name: string | null
          brand_color: string
          day_rates: Json
          guest_enabled: boolean
          guest_can_view_docs: boolean
          cost_visibility: 'director' | 'ops+director'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name?: string | null
          brand_color?: string
          day_rates?: Json
          guest_enabled?: boolean
          guest_can_view_docs?: boolean
          cost_visibility?: 'director' | 'ops+director'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          brand_color?: string
          day_rates?: Json
          guest_enabled?: boolean
          guest_can_view_docs?: boolean
          cost_visibility?: 'director' | 'ops+director'
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          job_id: string
          quoted_total: number
          installer_days: number
          supervisor_days: number
          vehicle_days: number
          waste_loads: number
          materials_cost: number
          misc_cost: number
          notes: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          quoted_total: number
          installer_days: number
          supervisor_days: number
          vehicle_days: number
          waste_loads: number
          materials_cost: number
          misc_cost: number
          notes?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          quoted_total?: number
          installer_days?: number
          supervisor_days?: number
          vehicle_days?: number
          waste_loads?: number
          materials_cost?: number
          misc_cost?: number
          notes?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          name: string
          in_use: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          in_use?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          in_use?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      waste_loads: {
        Row: {
          id: string
          job_id: string
          booked_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          booked_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          booked_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      crew_usage: {
        Row: {
          id: string
          d: string
          utilization: number
          created_at: string
        }
        Insert: {
          id?: string
          d: string
          utilization: number
          created_at?: string
        }
        Update: {
          id?: string
          d?: string
          utilization?: number
          created_at?: string
        }
      }
      buffer_usage: {
        Row: {
          id: string
          d: string
          percent: number
          created_at: string
        }
        Insert: {
          id?: string
          d: string
          percent: number
          created_at?: string
        }
        Update: {
          id?: string
          d?: string
          percent?: number
          created_at?: string
        }
      }
      finance_metrics: {
        Row: {
          id: string
          d: string
          net_margin: number
          created_at: string
        }
        Insert: {
          id?: string
          d: string
          net_margin: number
          created_at?: string
        }
        Update: {
          id?: string
          d?: string
          net_margin?: number
          created_at?: string
        }
      }
      installs_by_day: {
        Row: {
          id: string
          d: string
          installs: number
          crews: number
          created_at: string
        }
        Insert: {
          id?: string
          d: string
          installs: number
          crews: number
          created_at?: string
        }
        Update: {
          id?: string
          d?: string
          installs?: number
          crews?: number
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          text: string
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          occurred_at: string
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          occurred_at?: string
          created_at?: string
        }
      }
      cost_access: {
        Row: {
          id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
        }
      }
      guest_sessions: {
        Row: {
          id: string
          token: string
          pin: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          pin: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          pin?: string
          expires_at?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          role: string
          account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: string
          account_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          account_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      cost_rows: {
        Row: {
          id: string
          job_id: string
          category: string
          item_name: string
          quantity: number
          unit_cost: number
          total_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          category: string
          item_name: string
          quantity: number
          unit_cost: number
          total_cost: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          category?: string
          item_name?: string
          quantity?: number
          unit_cost?: number
          total_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      organization_settings: {
        Row: {
          id: number
          day_rates: Json
          vat_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          day_rates: Json
          vat_rate: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          day_rates?: Json
          vat_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      day_reports: {
        Row: {
          id: string
          job_id: string
          crew_count: number
          waste_loads: number
          buffer_used_percent: number
          photos_count: number
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          crew_count: number
          waste_loads: number
          buffer_used_percent: number
          photos_count: number
          notes: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          crew_count?: number
          waste_loads?: number
          buffer_used_percent?: number
          photos_count?: number
          notes?: string
          created_at?: string
        }
      }
      job_floorplans: {
        Row: {
          id: string
          job_id: string
          floorplan_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          floorplan_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          floorplan_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      job_status: 'planned' | 'in_progress' | 'snagging' | 'completed'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']