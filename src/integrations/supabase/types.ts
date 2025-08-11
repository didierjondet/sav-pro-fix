export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
          created_at: string
          id: string
          min_stock: number | null
          name: string
          notes: string | null
          purchase_price: number | null
          quantity: number | null
          reference: string | null
          selling_price: number | null
          shop_id: string | null
          time_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock?: number | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number | null
          reference?: string | null
          selling_price?: number | null
          shop_id?: string | null
          time_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number | null
          reference?: string | null
          selling_price?: number | null
          shop_id?: string | null
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
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          device_brand: string | null
          device_imei: string | null
          device_model: string | null
          id: string
          items: Json
          problem_description: string | null
          quote_date: string | null
          quote_number: string
          repair_notes: string | null
          shop_id: string
          sku: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          id?: string
          items?: Json
          problem_description?: string | null
          quote_date?: string | null
          quote_number: string
          repair_notes?: string | null
          shop_id: string
          sku?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          id?: string
          items?: Json
          problem_description?: string | null
          quote_date?: string | null
          quote_number?: string
          repair_notes?: string | null
          shop_id?: string
          sku?: string | null
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
        ]
      }
      sav_cases: {
        Row: {
          case_number: string
          created_at: string
          customer_id: string | null
          device_brand: string | null
          device_imei: string | null
          device_model: string | null
          id: string
          partial_takeover: boolean | null
          private_comments: string | null
          problem_description: string | null
          repair_notes: string | null
          sav_type: Database["public"]["Enums"]["sav_type"]
          shop_id: string | null
          sku: string | null
          status: Database["public"]["Enums"]["sav_status"]
          taken_over: boolean
          taken_over_at: string | null
          takeover_amount: number | null
          technician_id: string | null
          total_cost: number | null
          total_time_minutes: number | null
          tracking_slug: string | null
          updated_at: string
        }
        Insert: {
          case_number: string
          created_at?: string
          customer_id?: string | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          id?: string
          partial_takeover?: boolean | null
          private_comments?: string | null
          problem_description?: string | null
          repair_notes?: string | null
          sav_type: Database["public"]["Enums"]["sav_type"]
          shop_id?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["sav_status"]
          taken_over?: boolean
          taken_over_at?: string | null
          takeover_amount?: number | null
          technician_id?: string | null
          total_cost?: number | null
          total_time_minutes?: number | null
          tracking_slug?: string | null
          updated_at?: string
        }
        Update: {
          case_number?: string
          created_at?: string
          customer_id?: string | null
          device_brand?: string | null
          device_imei?: string | null
          device_model?: string | null
          id?: string
          partial_takeover?: boolean | null
          private_comments?: string | null
          problem_description?: string | null
          repair_notes?: string | null
          sav_type?: Database["public"]["Enums"]["sav_type"]
          shop_id?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["sav_status"]
          taken_over?: boolean
          taken_over_at?: string | null
          takeover_amount?: number | null
          technician_id?: string | null
          total_cost?: number | null
          total_time_minutes?: number | null
          tracking_slug?: string | null
          updated_at?: string
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
          status: Database["public"]["Enums"]["sav_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sav_case_id?: string | null
          status: Database["public"]["Enums"]["sav_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sav_case_id?: string | null
          status?: Database["public"]["Enums"]["sav_status"]
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
      shop_sav_statuses: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          shop_id: string
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
          shop_id: string
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
          shop_id?: string
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
      shops: {
        Row: {
          active_sav_count: number | null
          address: string | null
          auto_review_enabled: boolean
          created_at: string
          email: string | null
          id: string
          invite_code: string | null
          logo_url: string | null
          max_sav_processing_days_client: number | null
          max_sav_processing_days_internal: number | null
          name: string
          phone: string | null
          review_link: string | null
          slug: string | null
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
          auto_review_enabled?: boolean
          created_at?: string
          email?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          max_sav_processing_days_client?: number | null
          max_sav_processing_days_internal?: number | null
          name: string
          phone?: string | null
          review_link?: string | null
          slug?: string | null
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
          auto_review_enabled?: boolean
          created_at?: string
          email?: string | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          max_sav_processing_days_client?: number | null
          max_sav_processing_days_internal?: number | null
          name?: string
          phone?: string | null
          review_link?: string | null
          slug?: string | null
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
          id: string
          message: string
          record_id: string | null
          shop_id: string
          status: string
          to_number: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          record_id?: string | null
          shop_id: string
          status?: string
          to_number: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          record_id?: string | null
          shop_id?: string
          status?: string
          to_number?: string
          type?: string
          updated_at?: string
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
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          sav_limit: number | null
          sms_limit: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name: string
          sav_limit?: number | null
          sms_limit?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_limits: {
        Args: { p_shop_id: string }
        Returns: Json
      }
      check_subscription_limits_v2: {
        Args: { p_shop_id: string; p_action?: string }
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
          p_password: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      create_user_for_shop: {
        Args: {
          p_email: string
          p_password: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      create_user_with_profile: {
        Args: {
          p_email: string
          p_password: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_shop_id: string
        }
        Returns: string
      }
      ensure_super_admin_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_case_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_quote_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_shop_slug: {
        Args: { shop_name: string }
        Returns: string
      }
      generate_tracking_slug: {
        Args: { customer_name: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_shop_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      is_shop_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      reset_monthly_sms_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      sav_status:
        | "pending"
        | "in_progress"
        | "testing"
        | "ready"
        | "delivered"
        | "cancelled"
        | "parts_ordered"
      sav_type: "client" | "internal" | "external"
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
      sav_status: [
        "pending",
        "in_progress",
        "testing",
        "ready",
        "delivered",
        "cancelled",
        "parts_ordered",
      ],
      sav_type: ["client", "internal", "external"],
      user_role: ["super_admin", "shop_admin", "technician", "admin"],
    },
  },
} as const
