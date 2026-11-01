import { getTranslations } from "next-intl/server";
import { Icon, type IconName } from "@/components/Icon";
import { Button } from "@/components/ui/form";
import { InfoTip } from "@/components/ui/InfoTip";
import type { Enums } from "@/lib/supabase/database.types";
import { setStartView } from "./actions";

const OPTIONS: { view: Enums<"start_view">; icon: IconName }[] = [
  { view: "tenant", icon: "key" },
  { view: "landlord", icon: "home" },
  { view: "manager", icon: "building" },
];

/** First use: "How will you use Keyfly?" – sets the start screen only. */
export async function StartViewForm({ current }: { current: Enums<"start_view"> | null }) {
  const t = await getTranslations("auth.welcome");
  return (
    <form action={setStartView} className="flex flex-1 flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-4 flex items-center gap-2">
          <span className="font-display text-[22px] leading-tight font-semibold">{t("title")}</span>
          <InfoTip text={t("tip")} />
        </legend>
        {OPTIONS.map(({ view, icon }) => (
          <label
            key={view}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-field bg-surface px-3.5 py-3 has-checked:border-[1.5px] has-checked:border-brand has-checked:bg-paper has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
          >
            <span aria-hidden="true" className="inline-flex size-9 flex-none items-center justify-center rounded-[10px] bg-mist text-brand">
              <Icon name={icon} size={18} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-sm font-semibold">{t(`${view}.title`)}</span>
              <span className="text-[13px] text-muted">{t(`${view}.text`)}</span>
            </span>
            <input type="radio" name="view" value={view} defaultChecked={(current ?? "tenant") === view} className="size-4.5 flex-none accent-brand" />
          </label>
        ))}
      </fieldset>
      <div className="mt-auto pt-4">
        <Button>{t("submit")}</Button>
      </div>
    </form>
  );
}
