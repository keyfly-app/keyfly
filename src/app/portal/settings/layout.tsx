import { Shell } from "@/components/Shell";
import { SettingsFrame } from "@/features/settings/SettingsFrame";

/** Settings (personal pages and the Summary): the left column shows the settings menu and the way back. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell settings>
      <SettingsFrame>{children}</SettingsFrame>
    </Shell>
  );
}
