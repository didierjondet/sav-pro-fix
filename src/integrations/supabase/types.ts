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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_sms_credits_history: {
        Row: {
          admin_name: string | null
          admin_user_id: string | null
          created_at: string
          credits_added: number
          id: string
          note: string | null
          shop_id: string
        }
        Insert: {
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          credits_added: number
          id?: string
          note?: string | null
          shop_id: string
        }
        Update: {
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          credits_added?: number
          id?: string
          note?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sms_credits_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_history: {
        Row: {
          alert_id: string
          current_value: number | null
          id: string
          message_sent: string
          phone_number: string
          sent_at: string
          threshold_value: number | null
        }
        Insert: {
          alert_id: string
          current_value?: number | null
          id?: string
          message_sent: string
          phone_number: string
          sent_at?: string
          threshold_value?: number | null
        }
        Update: {
          alert_id?: string
          current_value?: number | null
          id?: string
          message_sent?: string
          phone_number?: string
          sent_at?: string
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "system_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          confirmation_token: string
          counter_proposal_datetime: string | null
          counter_proposal_message: string | null
          created_at: string
          customer_id: string | null
          device_info: Json | null
          duration_minutes: number
          id: string
          notes: string | null
          proposed_by: string
          sav_case_id: string | null
          shop_id: string
          start_datetime: string
          status: Database["public"]["Enums"]["appointment_status"]
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          confirmation_token?: string
          counter_proposal_datetime?: string | null
          counter_proposal_message?: string | null
          created_at?: string
          customer_id?: string | null
          device_info?: Json | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          proposed_by?: string
          sav_case_id?: string | null
          shop_id: string
          start_datetime: string
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          confirmation_token?: string
          counter_proposal_datetime?: string | null
          counter_proposal_message?: string | null
          created_at?: string
          customer_id?: string | null
          device_info?: Json | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          proposed_by?: string
          sav_case_id?: string | null
          shop_id?: string
          start_datetime?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_items: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          file_url: string | null
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          file_url?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          media_url: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          file_url?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_widgets: {
        Row: {
          ai_interpretation: Json
          chart_type: string | null
          created_at: string | null
          data_config: Json
          data_source: string
          description: string | null
          display_config: Json | null
          display_order: number | null
          enabled: boolean | null
          id: string
          name: string
          original_prompt: string
          shop_id: string
          updated_at: string | null
          widget_type: string
        }
        Insert: {
          ai_interpretation: Json
          chart_type?: string | null
          created_at?: string | null
          data_config: Json
          data_source: string
          description?: string | null
          display_config?: Json | null
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          name: string
          original_prompt: string
          shop_id: string
          updated_at?: string | null
          widget_type: string
        }
        Update: {
          ai_interpretation?: Json
          chart_type?: string | null
          created_at?: string | null
          data_config?: Json
          data_source?: string
          description?: string | null
          display_config?: Json | null
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          name?: string
          original_prompt?: string
          shop_id?: string
          updated_at?: string | null
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_widgets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          shop_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          shop_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_assistant_config: {
        Row: {
          analysis_priority: string | null
          created_at: string | null
          id: string
          late_threshold_days: number | null
          low_stock_threshold: number | null
          min_sav_age_days: number | null
          sav_statuses_included: string[] | null
          sav_types_included: string[] | null
          sections_enabled: Json | null
          shop_id: string
          tone: string | null
          top_items_count: number | null
          updated_at: string | null
        }
        Insert: {
          analysis_priority?: string | null
          created_at?: string | null
          id?: string
          late_threshold_days?: number | null
          low_stock_threshold?: number | null
          min_sav_age_days?: number | null
          sav_statuses_included?: string[] | null
          sav_types_included?: string[] | null
          sections_enabled?: Json | null
          shop_id: string
          tone?: string | null
          top_items_count?: number | null
          updated_at?: string | null
        }
        Update: {
          analysis_priority?: string | null
          created_at?: string | null
          id?: string
          late_threshold_days?: number | null
          low_stock_threshold?: number | null
          min_sav_age_days?: number | null
          sav_statuses_included?: string[] | null
          sav_types_included?: string[] | null
          sections_enabled?: Json | null
          shop_id?: string
          tone?: string | null
          top_items_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_assistant_config_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      global_sms_credits: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string | null
          remaining_credits: number | null
          sync_status: string | null
          total_credits: number | null
          twilio_balance_usd: number | null
          updated_at: string
          used_credits: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          remaining_credits?: number | null
          sync_status?: string | null
          total_credits?: number | null
          twilio_balance_usd?: number | null
          updated_at?: string
          used_credits?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          remaining_credits?: number | null
          sync_status?: string | null
          total_credits?: number | null
          twilio_balance_usd?: number | null
          updated_at?: string
          used_credits?: number | null
        }
        Relationships: []
      }
      import_configurations: {
        Row: {
          column_mappings: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          required_columns: string[]
          shop_id: string
          updated_at: string
        }
        Insert: {
          column_mappings?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          required_columns?: string[]
          shop_id: string
          updated_at?: string
        }
        Update: {
          column_mappings?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          required_columns?: string[]
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_config: {
        Row: {
          bank_details: Json | null
          company_address: string | null
          company_city: string | null
          company_email: string | null
          company_legal_form: string
          company_name: string
          company_phone: string | null
          company_postal_code: string | null
          company_siret: string | null
          company_vat_number: string | null
          company_website: string | null
          created_at: string
          footer_text: string | null
          header_logo_url: string | null
          header_text: string | null
          id: string
          legal_text: string | null
          service_name: string
          updated_at: string
          vat_rate: number
        }
        Insert: {
          bank_details?: Json | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_legal_form?: string
          company_name?: string
          company_phone?: string | null
          company_postal_code?: string | null
          company_siret?: string | null
          company_vat_number?: string | null
          company_website?: string | null
          created_at?: string
          footer_text?: string | null
          header_logo_url?: string | null
          header_text?: string | null
          id?: string
          legal_text?: string | null
          service_name?: string
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          bank_details?: Json | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_legal_form?: string
          company_name?: string
          company_phone?: string | null
          company_postal_code?: string | null
          company_siret?: string | null
          company_vat_number?: string | null
          company_website?: string | null
          created_at?: string
          footer_text?: string | null
          header_logo_url?: string | null
          header_text?: string | null
          id?: string
          legal_text?: string | null
          service_name?: string
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      invoice_notifications_config: {
        Row: {
          created_at: string
          id: string
          in_app_enabled: boolean
          notification_type: string
          sms_enabled: boolean
          sms_message_template: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          sms_enabled?: boolean
          sms_message_template?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          sms_enabled?: boolean
          sms_message_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_content: {
        Row: {
          benefit_1_description: string | null
          benefit_1_title: string | null
          benefit_2_description: string | null
          benefit_2_title: string | null
          benefit_3_description: string | null
          benefit_3_title: string | null
          benefits_subtitle: string | null
          benefits_title: string | null
          cgu_content: string | null
          cgv_content: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          cta_button_text: string | null
          cta_subtitle: string | null
          cta_title: string | null
          feature_1_description: string | null
          feature_1_title: string | null
          feature_2_description: string | null
          feature_2_title: string | null
          feature_3_description: string | null
          feature_3_title: string | null
          features_subtitle: string | null
          features_title: string | null
          footer_text: string | null
          hero_cta_primary: string | null
          hero_cta_secondary: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          privacy_policy: string | null
          show_address: boolean | null
          show_carousel: boolean | null
          show_email: boolean | null
          show_phone: boolean | null
          updated_at: string
        }
        Insert: {
          benefit_1_description?: string | null
          benefit_1_title?: string | null
          benefit_2_description?: string | null
          benefit_2_title?: string | null
          benefit_3_description?: string | null
          benefit_3_title?: string | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          cgu_content?: string | null
          cgv_content?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          features_subtitle?: string | null
          features_title?: string | null
          footer_text?: string | null
          hero_cta_primary?: string | null
          hero_cta_secondary?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          privacy_policy?: string | null
          show_address?: boolean | null
          show_carousel?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          updated_at?: string
        }
        Update: {
          benefit_1_description?: string | null
          benefit_1_title?: string | null
          benefit_2_description?: string | null
          benefit_2_title?: string | null
          benefit_3_description?: string | null
          benefit_3_title?: string | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          cgu_content?: string | null
          cgv_content?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          cta_button_text?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          feature_1_description?: string | null
          feature_1_title?: string | null
          feature_2_description?: string | null
          feature_2_title?: string | null
          feature_3_description?: string | null
          feature_3_title?: string | null
          features_subtitle?: string | null
          features_title?: string | null
          footer_text?: string | null
          hero_cta_primary?: string | null
          hero_cta_secondary?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          privacy_policy?: string | null
          show_address?: boolean | null
          show_carousel?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          part_id: string | null
          read: boolean
          sav_case_id: string | null
          shop_id: string
          support_ticket_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          part_id?: string | null
          read?: boolean
          sav_case_id?: string | null
          shop_id: string
          support_ticket_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          part_id?: string | null
          read?: boolean
          sav_case_id?: string | null
          shop_id?: string
          support_ticket_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          ordered: boolean
          part_id: string
          part_name: string
          part_reference: string | null
          priority: string
          quantity_needed: number
          quote_id: string | null
          reason: string
          sav_case_id: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordered?: boolean
          part_id: string
          part_name: string
          part_reference?: string | null
          priority?: string
          quantity_needed?: number
          quote_id?: string | null
          reason: string
          sav_case_id?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordered?: boolean
          part_id?: string
          part_name?: string
          part_reference?: string | null
          priority?: string
          quantity_needed?: number
          quote_id?: string | null
          reason?: string
          sav_case_id?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          color: string | null
          created_at: string
          id: string
          min_stock: number | null
          name: string
          notes: string | null
          photo_url: string | null
          price_last_updated: string | null
          purchase_price: number | null
          quantity: number | null
          reference: string | null
          reserved_quantity: number | null
          selling_price: number | null
          shop_id: string | null
          sku: string | null
          supplier: string | null
          time_minutes: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          min_stock?: number | null
          name: string
          notes?: string | null
          photo_url?: string | null
          price_last_updated?: string | null
          purchase_price?: number | null
          quantity?: number | null
          reference?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          shop_id?: string | null
          sku?: string | null
          supplier?: string | null
          time_minutes?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          price_last_updated?: string | null
          purchase_price?: number | null
          quantity?: number | null
          reference?: string | null
          reserved_quantity?: number | null
          selling_price?: number | null
          shop_id?: string | null
          sku?: string | null
          supplier?: string | null
          time_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          shop_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          shop_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          shop_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deposit_amount: number | null
          device_brand: string | null
          device_imei: string | null
          device_model: string | null
          discount_info: Json | null
          id: string
          items: Json
          problem_description: string | null
          quote_date: string | null
          quote_number: string
          rejected_at: string | null
          rejection_reason: string | null
          repair_notes: string | null
          sav_case_id: string | null
          sav_type: string | null
          shop_id: string
          sku: string | null
          sms_sent_at: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          discount_info?: Json | null
          id?: string
          items?: Json
          problem_description?: string | null
          quote_date?: string | null
          quote_number: string
          rejected_at?: string | null
          rejection_reason?: string | null
          repair_notes?: string | null
          sav_case_id?: string | null
          sav_type?: string | null
          shop_id: string
          sku?: string | null
          sms_sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          discount_info?: Json | null
          id?: string
          items?: Json
          problem_description?: string | null
          quote_date?: string | null
          quote_number?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          repair_notes?: string | null
          sav_case_id?: string | null
          sav_type?: string | null
          shop_id?: string
          sku?: string | null
          sms_sent_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          access_token: string
          comment: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          id: string
          rating: number | null
          sav_case_id: string | null
          sent_at: string | null
          sent_via: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          access_token: string
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating?: number | null
          sav_case_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          comment?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating?: number | null
          sav_case_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_surveys_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_cases: {
        Row: {
          accessories: Json | null
          attachments: Json | null
          case_number: string
          created_at: string
          customer_id: string | null
          deposit_amount: number | null
          details_updated_at: string | null
          device_brand: string | null
          device_color: string | null
          device_grade: string | null
          device_imei: string | null
          device_model: string | null
          discount_info: Json | null
          id: string
          partial_takeover: boolean | null
          private_comments: string | null
          problem_description: string | null
          repair_notes: string | null
          sav_type: string
          security_codes: Json | null
          shop_id: string | null
          sku: string | null
          status: string
          taken_over: boolean
          taken_over_at: string | null
          takeover_amount: number | null
          technician_comments: string | null
          technician_id: string | null
          total_cost: number | null
          total_time_minutes: number | null
          tracking_slug: string | null
          unlock_pattern: Json | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accessories?: Json | null
          attachments?: Json | null
          case_number: string
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number | null
          details_updated_at?: string | null
          device_brand?: string | null
          device_color?: string | null
          device_grade?: string | null
          device_imei?: string | null
          device_model?: string | null
          discount_info?: Json | null
          id?: string
          partial_takeover?: boolean | null
          private_comments?: string | null
          problem_description?: string | null
          repair_notes?: string | null
          sav_type: string
          security_codes?: Json | null
          shop_id?: string | null
          sku?: string | null
          status?: string
          taken_over?: boolean
          taken_over_at?: string | null
          takeover_amount?: number | null
          technician_comments?: string | null
          technician_id?: string | null
          total_cost?: number | null
          total_time_minutes?: number | null
          tracking_slug?: string | null
          unlock_pattern?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accessories?: Json | null
          attachments?: Json | null
          case_number?: string
          created_at?: string
          customer_id?: string | null
          deposit_amount?: number | null
          details_updated_at?: string | null
          device_brand?: string | null
          device_color?: string | null
          device_grade?: string | null
          device_imei?: string | null
          device_model?: string | null
          discount_info?: Json | null
          id?: string
          partial_takeover?: boolean | null
          private_comments?: string | null
          problem_description?: string | null
          repair_notes?: string | null
          sav_type?: string
          security_codes?: Json | null
          shop_id?: string | null
          sku?: string | null
          status?: string
          taken_over?: boolean
          taken_over_at?: string | null
          takeover_amount?: number | null
          technician_comments?: string | null
          technician_id?: string | null
          total_cost?: number | null
          total_time_minutes?: number | null
          tracking_slug?: string | null
          unlock_pattern?: Json | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sav_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_cases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_cases_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          message: string
          read_by_client: boolean
          read_by_shop: boolean
          sav_case_id: string
          sender_name: string
          sender_type: string
          shop_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message: string
          read_by_client?: boolean
          read_by_shop?: boolean
          sav_case_id: string
          sender_name: string
          sender_type: string
          shop_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          message?: string
          read_by_client?: boolean
          read_by_shop?: boolean
          sav_case_id?: string
          sender_name?: string
          sender_type?: string
          shop_id?: string
        }
        Relationships: []
      }
      sav_parts: {
        Row: {
          attachments: Json | null
          created_at: string
          custom_part_name: string | null
          discount_info: Json | null
          id: string
          part_id: string | null
          purchase_price: number | null
          quantity: number
          sav_case_id: string | null
          time_minutes: number | null
          unit_price: number | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          custom_part_name?: string | null
          discount_info?: Json | null
          id?: string
          part_id?: string | null
          purchase_price?: number | null
          quantity?: number
          sav_case_id?: string | null
          time_minutes?: number | null
          unit_price?: number | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          custom_part_name?: string | null
          discount_info?: Json | null
          id?: string
          part_id?: string | null
          purchase_price?: number | null
          quantity?: number
          sav_case_id?: string | null
          time_minutes?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sav_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_parts_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          sav_case_id: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sav_case_id?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sav_case_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sav_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sav_status_history_sav_case_id_fkey"
            columns: ["sav_case_id"]
            isOneToOne: false
            referencedRelation: "sav_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      sav_tracking_visits: {
        Row: {
          created_at: string
          id: string
          sav_case_id: string
          tracking_slug: string
          visited_at: string
          visitor_ip: string | null
          visitor_user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          sav_case_id: string
          tracking_slug: string
          visited_at?: string
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          sav_case_id?: string
          tracking_slug?: string
          visited_at?: string
          visitor_ip?: string | null
          visitor_user_agent?: string | null
        }
        Relationships: []
      }
      shop_blocked_slots: {
        Row: {
          created_at: string
          end_datetime: string
          id: string
          reason: string | null
          shop_id: string
          start_datetime: string
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_datetime: string
          id?: string
          reason?: string | null
          shop_id: string
          start_datetime: string
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_datetime?: string
          id?: string
          reason?: string | null
          shop_id?: string
          start_datetime?: string
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_blocked_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_blocked_slots_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sav_statuses: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          is_final_status: boolean
          pause_timer: boolean
          shop_id: string
          show_in_sidebar: boolean
          status_color: string | null
          status_key: string
          status_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_final_status?: boolean
          pause_timer?: boolean
          shop_id: string
          show_in_sidebar?: boolean
          status_color?: string | null
          status_key: string
          status_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_final_status?: boolean
          pause_timer?: boolean
          shop_id?: string
          show_in_sidebar?: boolean
          status_color?: string | null
          status_key?: string
          status_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_sav_statuses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sav_types: {
        Row: {
          alert_days: number | null
          created_at: string
          display_order: number
          exclude_from_stats: boolean
          exclude_purchase_costs: boolean
          exclude_sales_revenue: boolean
          id: string
          is_active: boolean
          is_default: boolean
          max_processing_days: number | null
          pause_timer: boolean
          require_unlock_pattern: boolean
          shop_id: string
          show_customer_info: boolean
          show_in_sidebar: boolean
          show_satisfaction_survey: boolean
          type_color: string | null
          type_key: string
          type_label: string
          updated_at: string
        }
        Insert: {
          alert_days?: number | null
          created_at?: string
          display_order?: number
          exclude_from_stats?: boolean
          exclude_purchase_costs?: boolean
          exclude_sales_revenue?: boolean
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_processing_days?: number | null
          pause_timer?: boolean
          require_unlock_pattern?: boolean
          shop_id: string
          show_customer_info?: boolean
          show_in_sidebar?: boolean
          show_satisfaction_survey?: boolean
          type_color?: string | null
          type_key: string
          type_label: string
          updated_at?: string
        }
        Update: {
          alert_days?: number | null
          created_at?: string
          display_order?: number
          exclude_from_stats?: boolean
          exclude_purchase_costs?: boolean
          exclude_sales_revenue?: boolean
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_processing_days?: number | null
          pause_timer?: boolean
          require_unlock_pattern?: boolean
          shop_id?: string
          show_customer_info?: boolean
          show_in_sidebar?: boolean
          show_satisfaction_survey?: boolean
          type_color?: string | null
          type_key?: string
          type_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_seo_config: {
        Row: {
          accepts_reservations: boolean | null
          bing_site_verification: string | null
          business_hours: Json | null
          business_type: string | null
          canonical_domain: string | null
          created_at: string
          default_alt_text_pattern: string | null
          default_description: string | null
          default_keywords: string[] | null
          default_title: string | null
          facebook_domain_verification: string | null
          favicon_url: string | null
          force_https: boolean | null
          google_analytics_id: string | null
          google_site_verification: string | null
          google_tag_manager_id: string | null
          id: string
          languages_supported: string[] | null
          lazy_loading_enabled: boolean | null
          local_business_hours: Json | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          og_type: string | null
          price_range: string | null
          robots_txt: string | null
          service_areas: string[] | null
          shop_id: string
          sitemap_enabled: boolean | null
          twitter_card_type: string | null
          twitter_description: string | null
          twitter_image_url: string | null
          twitter_title: string | null
          updated_at: string
          webp_images_enabled: boolean | null
        }
        Insert: {
          accepts_reservations?: boolean | null
          bing_site_verification?: string | null
          business_hours?: Json | null
          business_type?: string | null
          canonical_domain?: string | null
          created_at?: string
          default_alt_text_pattern?: string | null
          default_description?: string | null
          default_keywords?: string[] | null
          default_title?: string | null
          facebook_domain_verification?: string | null
          favicon_url?: string | null
          force_https?: boolean | null
          google_analytics_id?: string | null
          google_site_verification?: string | null
          google_tag_manager_id?: string | null
          id?: string
          languages_supported?: string[] | null
          lazy_loading_enabled?: boolean | null
          local_business_hours?: Json | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          price_range?: string | null
          robots_txt?: string | null
          service_areas?: string[] | null
          shop_id: string
          sitemap_enabled?: boolean | null
          twitter_card_type?: string | null
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
          updated_at?: string
          webp_images_enabled?: boolean | null
        }
        Update: {
          accepts_reservations?: boolean | null
          bing_site_verification?: string | null
          business_hours?: Json | null
          business_type?: string | null
          canonical_domain?: string | null
          created_at?: string
          default_alt_text_pattern?: string | null
          default_description?: string | null
          default_keywords?: string[] | null
          default_title?: string | null
          facebook_domain_verification?: string | null
          favicon_url?: string | null
          force_https?: boolean | null
          google_analytics_id?: string | null
          google_site_verification?: string | null
          google_tag_manager_id?: string | null
          id?: string
          languages_supported?: string[] | null
          lazy_loading_enabled?: boolean | null
          local_business_hours?: Json | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          og_type?: string | null
          price_range?: string | null
          robots_txt?: string | null
          service_areas?: string[] | null
          shop_id?: string
          sitemap_enabled?: boolean | null
          twitter_card_type?: string | null
          twitter_description?: string | null
          twitter_image_url?: string | null
          twitter_title?: string | null
          updated_at?: string
          webp_images_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_seo_config_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number
          id: string
          name: string
          price: number
          shop_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          shop_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          shop_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shop_services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_statistics_config: {
        Row: {
          created_at: string
          id: string
          modules_config: Json
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          modules_config?: Json
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          modules_config?: Json
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_suppliers: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          password_encrypted: string | null
          price_coefficient: number | null
          shop_id: string
          supplier_name: string
          supplier_url: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          password_encrypted?: string | null
          price_coefficient?: number | null
          shop_id: string
          supplier_name: string
          supplier_url: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          password_encrypted?: string | null
          price_coefficient?: number | null
          shop_id?: string
          supplier_name?: string
          supplier_url?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_working_hours: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_open: boolean
          shop_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_open?: boolean
          shop_id: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_open?: boolean
          shop_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_working_hours_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          active_sav_count: number | null
          address: string | null
          admin_added_sms_credits: number | null
          ai_market_prices_enabled: boolean | null
          ai_modules_config: Json | null
          auto_review_enabled: boolean
          created_at: string
          custom_notification_sound_url: string | null
          custom_review_chat_message: string | null
          custom_review_sms_message: string | null
          custom_sav_limit: number | null
          custom_sms_limit: number | null
          custom_status_sms_message: string | null
          email: string | null
          forced_features: Json | null
          hide_empty_sav_types: boolean | null
          id: string
          invite_code: string | null
          last_monthly_reset: string | null
          logo_url: string | null
          menu_chats_visible: boolean | null
          menu_customers_visible: boolean | null
          menu_dashboard_visible: boolean | null
          menu_orders_visible: boolean | null
          menu_parts_visible: boolean | null
          menu_quotes_visible: boolean | null
          menu_sav_visible: boolean | null
          menu_statistics_visible: boolean | null
          monthly_sav_count: number | null
          monthly_sms_used: number | null
          name: string
          phone: string | null
          purchased_sms_credits: number | null
          review_link: string | null
          sav_delay_alerts_enabled: boolean | null
          sav_warning_enabled: boolean | null
          sidebar_late_sav_visible: boolean | null
          sidebar_nav_visible: boolean | null
          sidebar_sav_statuses_visible: boolean | null
          sidebar_sav_types_visible: boolean | null
          slug: string | null
          sms_alert_enabled: boolean | null
          sms_alert_threshold: number | null
          sms_credits_allocated: number | null
          sms_credits_used: number | null
          subscription_end: string | null
          subscription_forced: boolean | null
          subscription_menu_visible: boolean
          subscription_plan_id: string | null
          subscription_tier: string | null
          updated_at: string
          website_description: string | null
          website_enabled: boolean | null
          website_title: string | null
        }
        Insert: {
          active_sav_count?: number | null
          address?: string | null
          admin_added_sms_credits?: number | null
          ai_market_prices_enabled?: boolean | null
          ai_modules_config?: Json | null
          auto_review_enabled?: boolean
          created_at?: string
          custom_notification_sound_url?: string | null
          custom_review_chat_message?: string | null
          custom_review_sms_message?: string | null
          custom_sav_limit?: number | null
          custom_sms_limit?: number | null
          custom_status_sms_message?: string | null
          email?: string | null
          forced_features?: Json | null
          hide_empty_sav_types?: boolean | null
          id?: string
          invite_code?: string | null
          last_monthly_reset?: string | null
          logo_url?: string | null
          menu_chats_visible?: boolean | null
          menu_customers_visible?: boolean | null
          menu_dashboard_visible?: boolean | null
          menu_orders_visible?: boolean | null
          menu_parts_visible?: boolean | null
          menu_quotes_visible?: boolean | null
          menu_sav_visible?: boolean | null
          menu_statistics_visible?: boolean | null
          monthly_sav_count?: number | null
          monthly_sms_used?: number | null
          name: string
          phone?: string | null
          purchased_sms_credits?: number | null
          review_link?: string | null
          sav_delay_alerts_enabled?: boolean | null
          sav_warning_enabled?: boolean | null
          sidebar_late_sav_visible?: boolean | null
          sidebar_nav_visible?: boolean | null
          sidebar_sav_statuses_visible?: boolean | null
          sidebar_sav_types_visible?: boolean | null
          slug?: string | null
          sms_alert_enabled?: boolean | null
          sms_alert_threshold?: number | null
          sms_credits_allocated?: number | null
          sms_credits_used?: number | null
          subscription_end?: string | null
          subscription_forced?: boolean | null
          subscription_menu_visible?: boolean
          subscription_plan_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          website_description?: string | null
          website_enabled?: boolean | null
          website_title?: string | null
        }
        Update: {
          active_sav_count?: number | null
          address?: string | null
          admin_added_sms_credits?: number | null
          ai_market_prices_enabled?: boolean | null
          ai_modules_config?: Json | null
          auto_review_enabled?: boolean
          created_at?: string
          custom_notification_sound_url?: string | null
          custom_review_chat_message?: string | null
          custom_review_sms_message?: string | null
          custom_sav_limit?: number | null
          custom_sms_limit?: number | null
          custom_status_sms_message?: string | null
          email?: string | null
          forced_features?: Json | null
          hide_empty_sav_types?: boolean | null
          id?: string
          invite_code?: string | null
          last_monthly_reset?: string | null
          logo_url?: string | null
          menu_chats_visible?: boolean | null
          menu_customers_visible?: boolean | null
          menu_dashboard_visible?: boolean | null
          menu_orders_visible?: boolean | null
          menu_parts_visible?: boolean | null
          menu_quotes_visible?: boolean | null
          menu_sav_visible?: boolean | null
          menu_statistics_visible?: boolean | null
          monthly_sav_count?: number | null
          monthly_sms_used?: number | null
          name?: string
          phone?: string | null
          purchased_sms_credits?: number | null
          review_link?: string | null
          sav_delay_alerts_enabled?: boolean | null
          sav_warning_enabled?: boolean | null
          sidebar_late_sav_visible?: boolean | null
          sidebar_nav_visible?: boolean | null
          sidebar_sav_statuses_visible?: boolean | null
          sidebar_sav_types_visible?: boolean | null
          slug?: string | null
          sms_alert_enabled?: boolean | null
          sms_alert_threshold?: number | null
          sms_credits_allocated?: number | null
          sms_credits_used?: number | null
          subscription_end?: string | null
          subscription_forced?: boolean | null
          subscription_menu_visible?: boolean
          subscription_plan_id?: string | null
          subscription_tier?: string | null
          updated_at?: string
          website_description?: string | null
          website_enabled?: boolean | null
          website_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_history: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message: string
          record_id: string | null
          shop_id: string
          status: string
          to_number: string
          twilio_sid: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          record_id?: string | null
          shop_id: string
          status?: string
          to_number: string
          twilio_sid?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          record_id?: string | null
          shop_id?: string
          status?: string
          to_number?: string
          twilio_sid?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          invoice_data: Json | null
          invoice_number: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          package_id: string
          paid_at: string | null
          pdf_url: string | null
          shop_id: string
          sms_count: number
          status: string
          stripe_payment_intent_id: string | null
          total_ht_cents: number | null
          total_ttc_cents: number | null
          updated_at: string
          vat_amount_cents: number | null
          vat_rate: number | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          invoice_data?: Json | null
          invoice_number: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          package_id: string
          paid_at?: string | null
          pdf_url?: string | null
          shop_id: string
          sms_count: number
          status?: string
          stripe_payment_intent_id?: string | null
          total_ht_cents?: number | null
          total_ttc_cents?: number | null
          updated_at?: string
          vat_amount_cents?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_data?: Json | null
          invoice_number?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          package_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          shop_id?: string
          sms_count?: number
          status?: string
          stripe_payment_intent_id?: string | null
          total_ht_cents?: number | null
          total_ttc_cents?: number | null
          updated_at?: string
          vat_amount_cents?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      sms_package_purchases: {
        Row: {
          created_at: string
          id: string
          package_id: string
          price_paid_cents: number
          processed_at: string | null
          shop_id: string
          sms_count: number
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          price_paid_cents: number
          processed_at?: string | null
          shop_id: string
          sms_count: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          price_paid_cents?: number
          processed_at?: string | null
          shop_id?: string
          sms_count?: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_package_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sms_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_package_purchases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sms_count: number
          stripe_price_id: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sms_count: number
          stripe_price_id?: string | null
          subscription_tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sms_count?: number
          stripe_price_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          active_sav_count: number | null
          created_at: string
          email: string
          id: string
          sms_credits_used: number | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_sav_count?: number | null
          created_at?: string
          email: string
          id?: string
          sms_credits_used?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_sav_count?: number | null
          created_at?: string
          email?: string
          id?: string
          sms_credits_used?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_data: Json | null
          invoice_number: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          paid_at: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          shop_id: string
          status: string
          stripe_invoice_id: string | null
          total_ht_cents: number | null
          total_ttc_cents: number | null
          updated_at: string
          vat_amount_cents: number | null
          vat_rate: number | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_data?: Json | null
          invoice_number: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          shop_id: string
          status?: string
          stripe_invoice_id?: string | null
          total_ht_cents?: number | null
          total_ttc_cents?: number | null
          updated_at?: string
          vat_amount_cents?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_data?: Json | null
          invoice_number?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          shop_id?: string
          status?: string
          stripe_invoice_id?: string | null
          total_ht_cents?: number | null
          total_ttc_cents?: number | null
          updated_at?: string
          vat_amount_cents?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          contact_only: boolean
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          menu_config: Json | null
          monthly_price: number
          name: string
          sav_limit: number | null
          sms_limit: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          contact_only?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          menu_config?: Json | null
          monthly_price?: number
          name: string
          sav_limit?: number | null
          sms_limit?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          contact_only?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          menu_config?: Json | null
          monthly_price?: number
          name?: string
          sav_limit?: number | null
          sms_limit?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_by_admin: boolean
          read_by_shop: boolean
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_by_admin?: boolean
          read_by_shop?: boolean
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_by_admin?: boolean
          read_by_shop?: boolean
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          shop_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          shop_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          shop_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          check_frequency_hours: number | null
          created_at: string
          id: string
          is_enabled: boolean
          last_alert_sent_at: string | null
          last_check_at: string | null
          name: string
          sms_message_1: string | null
          sms_message_2: string | null
          sms_message_3: string | null
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          check_frequency_hours?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_alert_sent_at?: string | null
          last_check_at?: string | null
          name: string
          sms_message_1?: string | null
          sms_message_2?: string | null
          sms_message_3?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          check_frequency_hours?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_alert_sent_at?: string | null
          last_check_at?: string | null
          name?: string
          sms_message_1?: string | null
          sms_message_2?: string | null
          sms_message_3?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      twilio_alert_config: {
        Row: {
          alert_phone: string
          created_at: string
          id: string
          is_active: boolean
          threshold_sms: number
          updated_at: string
        }
        Insert: {
          alert_phone: string
          created_at?: string
          id?: string
          is_active?: boolean
          threshold_sms?: number
          updated_at?: string
        }
        Update: {
          alert_phone?: string
          created_at?: string
          id?: string
          is_active?: boolean
          threshold_sms?: number
          updated_at?: string
        }
        Relationships: []
      }
      widget_configurations: {
        Row: {
          created_at: string | null
          id: string
          sav_statuses_filter: string[] | null
          sav_types_filter: string[] | null
          shop_id: string
          temporality: string | null
          updated_at: string | null
          widget_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sav_statuses_filter?: string[] | null
          sav_types_filter?: string[] | null
          shop_id: string
          temporality?: string | null
          updated_at?: string | null
          widget_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sav_statuses_filter?: string[] | null
          sav_types_filter?: string[] | null
          shop_id?: string
          temporality?: string | null
          updated_at?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_configurations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_shop_storage_usage: {
        Args: { p_shop_id: string }
        Returns: number
      }
      check_subscription_limits: { Args: { p_shop_id: string }; Returns: Json }
      check_subscription_limits_v2: {
        Args: { p_action?: string; p_shop_id: string }
        Returns: Json
      }
      check_subscription_limits_v3: {
        Args: { p_action?: string; p_shop_id: string }
        Returns: Json
      }
      create_profile_only: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      create_real_user_for_shop: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      create_user_for_shop: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      create_user_with_profile: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      delete_client_tracking_message: {
        Args: {
          p_message_id: string
          p_sender_name: string
          p_tracking_slug: string
        }
        Returns: string
      }
      ensure_super_admin_profile: { Args: never; Returns: undefined }
      execute_custom_widget_query: {
        Args: {
          param2?: string
          param3?: string
          param4?: string
          param5?: string
          query_text: string
          shop_id_param: string
        }
        Returns: Json
      }
      generate_case_number: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      generate_invoice_number: {
        Args: { invoice_type: string }
        Returns: string
      }
      generate_quote_number: { Args: never; Returns: string }
      generate_satisfaction_token: { Args: never; Returns: string }
      generate_shop_slug: { Args: { shop_name: string }; Returns: string }
      generate_tracking_slug: {
        Args: { customer_name: string }
        Returns: string
      }
      get_all_shops_storage_usage: {
        Args: never
        Returns: {
          shop_id: string
          shop_name: string
          storage_bytes: number
          storage_gb: number
        }[]
      }
      get_available_stock: { Args: { part_id: string }; Returns: number }
      get_current_user_role: { Args: never; Returns: string }
      get_current_user_shop_id: { Args: never; Returns: string }
      get_parts_statistics: {
        Args: { p_shop_id: string }
        Returns: {
          low_stock_count: number
          total_quantity: number
          total_value: number
        }[]
      }
      get_sms_credits_breakdown: {
        Args: { p_shop_id: string }
        Returns: {
          admin_added: number
          monthly_allocated: number
          monthly_remaining: number
          monthly_used: number
          purchased_and_admin_remaining: number
          purchased_and_admin_used: number
          purchased_total: number
          total_available: number
          total_remaining: number
        }[]
      }
      get_total_sms_credits: { Args: { p_shop_id: string }; Returns: number }
      get_tracking_info: {
        Args: { p_tracking_slug: string }
        Returns: {
          case_number: string
          created_at: string
          customer_first_name: string
          device_brand: string
          device_model: string
          sav_case_id: string
          sav_type: string
          shop_address: string
          shop_email: string
          shop_logo_url: string
          shop_name: string
          shop_phone: string
          status: string
          total_cost: number
        }[]
      }
      get_tracking_messages: {
        Args: { p_tracking_slug: string }
        Returns: {
          attachments: Json
          created_at: string
          id: string
          message: string
          sender_name: string
          sender_type: string
        }[]
      }
      invite_user_to_shop: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: Json
      }
      is_shop_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      mask_phone_number: { Args: { phone_number: string }; Returns: string }
      record_sav_visit: {
        Args: {
          p_tracking_slug: string
          p_visitor_ip?: string
          p_visitor_user_agent?: string
        }
        Returns: undefined
      }
      reset_monthly_counters: { Args: never; Returns: undefined }
      reset_monthly_sms_credits: { Args: never; Returns: undefined }
      send_client_tracking_message: {
        Args: {
          p_message: string
          p_sender_name: string
          p_tracking_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      appointment_status:
        | "proposed"
        | "confirmed"
        | "counter_proposed"
        | "cancelled"
        | "completed"
        | "no_show"
      appointment_type: "deposit" | "pickup" | "diagnostic" | "repair"
      sav_status:
        | "pending"
        | "in_progress"
        | "testing"
        | "ready"
        | "delivered"
        | "cancelled"
        | "parts_ordered"
        | "parts_received"
      user_role: "super_admin" | "shop_admin" | "technician" | "admin"
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
      appointment_status: [
        "proposed",
        "confirmed",
        "counter_proposed",
        "cancelled",
        "completed",
        "no_show",
      ],
      appointment_type: ["deposit", "pickup", "diagnostic", "repair"],
      sav_status: [
        "pending",
        "in_progress",
        "testing",
        "ready",
        "delivered",
        "cancelled",
        "parts_ordered",
        "parts_received",
      ],
      user_role: ["super_admin", "shop_admin", "technician", "admin"],
    },
  },
} as const
