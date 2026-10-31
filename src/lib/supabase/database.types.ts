/* Generated from the Supabase schema. Refresh with: npm run db:types (after supabase link). */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      applications: {
        Row: {
          address_text: string | null;
          created_at: string;
          decided_at: string | null;
          decision_reason: string | null;
          declared_net_income: number | null;
          deposit_amount: number | null;
          deposit_months: number;
          employment: Database["public"]["Enums"]["employment_type"] | null;
          has_co_applicant: boolean;
          id: string;
          landlord_email: string | null;
          landlord_kind: Database["public"]["Enums"]["landlord_kind"];
          locale: Database["public"]["Enums"]["locale"];
          max_coverage: number | null;
          monthly_rent: number;
          move_in_date: string | null;
          offer_expires_at: string | null;
          property_id: string | null;
          quoted_premium_monthly: number | null;
          quoted_premium_yearly: number | null;
          quoted_rate_pct: number | null;
          referred_by_org_id: string | null;
          source: string | null;
          status: Database["public"]["Enums"]["application_status"];
          tenant_id: string;
          updated_at: string;
          utm: Json | null;
        };
        Insert: {
          address_text?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          declared_net_income?: number | null;
          deposit_amount?: number | null;
          deposit_months?: number;
          employment?: Database["public"]["Enums"]["employment_type"] | null;
          has_co_applicant?: boolean;
          id?: string;
          landlord_email?: string | null;
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"];
          locale?: Database["public"]["Enums"]["locale"];
          max_coverage?: number | null;
          monthly_rent: number;
          move_in_date?: string | null;
          offer_expires_at?: string | null;
          property_id?: string | null;
          quoted_premium_monthly?: number | null;
          quoted_premium_yearly?: number | null;
          quoted_rate_pct?: number | null;
          referred_by_org_id?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          tenant_id: string;
          updated_at?: string;
          utm?: Json | null;
        };
        Update: {
          address_text?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          declared_net_income?: number | null;
          deposit_amount?: number | null;
          deposit_months?: number;
          employment?: Database["public"]["Enums"]["employment_type"] | null;
          has_co_applicant?: boolean;
          id?: string;
          landlord_email?: string | null;
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"];
          locale?: Database["public"]["Enums"]["locale"];
          max_coverage?: number | null;
          monthly_rent?: number;
          move_in_date?: string | null;
          offer_expires_at?: string | null;
          property_id?: string | null;
          quoted_premium_monthly?: number | null;
          quoted_premium_yearly?: number | null;
          quoted_rate_pct?: number | null;
          referred_by_org_id?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          tenant_id?: string;
          updated_at?: string;
          utm?: Json | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: Json | null;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [];
      };
      claims: {
        Row: {
          amount_claimed: number;
          amount_paid: number | null;
          created_at: string;
          id: string;
          policy_id: string;
          reason: string;
          status: Database["public"]["Enums"]["claim_status"];
          submitted_by: string;
          updated_at: string;
        };
        Insert: {
          amount_claimed: number;
          amount_paid?: number | null;
          created_at?: string;
          id?: string;
          policy_id: string;
          reason: string;
          status?: Database["public"]["Enums"]["claim_status"];
          submitted_by: string;
          updated_at?: string;
        };
        Update: {
          amount_claimed?: number;
          amount_paid?: number | null;
          created_at?: string;
          id?: string;
          policy_id?: string;
          reason?: string;
          status?: Database["public"]["Enums"]["claim_status"];
          submitted_by?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          created_at: string;
          granted: boolean;
          id: string;
          kind: string;
          user_id: string;
          version: string;
        };
        Insert: {
          created_at?: string;
          granted?: boolean;
          id?: string;
          kind: string;
          user_id: string;
          version: string;
        };
        Update: {
          created_at?: string;
          granted?: boolean;
          id?: string;
          kind?: string;
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          created_at: string;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          tax_number: string | null;
          type: Database["public"]["Enums"]["org_type"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          tax_number?: string | null;
          type: Database["public"]["Enums"]["org_type"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          tax_number?: string | null;
          type?: Database["public"]["Enums"]["org_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      policies: {
        Row: {
          application_id: string;
          billing_period: Database["public"]["Enums"]["billing_period"];
          certificate_path: string | null;
          coverage_amount: number;
          created_at: string;
          end_date: string | null;
          id: string;
          insurer: string | null;
          insurer_policy_ref: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          policy_number: string;
          premium_amount: number;
          property_id: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["policy_status"];
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          certificate_path?: string | null;
          coverage_amount: number;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          insurer?: string | null;
          insurer_policy_ref?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
          policy_number?: string;
          premium_amount: number;
          property_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["policy_status"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          certificate_path?: string | null;
          coverage_amount?: number;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          insurer?: string | null;
          insurer_policy_ref?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
          policy_number?: string;
          premium_amount?: number;
          property_id?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["policy_status"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          birth_date: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          locale: Database["public"]["Enums"]["locale"];
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          locale?: Database["public"]["Enums"]["locale"];
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["locale"];
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address_line: string;
          city: string;
          created_at: string;
          id: string;
          landlord_email: string | null;
          landlord_kind: Database["public"]["Enums"]["landlord_kind"];
          landlord_name: string | null;
          org_id: string | null;
          owner_user_id: string | null;
          postal_code: string | null;
          updated_at: string;
        };
        Insert: {
          address_line: string;
          city?: string;
          created_at?: string;
          id?: string;
          landlord_email?: string | null;
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"];
          landlord_name?: string | null;
          org_id?: string | null;
          owner_user_id?: string | null;
          postal_code?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line?: string;
          city?: string;
          created_at?: string;
          id?: string;
          landlord_email?: string | null;
          landlord_kind?: Database["public"]["Enums"]["landlord_kind"];
          landlord_name?: string | null;
          org_id?: string | null;
          owner_user_id?: string | null;
          postal_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verifications: {
        Row: {
          application_id: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["verification_method"];
          provider: string | null;
          provider_ref: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          summary: Json | null;
          verified_income: number | null;
        };
        Insert: {
          application_id: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["verification_method"];
          provider?: string | null;
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          summary?: Json | null;
          verified_income?: number | null;
        };
        Update: {
          application_id?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["verification_method"];
          provider?: string | null;
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          summary?: Json | null;
          verified_income?: number | null;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          email_provider_contact_id: string | null;
          id: string;
          locale: Database["public"]["Enums"]["locale"];
          marketing_consent: boolean;
          marketing_consent_version: string | null;
          privacy_notice_version: string;
          segment: Database["public"]["Enums"]["waitlist_segment"];
          source: string | null;
          utm: Json | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          email_provider_contact_id?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["locale"];
          marketing_consent?: boolean;
          marketing_consent_version?: string | null;
          privacy_notice_version: string;
          segment?: Database["public"]["Enums"]["waitlist_segment"];
          source?: string | null;
          utm?: Json | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          email_provider_contact_id?: string | null;
          id?: string;
          locale?: Database["public"]["Enums"]["locale"];
          marketing_consent?: boolean;
          marketing_consent_version?: string | null;
          privacy_notice_version?: string;
          segment?: Database["public"]["Enums"]["waitlist_segment"];
          source?: string | null;
          utm?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      application_status: "draft" | "submitted" | "verifying" | "approved" | "declined" | "accepted" | "expired" | "cancelled";
      billing_period: "monthly" | "yearly";
      claim_status: "submitted" | "in_review" | "approved" | "paid" | "rejected" | "recovering" | "closed";
      employment_type: "employee" | "self_employed" | "student" | "retired" | "other";
      landlord_kind: "private" | "company";
      locale: "hu" | "en";
      org_role: "owner" | "admin" | "agent";
      org_type: "agency" | "property_manager" | "company";
      policy_status: "pending_payment" | "active" | "cancelled" | "ended" | "claimed";
      staff_role: "superadmin" | "admin" | "ops" | "support";
      verification_method: "open_banking" | "nav" | "employer" | "manual" | "dap";
      verification_status: "pending" | "passed" | "failed" | "expired";
      waitlist_segment: "tenant" | "landlord" | "agent" | "company";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
