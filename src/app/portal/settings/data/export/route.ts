import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Adataid → "Letöltés": everything Keyfly keeps about the signed-in person, as one JSON file (GDPR art. 15 and 20).
 * Read with the person's own rights (RLS), so it holds exactly what they can see; secrets (token hashes) are left out.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return new NextResponse(null, { status: 401 });
  const me = String(auth.claims.sub);

  const [profile, memberships, accessRequests, leaseRequests, leases, properties, invitations, consents, applications, policies, claims, sessions, factors, trusted] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, phone, birth_date, locale, start_view, email_prefs, avatar_path, home_address, mailing_address, created_at, updated_at").eq("id", me).maybeSingle(),
    supabase.from("account_members").select("role, property_scope, created_at, accounts(id, kind, name, legal_name, tax_number, eu_vat_number, company_reg_number, registered_address, mailing_address, contact_email, contact_phone, plan)").eq("user_id", me),
    supabase.from("account_access_requests").select("account_id, message, status, created_at, decided_at").eq("user_id", me),
    supabase.from("lease_requests").select("*"),
    supabase.from("leases").select("*"),
    supabase.from("properties").select("*"),
    supabase.from("invitations").select("id, kind, email, account_id, account_role, lease_id, lease_request_id, occupant_role, expires_at, accepted_at, declined_at, revoked_at, created_at").eq("invited_by", me),
    supabase.from("consents").select("kind, version, granted, created_at").eq("user_id", me),
    supabase.from("applications").select("*"),
    supabase.from("policies").select("*"),
    supabase.from("claims").select("*"),
    supabase.rpc("my_sessions"),
    supabase.auth.mfa.listFactors(),
    supabase.from("trusted_devices").select("label, created_at, expires_at, last_used_at"),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    controller: "Plattio Magyarország Kft. – Keyfly",
    profile: profile.data,
    accounts: memberships.data ?? [],
    access_requests: accessRequests.data ?? [],
    lease_requests: leaseRequests.data ?? [],
    leases: leases.data ?? [],
    properties: properties.data ?? [],
    invitations_sent: invitations.data ?? [],
    consents: consents.data ?? [],
    applications: applications.data ?? [],
    policies: policies.data ?? [],
    claims: claims.data ?? [],
    sign_ins: (sessions.data ?? []).map((s) => ({ device: s.user_agent, started: s.created_at, last_active: s.last_active_at })),
    two_step_verification: (factors.data?.totp ?? []).map((f) => ({ type: "authenticator app", added: f.created_at })),
    trusted_devices: trusted.data ?? [],
  };
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="keyfly-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
