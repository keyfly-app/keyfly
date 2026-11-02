import type { IconName } from "@/components/Icon";

/** Keyfly Pro features in display order (copy: messages pro.features.<key>). */
export const PRO_FEATURES = [
  { key: "properties", icon: "map" },
  { key: "tenants", icon: "user" },
  { key: "documents", icon: "document" },
  { key: "payments", icon: "bell" },
  { key: "meters", icon: "gauge" },
  { key: "repairs", icon: "wrench" },
  { key: "tenantSpace", icon: "user" },
] as const satisfies readonly { key: string; icon: IconName }[];

/** Plans in display order (copy: messages pro.plans.<key>); "pro" is highlighted. */
export const PRO_PLANS = ["basic", "pro", "enterprise"] as const;

/** Illustrative dates on the preview card. Not real data. */
export const PREVIEW_DATES = { leaseEnd: "2027-08-31T12:00:00Z", paymentDue: "2026-11-05T12:00:00Z" } as const;
