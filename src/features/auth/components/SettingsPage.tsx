import { ChevronRightIcon, KeyRoundIcon, MonitorIcon, MoonIcon, SunIcon, UserRoundIcon } from "lucide-react";
import { useTheme, type ThemePreference } from "@/app/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { cn } from "@/shared/lib/utils";

const panelClass = "rounded-2xl border border-border bg-card shadow-sm";

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof SunIcon;
}> = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

type SettingsPageProps = {
  onChangePassword: () => void;
};

export function SettingsPage({ onChangePassword }: SettingsPageProps) {
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <main className="min-h-[calc(100dvh-var(--app-top-bar-height))] px-5 pb-12 pt-4 sm:px-8 md:pt-6">
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <header className={cn(panelClass, "p-5 sm:p-6")}>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Personal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Manage your account and interface preferences.
          </p>
        </header>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="account-settings-title">
          <header className="flex items-start gap-3 border-b border-border p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <UserRoundIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Account
              </p>
              <h2 id="account-settings-title" className="mt-1 text-lg font-semibold">
                Personal profile
              </h2>
            </div>
          </header>
          <dl className="grid divide-y divide-border text-sm">
            <SettingRow label="Name" value={user.display_name || "Not provided"} />
            <SettingRow label="Email" value={user.email} />
            <SettingRow label="Organization" value={user.organization_id} />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <dt className="text-muted-foreground">Organization role</dt>
              <dd>
                <Badge variant="outline" className="rounded-full">
                  {user.org_role === "org_admin" ? "Organization admin" : "Organization member"}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="security-settings-title">
          <header className="border-b border-border p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Security
            </p>
            <h2 id="security-settings-title" className="mt-1 text-lg font-semibold">
              Account security
            </h2>
          </header>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <KeyRoundIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Password</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Update your account password.</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="shrink-0 justify-between sm:justify-center" onClick={onChangePassword}>
              Change password
              <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
        </section>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="appearance-settings-title">
          <header className="border-b border-border p-5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Interface
            </p>
            <h2 id="appearance-settings-title" className="mt-1 text-lg font-semibold">
              Appearance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
                <Icon aria-hidden="true" />
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-full break-all text-right font-medium">{value}</dd>
    </div>
  );
}
