import { MonitorIcon, MoonIcon, SunIcon, UserRoundIcon } from "lucide-react";
import { useTheme, type ThemePreference } from "@/app/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { cn } from "@/shared/lib/utils";

const panelClass =
  "rounded-2xl border border-[#d8d0c2]/90 bg-[#fffdf8]/88 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunIcon;
}> = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <main className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10">
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <header className={cn(panelClass, "p-5 sm:p-6")}>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">
            Personal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
            Review your account context and interface preferences.
          </p>
        </header>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="account-settings-title">
          <header className="flex items-start gap-3 border-b border-[#e1dacc] p-5 dark:border-[#38372f]">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]">
              <UserRoundIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">
                Account
              </p>
              <h2 id="account-settings-title" className="mt-1 text-lg font-semibold">
                Personal profile
              </h2>
            </div>
          </header>
          <dl className="grid divide-y divide-[#e9e2d6] text-sm dark:divide-[#38372f]">
            <SettingRow label="Name" value={user.display_name || "Not provided"} />
            <SettingRow label="Email" value={user.email} />
            <SettingRow label="Organization" value={user.organization_id} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <dt className="text-[#777064] dark:text-[#aaa397]">Organization role</dt>
              <dd>
                <Badge variant="outline" className="rounded-full">
                  {user.org_role === "org_admin" ? "Organization admin" : "Organization member"}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="appearance-settings-title">
          <header className="border-b border-[#e1dacc] p-5 dark:border-[#38372f]">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">
              Interface
            </p>
            <h2 id="appearance-settings-title" className="mt-1 text-lg font-semibold">
              Appearance
            </h2>
            <p className="mt-1 text-sm text-[#625d53] dark:text-[#c5bcaf]">
              Current display: {resolvedTheme}.
            </p>
          </header>
          <div className="flex flex-wrap gap-2 p-5" role="group" aria-label="Theme preference">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={theme === value ? "default" : "outline"}
                className="min-w-28 justify-start rounded-lg"
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <dt className="text-[#777064] dark:text-[#aaa397]">{label}</dt>
      <dd className="max-w-full break-all font-medium text-right">{value}</dd>
    </div>
  );
}
