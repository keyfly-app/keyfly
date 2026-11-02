import { Shell } from "@/components/Shell";
import { SettingsFrame } from "@/features/settings/SettingsFrame";

/** Settings (personal pages and the Summary): the one settings menu beside the page. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell site="portal">
      <SettingsFrame>{children}</SettingsFrame>
    </Shell>
  );
}
