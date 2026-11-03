/** Settings page column: the settings menu lives in the app's left column (settings mode of the Shell). */
export function SettingsFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex max-w-[760px] min-w-0 flex-col gap-5">{children}</div>;
}
