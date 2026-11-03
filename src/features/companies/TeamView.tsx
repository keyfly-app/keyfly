import { getTranslations } from "next-intl/server";
import { Tag } from "@/components/ui/Tag";
import type { Locale } from "@/i18n/config";
import { date } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { SettingsHeader } from "@/features/settings/SettingsHeader";
import { accountInitials } from "./accounts";
import { InvitationActions, InviteMember, MemberMenu, MemberRoleSelect, RequestActions } from "./TeamActions";

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
  companyName,
  manage,
  enterprise,
  me,
  locale,
  members,
  requests,
  invitations,
}: {
  accountId: string;
  companyName: string;
  manage: boolean;
  enterprise: boolean;
  me: string | undefined;
  locale: Locale;
  members: TeamMember[];
  requests: AccessRequest[];
  invitations: PendingInvitation[];
}) {
  const [t, roles] = await Promise.all([getTranslations("companies.team"), getTranslations("invite.roles")]);
  const GRID = enterprise ? "md:grid-cols-[minmax(0,1fr)_152px_136px_100px_36px]" : "md:grid-cols-[minmax(0,1fr)_184px_128px_36px]";
  const list = [...members].sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, "hu")));
  return (
    <>
      <SettingsHeader
        title={t("title")}
        lead={t("lead")}
        tab
        action={manage ? <InviteMember accountId={accountId} /> : undefined}
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
                    <RequestActions requestId={r.id} name={name} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="team-members" className="rounded-xl border border-line bg-surface">
        <div className="flex items-baseline justify-between gap-2 px-4 pt-4.5 pb-3 sm:px-5">
          <h2 id="team-members" className="text-[15px] font-semibold">
            {t("members")}
          </h2>
          <p className="text-[13px] text-muted">{t("count", { count: list.length })}</p>
        </div>
        <div aria-hidden="true" className={`hidden gap-4 border-t border-line bg-paper/60 px-5 py-2.5 text-xs font-semibold text-muted md:grid ${GRID}`}>
          <span>{t("colMember")}</span>
          <span>{t("colRole")}</span>
          {enterprise && <span>{t("colAccess")}</span>}
          <span>{t("colJoined")}</span>
          <span />
        </div>
        <ul>
          {list.map((m) => {
            const name = m.full_name ?? m.email;
            const self = m.user_id === me;
            const holder = m.role === "owner";
            const kind = self ? (holder ? (manage ? "transfer" : null) : "leave") : manage && !holder ? "remove" : null;
            return (
              <li key={m.user_id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 border-t border-line px-4 py-3.5 md:gap-4 md:px-5 ${GRID}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Initials name={name} />
                  <div className="flex min-w-0 flex-col">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{name}</span>
                      {self && <span className="inline-flex h-[18px] flex-none items-center rounded-[5px] bg-paper px-1.5 text-[11px] font-semibold text-ink-soft">{t("you")}</span>}
                    </p>
                    {m.full_name && (
                      <p className="truncate text-[13px] text-muted" title={m.email}>
                        {m.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end md:order-last">
                  {kind ? (
                    <MemberMenu
                      accountId={accountId}
                      userId={m.user_id}
                      name={name}
                      company={companyName}
                      kind={kind}
                      candidates={kind === "transfer" ? list.filter((x) => x.role !== "owner").map((x) => ({ userId: x.user_id, name: x.full_name ?? x.email, email: x.email, role: x.role as Exclude<typeof x.role, "owner"> })) : undefined}
                    />
                  ) : (
                    <span className="size-11 sm:size-9" />
                  )}
                </div>
                <div className="col-span-2 pl-12 md:col-span-1 md:pl-0">
                  {holder ? (
                    <Tag tone="info">{t("holder")}</Tag>
                  ) : manage && !self ? (
                    <MemberRoleSelect accountId={accountId} userId={m.user_id} name={name} role={m.role as Exclude<typeof m.role, "owner">} />
                  ) : (
                    <span className="text-sm font-medium text-ink-soft">{roles(m.role)}</span>
                  )}
                </div>
                {enterprise && (
                  <div className="col-span-2 pl-12 text-sm text-ink-soft md:col-span-1 md:pl-0">{m.property_scope === "selected" ? t("accessSelected") : t("accessAll")}</div>
                )}
                <span className="hidden text-sm whitespace-nowrap text-ink-soft tabular-nums md:block">{date(m.joined_at, locale)}</span>
              </li>
            );
          })}
        </ul>
        {!manage && <p className="border-t border-line px-4 py-3 text-[13px] text-muted sm:px-5">{t("readOnly")}</p>}
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
