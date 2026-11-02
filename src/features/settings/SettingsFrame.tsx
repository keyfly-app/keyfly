import { settingsMenu } from "./links";
import { SettingsNav } from "./SettingsNav";

/** Settings frame: the one menu on the left from desktop width, the page beside it. Phones start from the Summary. */
export async function SettingsFrame({ children }: { children: React.ReactNode }) {
  const menu = await settingsMenu();
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <aside className="hidden w-[232px] flex-none lg:block">
        <SettingsNav label={menu.label} groups={menu.groups} add={menu.add} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[760px]">{children}</div>
    </div>
  );
}
