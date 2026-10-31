import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";

/** Small, on-brand note under a photo marking it as AI-generated – kept off the image so it never covers a face. */
export async function AiImageLabel({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  const t = await getTranslations("common");
  return (
    <p
      className={`flex items-center justify-end gap-1.5 text-xs leading-tight font-semibold ${onDark ? "text-fog-dim" : "text-muted"} ${className}`}
    >
      <Icon name="sparkle" size={12} strokeWidth={2.2} className={onDark ? "text-lime" : "text-brand"} />
      {t("aiImage")}
    </p>
  );
}
