import { getTranslations } from "next-intl/server";
import { Tag } from "@/components/ui/Tag";
import type { Locale } from "@/i18n/config";
import { date } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { accountInitials } from "./accounts";
import { InvitationActions, InviteMember, RemoveMember, RequestActions } from "./TeamActions";

type Fn = Database["public"]["Functions"];
export type TeamMember = Fn["account_members_list"]["Returns"][number];
export type AccessRequest = Fn["account_access_requests_list"]["Returns"][number];
export type PendingInvitation = { id: string; email: string; account_role: Database["public"]["Enums"]["account_role"] | null; expires_at: string };

function Initials({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-full bg-paper text-xs font-semibold text-ink-soft">
      {accountInitials(name) || "?"}
    </span>
  );
}

/** Csapat (canvas "Csapat"): access requests first (they wait on you), then members, then pending invitations. */
export async function TeamView({
  accountId,
  manage,
  enterprise,
  me,
  locale,
  backHref,
  members,
  requests,
  invitations,
}: {
  accountId: string;
  manage: boolean;
  enterprise: boolean;
  me: string | undefined;
  locale: Locale;
  backHref: string;
  members: TeamMember[];
  requests: AccessRequest[];
  invitations: PendingInvitation[];
}) {
  const [t, roles] = await Promise.all([getTranslations("companies.team"), getTranslations("invite.roles")]);
  const list = [...members].sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, "hu")));
  return (
    <>
      <SettingsHeader
        title={t("title")}
        lead={t("lead")}
        backHref={backHref}
        action={manage ? <InviteMember accountId={accountId} enterprise={enterprise} /> : undefined}
      />

      {requests.length > 0 && (
        <section aria-labelledby="team-requests" className="rounded-xl border border-line bg-surface">
          <h2 id="team-requests" className="flex items-center gap-2 px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
            {t("requestsTitle")}
            <Tag tone="warning">{requests.length}</Tag>
          </h2>
          <ul>
            {requests.map((r) => {
              const name = r.full_name ?? r.email;
              return (
                <li key={r.id} className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Initials name={name} />
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      {r.full_name && <p className="truncate text-[13px] text-muted">{r.email}</p>}
                      <p className="text-[13px] text-muted">{t("requested", { date: date(r.created_at, locale) })}</p>
                      {r.message && <p className="mt-1.5 rounded-lg bg-paper px-3 py-2 text-[13px] leading-[19px] break-words">{r.message}</p>}
                    </div>
                  </div>
                  <div className="pl-12 sm:pl-0">
                    <RequestActions requestId={r.id} name={name} enterprise={enterprise} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="team-members" className="rounded-xl border border-line bg-surface">
        <div className="flex items-baseline justify-between gap-2 px-5 pt-5 pb-3 sm:px-6">
          <h2 id="team-members" className="text-[15px] font-semibold">
            {t("members")}
          </h2>
          <p className="text-[13px] text-muted">{t("count", { count: list.length })}</p>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_150px_110px_36px] gap-4 border-t border-line bg-paper/60 px-6 py-2 text-xs font-medium text-muted md:grid" aria-hidden="true">
          <span>{t("colMember")}</span>
          <span>{t("colRole")}</span>
          <span>{t("colAccess")}</span>
          <span>{t("colJoined")}</span>
          <span />
        </div>
        <ul>
          {list.map((m) => {
            const name = m.full_name ?? m.email;
            const self = m.user_id === me;
            return (
              <li
                key={m.user_id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_120px_150px_110px_36px] md:gap-4 md:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Initials name={name} />
                  <div className="flex min-w-0 flex-col">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{name}</span>
                      {self && <span className="flex-none font-normal text-muted">({t("you")})</span>}
                    </p>
                    {m.full_name && <p className="truncate text-[13px] text-muted" title={m.email}>{m.email}</p>}
                    <p className="text-[13px] text-muted md:hidden">
                      {m.property_scope === "selected" ? t("accessSelected") : t("accessAll")} · <span className="whitespace-nowrap">{date(m.joined_at, locale)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 md:contents">
                  <span className="md:order-none">
                    <Tag tone={m.role === "owner" ? "info" : "neutral"}>{roles(m.role)}</Tag>
                  </span>
                  <span className="hidden text-sm md:block">{m.property_scope === "selected" ? t("accessSelected") : t("accessAll")}</span>
                  <span className="hidden text-sm whitespace-nowrap tabular-nums md:block">{date(m.joined_at, locale)}</span>
                  <span className="flex justify-end">
                    {manage && !self && m.role !== "owner" ? <RemoveMember accountId={accountId} userId={m.user_id} name={name} /> : <span className="hidden size-9 md:block" />}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        {!manage && <p className="border-t border-line px-5 py-3 text-[13px] text-muted sm:px-6">{t("readOnly")}</p>}
      </section>

      {invitations.length > 0 && (
        <section aria-labelledby="team-pending" className="rounded-xl border border-line bg-surface">
          <h2 id="team-pending" className="px-5 pt-5 pb-3 text-[15px] font-semibold sm:px-6">
            {t("pendingTitle")}
          </h2>
          <ul>
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 border-t border-line px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-[13px] text-muted">
                    {i.account_role ? `${roles(i.account_role)} · ` : ""}
                    {t("expires", { date: date(i.expires_at, locale) })}
                  </p>
                </div>
                <InvitationActions invitationId={i.id} email={i.email} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
