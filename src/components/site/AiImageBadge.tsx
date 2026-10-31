import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";

/** Small, on-brand label marking a photo as AI-generated. Place inside a `relative` image container. */
export async function AiImageBadge() {
  const t = await getTranslations("common");
  return (
    <span className="pointer-events-none absolute top-3.5 right-3.5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-ink/62 py-1.5 pr-2.5 pl-2 text-[11px] leading-none font-semibold tracking-[.2px] text-white backdrop-blur-md">
      <Icon name="sparkle" size={12} strokeWidth={2.2} className="text-lime" />
      {t("aiImage")}
    </span>
  );
}
