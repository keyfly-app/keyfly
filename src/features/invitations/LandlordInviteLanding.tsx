import { getLocale, getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/AuthLayout";
import { Icon } from "@/components/Icon";
import { ButtonLink } from "@/components/ui/form";
import { SIGN_UP_OPEN } from "@/config/auth";
import { isLocale } from "@/i18n/config";
import { cityLine, withDot } from "@/lib/address";
import { until } from "@/lib/format";
import { loadCatalog } from "@/features/catalog/load";
import { labelOf } from "@/features/catalog/types";

export type InvitationTeaser = {
  inviter_name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  expires_at: string;
  masked_email: string;
  property_kind: string;
};

/**
 * Signed-out landing of a landlord invitation (canvas "App v2.3": Bérbeadó – meghívó): who invited, which home,
 * that the terms come after sign-in, how long the link works – then create an account or sign in.
 */
export async function LandlordInviteLanding({ teaser, loginHref, registerHref }: { teaser: InvitationTeaser; loginHref: string; registerHref: string }) {
  const t = await getTranslations("invite");
  const l = await getTranslations("invite.landlord");
  const { property_type: kinds } = await loadCatalog("property_type");
  const raw = await getLocale();
  const locale = isLocale(raw) ? raw : "hu";
  return (
    <AuthLayout wide>
      <div className="flex flex-col gap-4">
        <span className="inline-flex h-[22px] items-center self-start rounded-md bg-info-soft px-2 text-xs font-medium text-info-ink">{t("label")}</span>
        <h1 className="font-display text-[22px] leading-7 font-semibold">{l("title", { name: teaser.inviter_name })}</h1>
        <p className="text-sm text-muted">{l("lead")}</p>
        <div className="flex gap-3 rounded-[10px] border border-line px-4 py-3.5">
          <Icon name="building" size={18} className="mt-0.5 flex-none text-brand" />
          <span className="flex flex-col">
            <span className="text-[12.5px] text-muted">{l("property")}</span>
            <span className="text-sm font-semibold">{`${teaser.street} ${withDot(teaser.house_number)}`}</span>
            <span className="text-[13px] text-muted">{`${labelOf(kinds, teaser.property_kind)} · ${cityLine({ postalCode: teaser.postal_code, city: teaser.city })}`}</span>
          </span>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Icon name="lock" size={15} className="flex-none" />
          {l("termsLocked")}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <Icon name="clock" size={15} className="flex-none" />
          {l("valid", { until: until(teaser.expires_at, locale) })}
        </p>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold">{l("signInTitle")}</h2>
          <p className="text-[13px] text-muted">
            {l("signInText")} <b className="font-semibold text-ink">{teaser.masked_email}</b>
          </p>
        </div>
        {SIGN_UP_OPEN && <ButtonLink href={registerHref}>{l("createAccount")}</ButtonLink>}
        <ButtonLink href={loginHref} variant={SIGN_UP_OPEN ? "secondary" : "primary"}>
          {l("haveAccount")}
        </ButtonLink>
        <p className="text-[12.5px] text-muted">{l("notYou")}</p>
      </div>
    </AuthLayout>
  );
}
