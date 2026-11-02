/**
 * Email preferences (Értesítések). One switch per topic; each email category belongs to at most one topic.
 * Categories without a topic – invitations, security notices, staff mail – are always sent.
 */
export const EMAIL_TOPICS = ["lease_changes", "lease_expiry", "team", "invoices", "news"] as const;
export type EmailTopic = (typeof EMAIL_TOPICS)[number];

/** What a topic is when the person never touched its switch. Product news is opt-in. */
export const TOPIC_DEFAULTS: Record<EmailTopic, boolean> = { lease_changes: true, lease_expiry: true, team: true, invoices: true, news: false };

const TOPIC_OF: Record<string, EmailTopic> = {
  lease_terms_changed: "lease_changes",
  lease_terms_accepted: "lease_changes",
  lease_approved: "lease_changes",
  invitation_landlord_withdrawn: "lease_changes",
  company_access_request: "team",
  company_access_approved: "team",
  company_access_declined: "team",
  company_holder_new: "team",
  company_holder_previous: "team",
};

export const topicOf = (category: string): EmailTopic | null => TOPIC_OF[category] ?? null;

export function isTopic(value: unknown): value is EmailTopic {
  return typeof value === "string" && (EMAIL_TOPICS as readonly string[]).includes(value);
}

/** The effective switch for a topic from the stored preferences ({} for someone who never changed anything). */
export function topicOn(prefs: unknown, topic: EmailTopic): boolean {
  const value = prefs && typeof prefs === "object" ? (prefs as Record<string, unknown>)[topic] : undefined;
  return typeof value === "boolean" ? value : TOPIC_DEFAULTS[topic];
}
