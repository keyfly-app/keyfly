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
        }
        Insert: {
          account_id: string
          created_at?: string
          invited_by?: string | null
          property_scope?: Database["public"]["Enums"]["property_scope"]
          role: Database["public"]["Enums"]["account_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          invited_by?: string | null
          property_scope?: Database["public"]["Enums"]["property_scope"]
          role?: Database["public"]["Enums"]["account_role"]
          user_id?: string
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
          created_at: string
          created_by: string | null
          id: string
          is_referral_partner: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          legal_name: string | null
          name: string
          personal_user_id: string | null
          plan: Database["public"]["Enums"]["account_plan"]
          registered_address: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_reg_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_referral_partner?: boolean
          kind: Database["public"]["Enums"]["account_kind"]
          legal_name?: string | null
          name: string
          personal_user_id?: string | null
          plan?: Database["public"]["Enums"]["account_plan"]
          registered_address?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_reg_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_referral_partner?: boolean
          kind?: Database["public"]["Enums"]["account_kind"]
          legal_name?: string | null
          name?: string
          personal_user_id?: string | null
          plan?: Database["public"]["Enums"]["account_plan"]
          registered_address?: string | null
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
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          phone: string | null
          start_view: Database["public"]["Enums"]["start_view"] | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          locale?: Database["public"]["Enums"]["locale"]
          phone?: string | null
          start_view?: Database["public"]["Enums"]["start_view"] | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          phone?: string | null
          start_view?: Database["public"]["Enums"]["start_view"] | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          account_id: string
          address_note: string | null
          archived_at: string | null
          building: string | null
          city: string
          country_code: string
          created_at: string
          created_by: string | null
          district: number | null
          door: string | null
          floor_number: number | null
          floor_type: Database["public"]["Enums"]["floor_type"] | null
          google_place_id: string | null
          house_number: string
          id: string
          kind: Database["public"]["Enums"]["property_kind"]
          label: string | null
          latitude: number | null
          longitude: number | null
          parcel_number: string | null
          postal_code: string
          staircase: string | null
          street_name: string
          street_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          address_note?: string | null
          archived_at?: string | null
          building?: string | null
          city: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          district?: number | null
          door?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          google_place_id?: string | null
          house_number: string
          id?: string
          kind?: Database["public"]["Enums"]["property_kind"]
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          parcel_number?: string | null
          postal_code: string
          staircase?: string | null
          street_name: string
          street_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          address_note?: string | null
          archived_at?: string | null
          building?: string | null
          city?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          district?: number | null
          door?: string | null
          floor_number?: number | null
          floor_type?: Database["public"]["Enums"]["floor_type"] | null
          google_place_id?: string | null
          house_number?: string
          id?: string
          kind?: Database["public"]["Enums"]["property_kind"]
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          parcel_number?: string | null
          postal_code?: string
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
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
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
      confirm_lease_request: {
        Args: { p_request_id: string }
        Returns: {
          landlord_email: string
          landlord_locale: Database["public"]["Enums"]["locale"]
          lease_id: string
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
          p_company_reg_number?: string
          p_legal_name: string
          p_name?: string
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
      create_staff_invitation: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["staff_role"]
        }
        Returns: string
      }
      decline_invitation: { Args: { p_token: string }; Returns: undefined }
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
          request_id: string
          staircase: string
          start_date: string
          street_name: string
          street_type: string
          tenant_name: string
        }[]
      }
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
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      transfer_account_ownership: {
        Args: { p_account_id: string; p_new_owner: string }
        Returns: undefined
      }
    }
    Enums: {
      account_kind: "person" | "company"
      account_plan: "basic" | "pro" | "business"
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
      lease_request_status:
        | "pending_landlord"
        | "pending_tenant"
        | "confirmed"
        | "declined"
        | "cancelled"
      lease_phase:
        | "draft"
        | "pending"
        | "upcoming"
        | "active"
        | "closing"
        | "closed"
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
      property_kind: "flat" | "room" | "house"
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
      account_kind: ["person", "company"],
      account_plan: ["basic", "pro", "business"],
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
      lease_request_status: [
        "pending_landlord",
        "pending_tenant",
        "confirmed",
        "declined",
        "cancelled",
      ],
      lease_phase: [
        "draft",
        "pending",
        "upcoming",
        "active",
        "closing",
        "closed",
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
      property_kind: ["flat", "room", "house"],
      property_scope: ["all", "selected"],
      staff_role: ["superadmin", "admin", "insurance", "support", "finance"],
      start_view: ["tenant", "landlord", "manager"],
      verification_method: ["open_banking", "nav", "employer", "manual", "dap"],
      verification_status: ["pending", "passed", "failed", "expired"],
      waitlist_segment: ["tenant", "landlord", "agent", "company"],
    },
  },
} as const
