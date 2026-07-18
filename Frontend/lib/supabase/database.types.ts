export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      diets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          slug: string
          target_risk: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug: string
          target_risk: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug?: string
          target_risk?: string
          title?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          category: string
          diet_id: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          portion: string | null
        }
        Insert: {
          category: string
          diet_id: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          portion?: string | null
        }
        Update: {
          category?: string
          diet_id?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          portion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_diet_id_fkey"
            columns: ["diet_id"]
            isOneToOne: false
            referencedRelation: "diets"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          input_data: Json
          module: string
          risk_category: string
          risk_score: number
          top_factors: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_data: Json
          module: string
          risk_category: string
          risk_score: number
          top_factors?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_data?: Json
          module?: string
          risk_category?: string
          risk_score?: number
          top_factors?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          diet_id: string
          id: string
          risk_category: string
        }
        Insert: {
          created_at?: string
          diet_id: string
          id?: string
          risk_category: string
        }
        Update: {
          created_at?: string
          diet_id?: string
          id?: string
          risk_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_diet_id_fkey"
            columns: ["diet_id"]
            isOneToOne: false
            referencedRelation: "diets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: { Args: Record<PropertyKey, never>; Returns: Json }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      update_my_profile: {
        Args: { new_full_name: string }
        Returns: {
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
