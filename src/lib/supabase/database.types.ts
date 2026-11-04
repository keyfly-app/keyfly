/* Generated from the Supabase schema. Refresh with: npm run db:types (after supabase link). */
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_access_requests: {
        Row: {
          account_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: Database["public"]["Enums"]["access_request_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_extras: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_extras_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_extras_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_member_properties: {
        Row: {
          account_id: string
          property_id: string
          user_id: string
        }
        Insert: {
          account_id: string
          property_id: string
          user_id: string
        }
        Update: {
          account_id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_member_properties_account_id_user_id_fkey"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "account_members"
            referencedColumns: ["account_id", "user_id"]
          },
          {
            foreignKeyName: "account_member_properties_property_id_account_id_fkey"
            columns: ["property_id", "account_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id", "account_id"]
          },
        ]
      }
      account_members: {
        Row: {
          account_id: string
          created_at: string
          invited_by: string | null
          property_scope: Database["public"]["Enums"]["property_scope"]
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
          view: Database["public"]["Enums"]["start_view"] | null
        }
        Insert: {
          account_id: string
          created_at?: string
          invited_by?: string | null
          property_scope?: Database["public"]["Enums"]["property_scope"]
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
          view?: Database["public"]["Enums"]["start_view"] | null
        }
        Update: {
          account_id?: string
          created_at?: string
          invited_by?: string | null
          property_scope?: Database["public"]["Enums"]["property_scope"]
          role?: Database["public"]["Enums"]["account_role"]
          user_id?: string
          view?: Database["public"]["Enums"]["start_view"] | null
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          archived_at: string | null
          company_reg_number: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          eu_vat_number: string | null
          id: string
          is_referral_partner: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          legal_name: string | null
          logo_path: string | null
          mailing_address: Json | null
          name: string
          nav_verified_at: string | null
          office_address: Json | null
          personal_user_id: string | null
          plan: Database["public"]["Enums"]["account_plan"]
          registered_address: string | null
          slug: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          eu_vat_number?: string | null
          id?: string
          is_referral_partner?: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          legal_name?: string | null
          logo_path?: string | null
          mailing_address?: Json | null
          name: string
          nav_verified_at?: string | null
          office_address?: Json | null
          personal_user_id?: string | null
          plan?: Database["public"]["Enums"]["account_plan"]
          registered_address?: string | null
          slug?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_reg_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          eu_vat_number?: string | null
          id?: string
          is_referral_partner?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          legal_name?: string | null
          logo_path?: string | null
          mailing_address?: Json | null
          name?: string
          nav_verified_at?: string | null
          office_address?: Json | null
          personal_user_id?: string | null
          plan?: Database["public"]["Enums"]["account_plan"]
          registered_address?: string | null
          slug?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_personal_user_id_fkey"
            columns: ["personal_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          address_text: string | null
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          declared_net_income: number | null
          deposit_amount: number | null
          deposit_months: number
          employment: Database["public"]["Enums"]["employment_type"] | null
          has_co_applicant: boolean
          id: string
          landlord_email: string | null
          landlord_kind: Database["public"]["Enums"]["landlord_kind"]
          locale: Database["public"]["Enums"]["locale"]
          max_coverage: number | null
          monthly_rent: number
          move_in_date: string | null
          offer_expires_at: string | null
          property_id: string | null
          quoted_premium_monthly: number | null
          quoted_premium_yearly: number | null
          quoted_rate_pct: number | null
          referred_by_account_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["application_status"]
          tenant_id: string
          updated_at: string
          utm: Json | null
        }
        Insert: {
          address_text?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          declared_net_income?: number | null
          deposit_amount?: number | null
          deposit_months?: number
          employment?: Database["public"]["Enums"]["employment_type"] | null
          has_co_applicant?: boolean
          id?: string
          landlord_email?: string | null
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"]
          locale?: Database["public"]["Enums"]["locale"]
          max_coverage?: number | null
          monthly_rent: number
          move_in_date?: string | null
          offer_expires_at?: string | null
          property_id?: string | null
          quoted_premium_monthly?: number | null
          quoted_premium_yearly?: number | null
          quoted_rate_pct?: number | null
          referred_by_account_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tenant_id: string
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          address_text?: string | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          declared_net_income?: number | null
          deposit_amount?: number | null
          deposit_months?: number
          employment?: Database["public"]["Enums"]["employment_type"] | null
          has_co_applicant?: boolean
          id?: string
          landlord_email?: string | null
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"]
          locale?: Database["public"]["Enums"]["locale"]
          max_coverage?: number | null
          monthly_rent?: number
          move_in_date?: string | null
          offer_expires_at?: string | null
          property_id?: string | null
          quoted_premium_monthly?: number | null
          quoted_premium_yearly?: number | null
          quoted_rate_pct?: number | null
          referred_by_account_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tenant_id?: string
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_referred_by_account_id_fkey"
            columns: ["referred_by_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          currency: string
          holder_name: string
          iban: string
          id: string
          is_primary: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          holder_name: string
          iban: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          holder_name?: string
          iban?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          active: boolean
          icon: string | null
          key: string
          label_en: string
          label_hu: string
          list: string
          meta: Json
          short_en: string | null
          short_hu: string | null
          sort: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          icon?: string | null
          key: string
          label_en: string
          label_hu: string
          list: string
          meta?: Json
          short_en?: string | null
          short_hu?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          icon?: string | null
          key?: string
          label_en?: string
          label_hu?: string
          list?: string
          meta?: Json
          short_en?: string | null
          short_hu?: string | null
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          amount_claimed: number
          amount_paid: number | null
          created_at: string
          id: string
          policy_id: string
          reason: string
          status: Database["public"]["Enums"]["claim_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          amount_claimed: number
          amount_paid?: number | null
          created_at?: string
          id?: string
          policy_id: string
          reason: string
          status?: Database["public"]["Enums"]["claim_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          amount_claimed?: number
          amount_paid?: number | null
          created_at?: string
          id?: string
          policy_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["claim_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          kind: string
          user_id: string
          version: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          kind: string
          user_id: string
          version: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          kind?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          address: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          default_role_key: string | null
          default_role_label: string | null
          email: string | null
          id: string
          name: string
          note: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          address?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_role_key?: string | null
          default_role_label?: string | null
          email?: string | null
          id?: string
          name: string
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          address?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          default_role_key?: string | null
          default_role_label?: string | null
          email?: string | null
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batch_changes: {
        Row: {
          batch_id: string
          before: Json
          property_id: string
        }
        Insert: {
          batch_id: string
          before: Json
          property_id: string
        }
        Update: {
          batch_id?: string
          before?: Json
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batch_changes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batch_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          rows_imported: number
          rows_total: number
          undone_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          rows_imported?: number
          rows_total: number
          undone_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          rows_imported?: number
          rows_total?: number
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_properties: {
        Row: {
          account_id: string
          invitation_id: string
          property_id: string
        }
        Insert: {
          account_id: string
          invitation_id: string
          property_id: string
        }
        Update: {
          account_id?: string
          invitation_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_properties_invitation_id_account_id_fkey"
            columns: ["invitation_id", "account_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id", "account_id"]
          },
          {
            foreignKeyName: "invitation_properties_property_id_account_id_fkey"
            columns: ["property_id", "account_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id", "account_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          account_id: string | null
          account_role: Database["public"]["Enums"]["account_role"] | null
          created_at: string
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          lease_id: string | null
          lease_request_id: string | null
          occupant_role: Database["public"]["Enums"]["occupant_role"] | null
          property_scope: Database["public"]["Enums"]["property_scope"] | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_id?: string | null
          account_role?: Database["public"]["Enums"]["account_role"] | null
          created_at?: string
          declined_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          kind: Database["public"]["Enums"]["invitation_kind"]
          lease_id?: string | null
          lease_request_id?: string | null
          occupant_role?: Database["public"]["Enums"]["occupant_role"] | null
          property_scope?: Database["public"]["Enums"]["property_scope"] | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          account_id?: string | null
          account_role?: Database["public"]["Enums"]["account_role"] | null
          created_at?: string
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          kind?: Database["public"]["Enums"]["invitation_kind"]
          lease_id?: string | null
          lease_request_id?: string | null
          occupant_role?: Database["public"]["Enums"]["occupant_role"] | null
          property_scope?: Database["public"]["Enums"]["property_scope"] | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_lease_request_id_fkey"
            columns: ["lease_request_id"]
            isOneToOne: false
            referencedRelation: "lease_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_occupants: {
        Row: {
          added_by: string | null
          created_at: string
          lease_id: string
          removed_at: string | null
          role: Database["public"]["Enums"]["occupant_role"]
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          lease_id: string
          removed_at?: string | null
          role: Database["public"]["Enums"]["occupant_role"]
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          lease_id?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["occupant_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_occupants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_occupants_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_occupants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_parties: {
        Row: {
          address: string | null
          captured_at: string
          company_reg_number: string | null
          email: string | null
          kind: Database["public"]["Enums"]["account_kind"]
          lease_id: string
          name: string
          phone: string | null
          representative_name: string | null
          side: Database["public"]["Enums"]["lease_party_side"]
          tax_number: string | null
        }
        Insert: {
          address?: string | null
          captured_at?: string
          company_reg_number?: string | null
          email?: string | null
          kind: Database["public"]["Enums"]["account_kind"]
          lease_id: string
          name: string
          phone?: string | null
          representative_name?: string | null
          side: Database["public"]["Enums"]["lease_party_side"]
          tax_number?: string | null
        }
        Update: {
          address?: string | null
          captured_at?: string
          company_reg_number?: string | null
          email?: string | null
          kind?: Database["public"]["Enums"]["account_kind"]
          lease_id?: string
          name?: string
          phone?: string | null
          representative_name?: string | null
          side?: Database["public"]["Enums"]["lease_party_side"]
          tax_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_parties_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_requests: {
        Row: {
          building: string | null
          city: string
          country_code: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          deposit_amount: number | null
          door: string | null
          end_date: string | null
          floor_number: number | null
          floor_type: Database["public"]["Enums"]["floor_type"] | null
          house_number: string
          id: string
          invitation_expires_at: string
          landlord_account_id: string | null
          landlord_email: string
          landlord_name: string | null
          last_sent_at: string
          lease_id: string | null
          monthly_rent: number
          postal_code: string
          property_kind: string
          reminder_count: number
          staircase: string | null
          start_date: string
          status: Database["public"]["Enums"]["lease_request_status"]
          street_name: string
          street_type: string
          tenant_account_id: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          city: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deposit_amount?: number | null
          door?: string | null
          end_date?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          house_number: string
          id?: string
          invitation_expires_at: string
          landlord_account_id?: string | null
          landlord_email: string
          landlord_name?: string | null
          last_sent_at?: string
          lease_id?: string | null
          monthly_rent: number
          postal_code: string
          property_kind?: string
          reminder_count?: number
          staircase?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_request_status"]
          street_name: string
          street_type: string
          tenant_account_id: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          city?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deposit_amount?: number | null
          door?: string | null
          end_date?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          house_number?: string
          id?: string
          invitation_expires_at?: string
          landlord_account_id?: string | null
          landlord_email?: string
          landlord_name?: string | null
          last_sent_at?: string
          lease_id?: string | null
          monthly_rent?: number
          postal_code?: string
          property_kind?: string
          reminder_count?: number
          staircase?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_request_status"]
          street_name?: string
          street_type?: string
          tenant_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_requests_landlord_account_id_fkey"
            columns: ["landlord_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_requests_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_requests_tenant_account_id_fkey"
            columns: ["tenant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          account_id: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          end_date: string | null
          id: string
          landlord_confirmed_at: string | null
          monthly_rent: number
          payment_day: number | null
          property_id: string
          service_charge: number | null
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tenant_account_id: string | null
          tenant_confirmed_at: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          id?: string
          landlord_confirmed_at?: string | null
          monthly_rent: number
          payment_day?: number | null
          property_id: string
          service_charge?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_account_id?: string | null
          tenant_confirmed_at?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          id?: string
          landlord_confirmed_at?: string | null
          monthly_rent?: number
          payment_day?: number | null
          property_id?: string
          service_charge?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_account_id?: string | null
          tenant_confirmed_at?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_account_id_fkey"
            columns: ["tenant_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meters: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          registers: number
          serial: string | null
          service_id: string
          sort: number
          tariff_key: string | null
          unit_key: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          registers?: number
          serial?: string | null
          service_id: string
          sort?: number
          tariff_key?: string | null
          unit_key?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          registers?: number
          serial?: string | null
          service_id?: string
          sort?: number
          tariff_key?: string | null
          unit_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "meters_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "property_services"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_recovery_failures: {
        Row: {
          at: string
          user_id: string
        }
        Insert: {
          at?: string
          user_id: string
        }
        Update: {
          at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_recovery_failures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          expires_at: string
          phone: string
          user_id: string
        }
        Insert: {
          expires_at: string
          phone: string
          user_id: string
        }
        Update: {
          expires_at?: string
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          application_id: string
          billing_period: Database["public"]["Enums"]["billing_period"]
          certificate_path: string | null
          coverage_amount: number
          created_at: string
          end_date: string | null
          id: string
          insurer: string | null
          insurer_policy_ref: string | null
          lease_id: string | null
          payment_provider: string | null
          payment_ref: string | null
          policy_number: string
          premium_amount: number
          property_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["policy_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          billing_period?: Database["public"]["Enums"]["billing_period"]
          certificate_path?: string | null
          coverage_amount: number
          created_at?: string
          end_date?: string | null
          id?: string
          insurer?: string | null
          insurer_policy_ref?: string | null
          lease_id?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          policy_number?: string
          premium_amount: number
          property_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["policy_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          billing_period?: Database["public"]["Enums"]["billing_period"]
          certificate_path?: string | null
          coverage_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          insurer?: string | null
          insurer_policy_ref?: string | null
          lease_id?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          policy_number?: string
          premium_amount?: number
          property_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["policy_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          email_prefs: Json
          full_name: string | null
          home_address: Json | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          mailing_address: Json | null
          password_changed_at: string | null
          phone: string | null
          phone_verified_at: string | null
          start_view: Database["public"]["Enums"]["start_view"] | null
          two_step_email: boolean
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_prefs?: Json
          full_name?: string | null
          home_address?: Json | null
          id: string
          locale?: Database["public"]["Enums"]["locale"]
          mailing_address?: Json | null
          password_changed_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          start_view?: Database["public"]["Enums"]["start_view"] | null
          two_step_email?: boolean
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          email_prefs?: Json
          full_name?: string | null
          home_address?: Json | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          mailing_address?: Json | null
          password_changed_at?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          start_view?: Database["public"]["Enums"]["start_view"] | null
          two_step_email?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          account_id: string
          address_note: string | null
          archived_at: string | null
          area_m2: number | null
          building: string | null
          built_year: number | null
          city: string
          copied_from: string | null
          country_code: string
          created_at: string
          created_by: string | null
          district: number | null
          door: string | null
          energy_rating: string | null
          floor_number: number | null
          floor_type: Database["public"]["Enums"]["floor_type"] | null
          furnishing: string | null
          google_place_id: string | null
          half_rooms: number | null
          heating: string | null
          house_number: string
          id: string
          import_batch_id: string | null
          kind: string
          label: string | null
          latitude: number | null
          lift: boolean | null
          longitude: number | null
          other_kind_label: string | null
          own_ref: string | null
          parcel_number: string | null
          parking: string | null
          postal_code: string
          public_code: string
          rooms: number | null
          staircase: string | null
          street_name: string
          street_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          address_note?: string | null
          archived_at?: string | null
          area_m2?: number | null
          building?: string | null
          built_year?: number | null
          city: string
          copied_from?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          district?: number | null
          door?: string | null
          energy_rating?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          furnishing?: string | null
          google_place_id?: string | null
          half_rooms?: number | null
          heating?: string | null
          house_number: string
          id?: string
          import_batch_id?: string | null
          kind?: string
          label?: string | null
          latitude?: number | null
          lift?: boolean | null
          longitude?: number | null
          other_kind_label?: string | null
          own_ref?: string | null
          parcel_number?: string | null
          parking?: string | null
          postal_code: string
          public_code: string
          rooms?: number | null
          staircase?: string | null
          street_name: string
          street_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          address_note?: string | null
          archived_at?: string | null
          area_m2?: number | null
          building?: string | null
          built_year?: number | null
          city?: string
          copied_from?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          district?: number | null
          door?: string | null
          energy_rating?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          furnishing?: string | null
          google_place_id?: string | null
          half_rooms?: number | null
          heating?: string | null
          house_number?: string
          id?: string
          import_batch_id?: string | null
          kind?: string
          label?: string | null
          latitude?: number | null
          lift?: boolean | null
          longitude?: number | null
          other_kind_label?: string | null
          own_ref?: string | null
          parcel_number?: string | null
          parking?: string | null
          postal_code?: string
          public_code?: string
          rooms?: number | null
          staircase?: string | null
          street_name?: string
          street_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      property_contacts: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          property_id: string
          role_key: string | null
          role_label: string | null
          sort: number
          tenant_visible: boolean
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          property_id: string
          role_key?: string | null
          role_label?: string | null
          sort?: number
          tenant_visible?: boolean
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          property_id?: string
          role_key?: string | null
          role_label?: string | null
          sort?: number
          tenant_visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "property_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_extras: {
        Row: {
          account_extra_id: string | null
          extra_key: string | null
          id: string
          property_id: string
        }
        Insert: {
          account_extra_id?: string | null
          extra_key?: string | null
          id?: string
          property_id: string
        }
        Update: {
          account_extra_id?: string | null
          extra_key?: string | null
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_extras_account_extra_id_fkey"
            columns: ["account_extra_id"]
            isOneToOne: false
            referencedRelation: "account_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_extras_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_links: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          property_id: string
          sort: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          property_id: string
          sort?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          property_id?: string
          sort?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listing: {
        Row: {
          asking_rent: number | null
          available_from: string | null
          available_now: boolean
          currency: string
          deposit_months: number | null
          description: string | null
          est_bills: number | null
          min_term_months: number | null
          parking_property_id: string | null
          parking_rent: number | null
          pets: string | null
          property_id: string
          smoking: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          asking_rent?: number | null
          available_from?: string | null
          available_now?: boolean
          currency?: string
          deposit_months?: number | null
          description?: string | null
          est_bills?: number | null
          min_term_months?: number | null
          parking_property_id?: string | null
          parking_rent?: number | null
          pets?: string | null
          property_id: string
          smoking?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          asking_rent?: number | null
          available_from?: string | null
          available_now?: boolean
          currency?: string
          deposit_months?: number | null
          description?: string | null
          est_bills?: number | null
          min_term_months?: number | null
          parking_property_id?: string | null
          parking_rent?: number | null
          pets?: string | null
          property_id?: string
          smoking?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_listing_parking_property_id_fkey"
            columns: ["parking_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listing_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_management: {
        Row: {
          common_charge: number | null
          note: string | null
          owner_contact_id: string | null
          owner_kind: string | null
          property_id: string
          responsible_user_id: string | null
          updated_at: string
        }
        Insert: {
          common_charge?: number | null
          note?: string | null
          owner_contact_id?: string | null
          owner_kind?: string | null
          property_id: string
          responsible_user_id?: string | null
          updated_at?: string
        }
        Update: {
          common_charge?: number | null
          note?: string | null
          owner_contact_id?: string | null
          owner_kind?: string | null
          property_id?: string
          responsible_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_management_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_management_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_management_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          bytes: number | null
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          is_cover: boolean
          kind: string
          path: string
          property_id: string
          sort: number
          width: number | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          kind?: string
          path: string
          property_id: string
          sort?: number
          width?: number | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          is_cover?: boolean
          kind?: string
          path?: string
          property_id?: string
          sort?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_outdoor: {
        Row: {
          area_m2: number | null
          kind: string
          property_id: string
        }
        Insert: {
          area_m2?: number | null
          kind: string
          property_id: string
        }
        Update: {
          area_m2?: number | null
          kind?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_outdoor_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_services: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          custom_label: string | null
          ended_on: string | null
          fee_amount: number | null
          fee_currency: string
          id: string
          network_provider_id: string | null
          paused_from: string | null
          paused_until: string | null
          property_id: string
          provider_id: string | null
          provider_name: string | null
          reading_due: string | null
          reading_frequency: string | null
          reading_required: boolean
          settlement_key: string
          sort: number
          type_key: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_label?: string | null
          ended_on?: string | null
          fee_amount?: number | null
          fee_currency?: string
          id?: string
          network_provider_id?: string | null
          paused_from?: string | null
          paused_until?: string | null
          property_id: string
          provider_id?: string | null
          provider_name?: string | null
          reading_due?: string | null
          reading_frequency?: string | null
          reading_required?: boolean
          settlement_key?: string
          sort?: number
          type_key: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_label?: string | null
          ended_on?: string | null
          fee_amount?: number | null
          fee_currency?: string
          id?: string
          network_provider_id?: string | null
          paused_from?: string | null
          paused_until?: string | null
          property_id?: string
          provider_id?: string | null
          provider_name?: string | null
          reading_due?: string | null
          reading_frequency?: string | null
          reading_required?: boolean
          settlement_key?: string
          sort?: number
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_services_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_network_provider_id_fkey"
            columns: ["network_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          active: boolean
          fault_phone: string | null
          former_names: string[]
          id: string
          legal_name: string
          phone: string | null
          postcode_prefixes: string[]
          role: string
          service_types: string[]
          short_name: string
          sort: number
          source_url: string | null
          updated_at: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          active?: boolean
          fault_phone?: string | null
          former_names?: string[]
          id?: string
          legal_name: string
          phone?: string | null
          postcode_prefixes?: string[]
          role?: string
          service_types: string[]
          short_name: string
          sort?: number
          source_url?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          active?: boolean
          fault_phone?: string | null
          former_names?: string[]
          id?: string
          legal_name?: string
          phone?: string | null
          postcode_prefixes?: string[]
          role?: string
          service_types?: string[]
          short_name?: string
          sort?: number
          source_url?: string | null
          updated_at?: string
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      service_identifiers: {
        Row: {
          id: string
          label: string
          service_id: string
          sort: number
          value: string
        }
        Insert: {
          id?: string
          label: string
          service_id: string
          sort?: number
          value: string
        }
        Update: {
          id?: string
          label?: string
          service_id?: string
          sort?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_identifiers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "property_services"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_sends: {
        Row: {
          at: string
          user_id: string
        }
        Insert: {
          at?: string
          user_id: string
        }
        Update: {
          at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          disabled_at: string | null
          invited_by: string | null
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          invited_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["staff_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          label: string
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_step_email_codes: {
        Row: {
          attempts: number
          code_hash: string
          expires_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          expires_at: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_step_email_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_step_email_sends: {
        Row: {
          at: string
          user_id: string
        }
        Insert: {
          at?: string
          user_id: string
        }
        Update: {
          at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_step_email_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_step_passes: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_step_passes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["verification_method"]
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["verification_status"]
          summary: Json | null
          verified_income: number | null
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["verification_method"]
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          summary?: Json | null
          verified_income?: number | null
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["verification_method"]
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          summary?: Json | null
          verified_income?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: Database["public"]["Enums"]["locale"]
          marketing_consent: boolean
          marketing_consent_version: string | null
          privacy_notice_version: string
          pro_interest: boolean
          pro_interest_version: string | null
          segment: Database["public"]["Enums"]["waitlist_segment"]
          source: string | null
          utm: Json | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          marketing_consent?: boolean
          marketing_consent_version?: string | null
          privacy_notice_version: string
          pro_interest?: boolean
          pro_interest_version?: string | null
          segment?: Database["public"]["Enums"]["waitlist_segment"]
          source?: string | null
          utm?: Json | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          marketing_consent?: boolean
          marketing_consent_version?: string | null
          privacy_notice_version?: string
          pro_interest?: boolean
          pro_interest_version?: string | null
          segment?: Database["public"]["Enums"]["waitlist_segment"]
          source?: string | null
          utm?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_tenant_account_id?: string; p_token: string }
        Returns: string
      }
      accept_landlord_invitation: {
        Args: {
          p_account_id: string
          p_deposit_amount?: number
          p_end_date?: string
          p_monthly_rent: number
          p_payment_day?: number
          p_property_id?: string
          p_start_date: string
          p_token: string
        }
        Returns: {
          lease_id: string
          needs_tenant_approval: boolean
          tenant_email: string
          tenant_locale: Database["public"]["Enums"]["locale"]
        }[]
      }
      accept_staff_invitation: { Args: { p_token: string }; Returns: undefined }
      account_access_requests_list: {
        Args: { p_account_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          user_id: string
        }[]
      }
      account_deletion_blockers: {
        Args: never
        Returns: {
          kind: string
          name: string
        }[]
      }
      account_members_list: {
        Args: { p_account_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          property_scope: Database["public"]["Enums"]["property_scope"]
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
        }[]
      }
      activity_log: {
        Args: { p_account_id?: string; p_limit?: number }
        Returns: {
          account_id: string
          action: string
          actor_id: string
          actor_is_staff: boolean
          changes: Json
          id: number
          occurred_at: string
          row_key: string
          table_name: string
        }[]
      }
      add_email_identity: { Args: { p_user: string }; Returns: boolean }
      archive_property: { Args: { p_property_id: string }; Returns: undefined }
      cancel_access_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      cancel_lease: { Args: { p_lease_id: string }; Returns: undefined }
      cancel_lease_request: {
        Args: { p_request_id: string }
        Returns: {
          landlord_email: string
          landlord_locale: Database["public"]["Enums"]["locale"]
          taken_over: boolean
        }[]
      }
      close_lease: { Args: { p_lease_id: string }; Returns: undefined }
      company_lookup: {
        Args: { p_tax8: string }
        Returns: {
          account_id: string
          i_am_member: boolean
          invitation_only: boolean
          name: string
          requested_at: string
          slug: string
        }[]
      }
      confirm_lease_request: {
        Args: { p_request_id: string }
        Returns: {
          landlord_email: string
          landlord_locale: Database["public"]["Enums"]["locale"]
          lease_id: string
        }[]
      }
      confirm_two_step_email: { Args: { p_code_hash: string }; Returns: string }
      consume_recovery_code: { Args: { p_hash: string }; Returns: boolean }
      copy_property: {
        Args: {
          p_building?: string
          p_city: string
          p_contacts?: boolean
          p_door?: string
          p_features?: boolean
          p_floor_number?: number
          p_floor_type?: Database["public"]["Enums"]["floor_type"]
          p_house_number: string
          p_label?: string
          p_management?: boolean
          p_own_ref?: string
          p_postal_code: string
          p_services?: boolean
          p_source: string
          p_staircase?: string
          p_street_name: string
          p_street_type: string
        }
        Returns: {
          property_id: string
          public_code: string
        }[]
      }
      create_account_invitation: {
        Args: {
          p_account_id: string
          p_email: string
          p_property_ids?: string[]
          p_role: Database["public"]["Enums"]["account_role"]
          p_scope?: Database["public"]["Enums"]["property_scope"]
        }
        Returns: string
      }
      create_company_account: {
        Args: {
          p_legal_name: string
          p_name?: string
          p_owner: string
          p_registered_address?: string
          p_tax_number: string
        }
        Returns: string
      }
      create_lease_invitation: {
        Args: {
          p_email: string
          p_kind: Database["public"]["Enums"]["invitation_kind"]
          p_lease_id: string
          p_occupant_role?: Database["public"]["Enums"]["occupant_role"]
        }
        Returns: string
      }
      create_lease_request: {
        Args: {
          p_building?: string
          p_city: string
          p_deposit_amount?: number
          p_door?: string
          p_end_date?: string
          p_floor_number?: number
          p_floor_type?: Database["public"]["Enums"]["floor_type"]
          p_house_number: string
          p_landlord_email: string
          p_landlord_name?: string
          p_monthly_rent: number
          p_postal_code: string
          p_property_kind?: string
          p_staircase?: string
          p_start_date: string
          p_street_name: string
          p_street_type: string
          p_tenant_account_id?: string
        }
        Returns: {
          expires_at: string
          request_id: string
          token: string
        }[]
      }
      create_property: {
        Args: {
          p_account_id: string
          p_building?: string
          p_city: string
          p_door?: string
          p_floor_number?: number
          p_floor_type?: Database["public"]["Enums"]["floor_type"]
          p_house_number: string
          p_kind: string
          p_label?: string
          p_other_kind_label?: string
          p_own_ref?: string
          p_postal_code: string
          p_staircase?: string
          p_street_name: string
          p_street_type: string
        }
        Returns: {
          property_id: string
          public_code: string
        }[]
      }
      create_staff_invitation: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["staff_role"]
        }
        Returns: string
      }
      decide_access_request: {
        Args: {
          p_approve: boolean
          p_request_id: string
          p_role?: Database["public"]["Enums"]["account_role"]
        }
        Returns: {
          account_name: string
          account_slug: string
          requester_email: string
          requester_locale: Database["public"]["Enums"]["locale"]
          requester_name: string
        }[]
      }
      decline_invitation: { Args: { p_token: string }; Returns: undefined }
      delete_recovery_codes: { Args: never; Returns: undefined }
      end_my_session: { Args: { p_session_id: string }; Returns: boolean }
      import_properties: {
        Args: { p_account_id: string; p_file_name: string; p_rows: Json }
        Returns: {
          batch_id: string
          created: number
          updated: number
        }[]
      }
      invitation_preview: {
        Args: { p_token: string }
        Returns: {
          account_name: string
          account_role: Database["public"]["Enums"]["account_role"]
          end_date: string
          expires_at: string
          inviter_name: string
          is_for_me: boolean
          is_open: boolean
          kind: Database["public"]["Enums"]["invitation_kind"]
          masked_email: string
          monthly_rent: number
          occupant_role: Database["public"]["Enums"]["occupant_role"]
          property_address: string
          start_date: string
        }[]
      }
      invitation_teaser: {
        Args: { p_token: string }
        Returns: {
          city: string
          expires_at: string
          house_number: string
          inviter_name: string
          is_open: boolean
          kind: Database["public"]["Enums"]["invitation_kind"]
          masked_email: string
          postal_code: string
          property_kind: string
          street: string
        }[]
      }
      lease_phase: {
        Args: { l: Database["public"]["Tables"]["leases"]["Row"] }
        Returns: Database["public"]["Enums"]["lease_phase"]
      }
      lease_request_preview: {
        Args: { p_token: string }
        Returns: {
          building: string
          city: string
          deposit_amount: number
          door: string
          end_date: string
          expires_at: string
          floor_number: number
          floor_type: Database["public"]["Enums"]["floor_type"]
          house_number: string
          monthly_rent: number
          postal_code: string
          property_kind: string
          request_id: string
          staircase: string
          start_date: string
          street_name: string
          street_type: string
          tenant_name: string
        }[]
      }
      my_access_requests: {
        Args: never
        Returns: {
          account_id: string
          created_at: string
          id: string
          name: string
          tax_number: string
        }[]
      }
      my_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          is_current: boolean
          last_active_at: string
          user_agent: string
        }[]
      }
      pending_phone: { Args: never; Returns: string }
      recovery_codes_left: { Args: never; Returns: number }
      referral_status: {
        Args: { p_account_id: string }
        Returns: {
          application_id: string
          created_at: string
          monthly_rent: number
          status: Database["public"]["Enums"]["application_status"]
        }[]
      }
      remind_lease_request: {
        Args: { p_request_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      remove_phone: { Args: never; Returns: undefined }
      request_company_access: {
        Args: { p_account_id: string; p_message?: string }
        Returns: string
      }
      reset_staff_mfa: { Args: { p_user_id: string }; Returns: undefined }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      save_property_features: {
        Args: {
          p_account_extras?: string[]
          p_area_m2: number
          p_built_year: number
          p_energy_rating: string
          p_extras?: string[]
          p_furnishing: string
          p_half_rooms: number
          p_heating: string
          p_lift: boolean
          p_new_extras?: string[]
          p_outdoor?: Json
          p_parking: string
          p_property_id: string
          p_rooms: number
        }
        Returns: undefined
      }
      save_property_owner: {
        Args: {
          p_contact_id?: string
          p_kind: string
          p_new_contact?: Json
          p_property_id: string
        }
        Returns: string
      }
      save_service: {
        Args: {
          p_identifiers?: Json
          p_meters?: Json
          p_property_id: string
          p_service: Json
          p_service_id: string
        }
        Returns: string
      }
      set_account_view: {
        Args: {
          p_account_id: string
          p_view: Database["public"]["Enums"]["start_view"]
        }
        Returns: undefined
      }
      set_confirmed_phone: {
        Args: { p_phone: string; p_user: string }
        Returns: boolean
      }
      set_member_role: {
        Args: {
          p_account_id: string
          p_role: Database["public"]["Enums"]["account_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_recovery_codes: { Args: { p_hashes: string[] }; Returns: undefined }
      set_two_step_email: { Args: { p_on: boolean }; Returns: undefined }
      staff_invitation_preview: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          inviter_name: string
          is_open: boolean
          role: Database["public"]["Enums"]["staff_role"]
        }[]
      }
      staff_overview: {
        Args: never
        Returns: {
          created_at: string
          disabled_at: string
          email: string
          full_name: string
          has_2fa: boolean
          last_sign_in_at: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }[]
      }
      start_phone_check: { Args: { p_phone: string }; Returns: number }
      start_two_step_email: {
        Args: { p_code_hash: string }
        Returns: undefined
      }
      transfer_account_ownership: {
        Args: { p_account_id: string; p_new_owner: string }
        Returns: undefined
      }
      trust_device: {
        Args: { p_label: string; p_token_hash: string }
        Returns: string
      }
      trusted_device_ok: { Args: { p_token_hash: string }; Returns: boolean }
      two_step_pass_ok: { Args: never; Returns: boolean }
      undo_import: { Args: { p_batch_id: string }; Returns: undefined }
      undo_phone_check: { Args: never; Returns: undefined }
      undo_two_step_email: { Args: never; Returns: undefined }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "declined" | "cancelled"
      account_kind: "person" | "company"
      account_plan: "basic" | "pro" | "enterprise"
      account_role: "owner" | "admin" | "manager" | "viewer"
      application_status:
        | "draft"
        | "submitted"
        | "verifying"
        | "approved"
        | "declined"
        | "accepted"
        | "expired"
        | "cancelled"
      billing_period: "monthly" | "yearly"
      claim_status:
        | "submitted"
        | "in_review"
        | "approved"
        | "paid"
        | "rejected"
        | "recovering"
        | "closed"
      employment_type:
        | "employee"
        | "self_employed"
        | "student"
        | "retired"
        | "other"
      floor_type:
        | "basement"
        | "ground"
        | "raised_ground"
        | "mezzanine"
        | "numbered"
        | "attic"
      invitation_kind:
        | "account_member"
        | "lease_tenant"
        | "lease_occupant"
        | "lease_landlord"
      landlord_kind: "private" | "company"
      lease_party_side: "landlord" | "tenant"
      lease_phase:
        | "draft"
        | "pending"
        | "upcoming"
        | "active"
        | "closing"
        | "closed"
        | "cancelled"
      lease_request_status:
        | "pending_landlord"
        | "pending_tenant"
        | "confirmed"
        | "declined"
        | "cancelled"
      lease_status: "draft" | "pending" | "confirmed" | "closed" | "cancelled"
      locale: "hu" | "en"
      occupant_role: "co_tenant" | "occupant"
      policy_status:
        | "pending_payment"
        | "active"
        | "cancelled"
        | "ended"
        | "claimed"
      property_scope: "all" | "selected"
      staff_role: "superadmin" | "admin" | "insurance" | "support" | "finance"
      start_view: "tenant" | "landlord" | "manager"
      verification_method:
        | "open_banking"
        | "nav"
        | "employer"
        | "manual"
        | "dap"
      verification_status: "pending" | "passed" | "failed" | "expired"
      waitlist_segment: "tenant" | "landlord" | "agent" | "company"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      access_request_status: ["pending", "approved", "declined", "cancelled"],
      account_kind: ["person", "company"],
      account_plan: ["basic", "pro", "enterprise"],
      account_role: ["owner", "admin", "manager", "viewer"],
      application_status: [
        "draft",
        "submitted",
        "verifying",
        "approved",
        "declined",
        "accepted",
        "expired",
        "cancelled",
      ],
      billing_period: ["monthly", "yearly"],
      claim_status: [
        "submitted",
        "in_review",
        "approved",
        "paid",
        "rejected",
        "recovering",
        "closed",
      ],
      employment_type: [
        "employee",
        "self_employed",
        "student",
        "retired",
        "other",
      ],
      floor_type: [
        "basement",
        "ground",
        "raised_ground",
        "mezzanine",
        "numbered",
        "attic",
      ],
      invitation_kind: [
        "account_member",
        "lease_tenant",
        "lease_occupant",
        "lease_landlord",
      ],
      landlord_kind: ["private", "company"],
      lease_party_side: ["landlord", "tenant"],
      lease_phase: [
        "draft",
        "pending",
        "upcoming",
        "active",
        "closing",
        "closed",
        "cancelled",
      ],
      lease_request_status: [
        "pending_landlord",
        "pending_tenant",
        "confirmed",
        "declined",
        "cancelled",
      ],
      lease_status: ["draft", "pending", "confirmed", "closed", "cancelled"],
      locale: ["hu", "en"],
      occupant_role: ["co_tenant", "occupant"],
      policy_status: [
        "pending_payment",
        "active",
        "cancelled",
        "ended",
        "claimed",
      ],
      property_scope: ["all", "selected"],
      staff_role: ["superadmin", "admin", "insurance", "support", "finance"],
      start_view: ["tenant", "landlord", "manager"],
      verification_method: ["open_banking", "nav", "employer", "manual", "dap"],
      verification_status: ["pending", "passed", "failed", "expired"],
      waitlist_segment: ["tenant", "landlord", "agent", "company"],
    },
  },
} as const
