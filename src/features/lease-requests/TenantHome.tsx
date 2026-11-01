import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { Tag } from "@/components/ui/Tag";
import type { Enums } from "@/lib/supabase/database.types";
import { GuaranteeCard, MiniSteps, STATUS_TONE } from "./ui";

/** One lease request on the home screen, already formatted for the viewer's language. */
export type HomeCard = {
  id: string;
  status: Enums<"lease_request_status"> | "expired";
  street: string;
  city: string;
  rent: string;
  period: string;
  sent: string;
  expires: string;
  closed: string;
  canResend: boolean;
  href: string;
};

/**
 * Tenant home (canvas "App v2.3"): invitations in progress with their mini progress, recorded leases, to-dos and the
 * guarantee teaser. Without any request: a three-step start card.
 */
export async function TenantHome({
  cards,
  newRequestHref,
}: {
  cards: HomeCard[];
  newRequestHref: string;
}) {
  const lr = await getTranslations("leaseRequest");
  const t = await getTranslations("portal");
  const empty = cards.length === 0;
  const inProgress = cards.filter(
    (c) =>
      c.status === "pending_landlord" ||
      c.status === "expired" ||
      c.status === "pending_tenant",
  );
  const leases = cards.filter(
    (c) => c.status === "confirmed" || c.status === "declined",
  );
  const todos = cards.flatMap((c) =>
    c.status === "pending_tenant"
      ? [
          {
            id: c.id,
            title: lr("home.todoDecide"),
            street: c.street,
            href: c.href,
          },
        ]
      : c.status === "expired" && c.canResend
        ? [
            {
              id: c.id,
              title: lr("home.todoResend"),
              street: c.street,
              href: c.href,
            },
          ]
        : [],
  );

  const todoCard = (
    <section
      aria-labelledby="todo-title"
      className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-5"
    >
      <h2 id="todo-title" className="text-[15px] leading-5 font-semibold">
        {lr("home.todoTitle")}
      </h2>
      {todos.length ? (
        <ul className="-mx-2 flex flex-col">
          {todos.map((todo) => (
            <li key={todo.id}>
              <Link
                href={todo.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-paper"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 flex-none items-center justify-center rounded-lg bg-warning-soft text-warning-ink"
                >
                  <Icon name="alert" size={16} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">{todo.title}</span>
                  <span className="truncate text-[12.5px] text-muted">
                    {todo.street}
                  </span>
                </span>
                <Icon
                  name="chevronRight"
                  size={16}
                  className="flex-none text-muted"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-1 py-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon
              name="check"
              size={16}
              strokeWidth={2}
              className="text-brand"
            />
            {lr("home.todoEmpty")}
          </p>
          <p className="text-[13px] text-muted">{lr("home.todoEmptyText")}</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        {empty ? (
          <section
            aria-labelledby="empty-title"
            className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 sm:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <h2
                id="empty-title"
                className="font-display text-[20px] leading-[26px] font-semibold sm:text-[22px] sm:leading-7"
              >
                {lr("home.emptyTitle")}
              </h2>
              <p className="text-sm text-muted">{lr("home.emptyText")}</p>
            </div>
            <ol className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
                  <span
                    aria-hidden="true"
                    className="flex size-7 flex-none items-center justify-center rounded-full bg-mist text-[13px] font-bold text-brand"
                  >
                    {n}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {lr(`home.empty${n}`)}
                    </span>
                    <span className="text-[13px] text-muted">
                      {lr(`home.empty${n}Text`)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <ButtonLink href={newRequestHref} fit>
              <Icon name="plus" size={16} strokeWidth={2} />
              {lr("inviteLandlord")}
            </ButtonLink>
          </section>
        ) : (
          <>
            {inProgress.length > 0 && (
              <section
                aria-labelledby="progress-title"
                className="flex flex-col gap-2.5"
              >
                <h2
                  id="progress-title"
                  className="text-[15px] leading-5 font-semibold"
                >
                  {lr("home.progressTitle")}
                </h2>
                <ul className="flex flex-col gap-3">
                  {inProgress.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={c.href}
                        className="flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-4.5 transition-colors hover:border-field motion-reduce:transition-none"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-semibold [overflow-wrap:anywhere]">
                              {c.street}
                            </span>
                            <span className="text-[13px] text-muted">
                              {c.city}
                            </span>
                          </span>
                          <Tag tone={STATUS_TONE[c.status]}>
                            {lr(`status.${c.status}`)}
                          </Tag>
                        </span>
                        <MiniSteps
                          label={lr("flow.progress")}
                          items={
                            c.status === "pending_tenant"
                              ? [
                                  ["done", lr("home.miniSent")],
                                  ["now", lr("home.miniYou")],
                                  ["todo", lr("home.miniRecorded")],
                                ]
                              : [
                                  ["done", lr("home.miniSent")],
                                  ["now", lr("home.miniLandlord")],
                                  ["todo", lr("home.miniRecorded")],
                                ]
                          }
                        />
                        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-paper pt-3 text-[12.5px] text-muted">
                          <span className="tabular-nums">
                            {c.status === "pending_tenant"
                              ? lr("home.decisionMeta")
                              : c.status === "expired"
                                ? lr("home.expiredMeta", { date: c.expires })
                                : lr("home.pendingMeta", {
                                    sent: c.sent,
                                    expires: c.expires,
                                  })}
                          </span>
                          <span className="inline-flex items-center gap-0.5 font-semibold text-brand">
                            {lr("home.details")}
                            <Icon
                              name="chevronRight"
                              size={14}
                              strokeWidth={2}
                            />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section
              aria-labelledby="leases-title"
              className="flex flex-col gap-2.5"
            >
              <h2
                id="leases-title"
                className="text-[15px] leading-5 font-semibold"
              >
                {lr("homeTitle")}
              </h2>
              {leases.length ? (
                <ul className="flex flex-col gap-3">
                  {leases.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={c.href}
                        className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4.5 transition-colors hover:border-field motion-reduce:transition-none"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-semibold [overflow-wrap:anywhere]">
                              {c.street}
                            </span>
                            <span className="text-[13px] text-muted">
                              {c.city}
                            </span>
                          </span>
                          <Tag tone={STATUS_TONE[c.status]}>
                            {lr(`status.${c.status}`)}
                          </Tag>
                        </span>
                        <span className="flex items-center gap-3 border-t border-paper pt-3 text-[13px]">
                          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                            {c.status === "confirmed" ? (
                              <>
                                <span className="font-semibold tabular-nums">
                                  {c.rent} / {t("perMonth")}
                                </span>
                                <span className="text-muted tabular-nums">{c.period}</span>
                              </>
                            ) : (
                              <span className="text-muted tabular-nums">{lr("home.closedMeta", { date: c.closed })}</span>
                            )}
                          </span>
                          <Icon name="chevronRight" size={16} className="flex-none text-muted" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
                  {lr("home.noLeases")}
                </p>
              )}
            </section>
          </>
        )}
      </div>
      <div className="flex flex-col gap-4 lg:pt-[30px]">
        {todoCard}
        <GuaranteeCard
          title={lr("guarantee.title")}
          text={lr("guarantee.text")}
        />
      </div>
    </div>
  );
}
