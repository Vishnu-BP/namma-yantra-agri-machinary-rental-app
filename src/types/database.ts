/**
 * @file database.ts — Supabase-generated TypeScript types + hand-curated aliases.
 * @module types
 *
 * The block above the separator is auto-generated via MCP `generate_typescript_types`.
 * Re-run the MCP tool to regenerate it, then re-append the aliases below the separator.
 * Never edit the generated block by hand.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          end_time: string
          id: string
          machine_id: string
          owner_id: string
          owner_note: string | null
          rate_paise: number
          renter_id: string
          renter_note: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          time_range: unknown
          total_hours: number
          total_paise: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_unit: Database["public"]["Enums"]["duration_unit"]
          end_time: string
          id?: string
          machine_id: string
          owner_id: string
          owner_note?: string | null
          rate_paise: number
          renter_id: string
          renter_note?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          time_range?: unknown
          total_hours: number
          total_paise: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_unit?: Database["public"]["Enums"]["duration_unit"]
          end_time?: string
          id?: string
          machine_id?: string
          owner_id?: string
          owner_note?: string | null
          rate_paise?: number
          renter_id?: string
          renter_note?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          time_range?: unknown
          total_hours?: number
          total_paise?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          avg_hourly_high: number
          avg_hourly_low: number
          default_minimum_hours: number
          icon_asset: string
          id: string
          name_en: string
          name_kn: string
        }
        Insert: {
          avg_hourly_high: number
          avg_hourly_low: number
          default_minimum_hours?: number
          icon_asset: string
          id: string
          name_en: string
          name_kn: string
        }
        Update: {
          avg_hourly_high?: number
          avg_hourly_low?: number
          default_minimum_hours?: number
          icon_asset?: string
          id?: string
          name_en?: string
          name_kn?: string
        }
        Relationships: []
      }
      machines: {
        Row: {
          brand: string
          category: string
          condition: Database["public"]["Enums"]["machine_condition"]
          condition_report_generated_at: string | null
          condition_report_image_url: string | null
          condition_report_issues: string[] | null
          condition_report_summary: string | null
          created_at: string
          daily_rate_paise: number
          description_en: string
          description_kn: string
          district: string
          features: string[]
          geohash: string
          horsepower: number | null
          hourly_rate_paise: number
          id: string
          image_urls: string[]
          is_currently_available: boolean
          last_service_date: string | null
          location_lat: number
          location_lng: number
          minimum_hours: number
          model: string
          owner_id: string
          owner_name: string
          owner_phone: string | null
          owner_village: string
          primary_image_url: string | null
          status: Database["public"]["Enums"]["machine_status"]
          title: string
          total_bookings: number
          total_earnings_paise: number
          updated_at: string
          village: string
          year_of_purchase: number
        }
        Insert: {
          brand: string
          category: string
          condition?: Database["public"]["Enums"]["machine_condition"]
          condition_report_generated_at?: string | null
          condition_report_image_url?: string | null
          condition_report_issues?: string[] | null
          condition_report_summary?: string | null
          created_at?: string
          daily_rate_paise: number
          description_en?: string
          description_kn?: string
          district: string
          features?: string[]
          geohash: string
          horsepower?: number | null
          hourly_rate_paise: number
          id?: string
          image_urls?: string[]
          is_currently_available?: boolean
          last_service_date?: string | null
          location_lat: number
          location_lng: number
          minimum_hours?: number
          model: string
          owner_id: string
          owner_name: string
          owner_phone?: string | null
          owner_village: string
          primary_image_url?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          title: string
          total_bookings?: number
          total_earnings_paise?: number
          updated_at?: string
          village: string
          year_of_purchase: number
        }
        Update: {
          brand?: string
          category?: string
          condition?: Database["public"]["Enums"]["machine_condition"]
          condition_report_generated_at?: string | null
          condition_report_image_url?: string | null
          condition_report_issues?: string[] | null
          condition_report_summary?: string | null
          created_at?: string
          daily_rate_paise?: number
          description_en?: string
          description_kn?: string
          district?: string
          features?: string[]
          geohash?: string
          horsepower?: number | null
          hourly_rate_paise?: number
          id?: string
          image_urls?: string[]
          is_currently_available?: boolean
          last_service_date?: string | null
          location_lat?: number
          location_lng?: number
          minimum_hours?: number
          model?: string
          owner_id?: string
          owner_name?: string
          owner_phone?: string | null
          owner_village?: string
          primary_image_url?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          title?: string
          total_bookings?: number
          total_earnings_paise?: number
          updated_at?: string
          village?: string
          year_of_purchase?: number
        }
        Relationships: [
          {
            foreignKeyName: "machines_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          district: string
          expo_push_token: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          owner_stats: Json
          phone_number: string | null
          preferred_language: Database["public"]["Enums"]["language_code"]
          renter_profile: Json | null
          role: Database["public"]["Enums"]["user_role"]
          state: string
          updated_at: string
          village: string
        }
        Insert: {
          created_at?: string
          display_name: string
          district: string
          expo_push_token?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id: string
          owner_stats?: Json
          phone_number?: string | null
          preferred_language?: Database["public"]["Enums"]["language_code"]
          renter_profile?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          state?: string
          updated_at?: string
          village: string
        }
        Update: {
          created_at?: string
          display_name?: string
          district?: string
          expo_push_token?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          owner_stats?: Json
          phone_number?: string | null
          preferred_language?: Database["public"]["Enums"]["language_code"]
          renter_profile?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          state?: string
          updated_at?: string
          village?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
      duration_unit: "hourly" | "daily"
      language_code: "en" | "kn"
      machine_condition: "excellent" | "good" | "fair" | "needs_service"
      machine_status: "active" | "paused" | "archived"
      user_role: "owner" | "renter" | "both"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
      duration_unit: ["hourly", "daily"],
      language_code: ["en", "kn"],
      machine_condition: ["excellent", "good", "fair", "needs_service"],
      machine_status: ["active", "paused", "archived"],
      user_role: ["owner", "renter", "both"],
    },
  },
} as const

// ─── Hand-curated aliases ─────────────────────────────────────────────────────
// Keep this block below the generated section. Re-append after each regen.

// ── Profiles ─────────────────────────────────────────────────────────────────

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// ── Machines ──────────────────────────────────────────────────────────────────

export type Machine = Database["public"]["Tables"]["machines"]["Row"];
export type MachineInsert = Database["public"]["Tables"]["machines"]["Insert"];
export type MachineUpdate = Database["public"]["Tables"]["machines"]["Update"];
export type MachineCategory = Machine["category"];
export type MachineCondition = Database["public"]["Enums"]["machine_condition"];
export type MachineStatus = Database["public"]["Enums"]["machine_status"];

// ── Bookings ──────────────────────────────────────────────────────────────────

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type DurationUnit = Database["public"]["Enums"]["duration_unit"];
