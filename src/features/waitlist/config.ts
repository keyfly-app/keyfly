import type { Enums } from "@/lib/supabase/database.types";

/** Order of the segment options in every waitlist form. */
export const WAITLIST_SEGMENTS: readonly Enums<"waitlist_segment">[] = ["tenant", "landlord", "agent", "company"];

/** Segments that are offered the Keyfly Pro / Business interest checkbox (the database enforces the same). */
export const PRO_SEGMENTS: readonly Enums<"waitlist_segment">[] = ["landlord", "agent"];

/** Where a sign-up came from (stored in waitlist.source). */
export const WAITLIST_SOURCES = ["coming-soon-hero", "coming-soon-footer", "pro-footer"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];
