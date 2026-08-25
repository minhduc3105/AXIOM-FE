import { KeyRoundIcon, LoaderCircleIcon, MonitorIcon, MoonIcon, SunIcon, UserRoundIcon } from "lucide-react";
import { useTheme, type ThemePreference } from "@/app/ThemeProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { getAuthError } from "@/features/auth/model/authErrors";
import type { AuthError } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";
import { useRef, useState, type FormEvent } from "react";
import { PasswordField } from "./PasswordField";

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

type PasswordChangeField = "currentPassword" | "newPassword" | "confirmPassword";

type PasswordChangeDraft = Record<PasswordChangeField, string>;

const initialPasswordChangeDraft: PasswordChangeDraft = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function SettingsPage() {
  const { user, changePassword } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [passwordDraft, setPasswordDraft] = useState(initialPasswordChangeDraft);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PasswordChangeField, string>>>({});
  const [requestError, setRequestError] = useState<AuthError | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const submittingPasswordRef = useRef(false);

  if (!user) return null;

  const formError = requestError?.field ? null : requestError;

  function errorFor(field: PasswordChangeField) {
    return fieldErrors[field]
      ?? (requestError?.field === field ? requestError.userMessage : null);
  }

  function clearFieldError(field: PasswordChangeField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setRequestError((current) => current?.field === field ? null : current);
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingPasswordRef.current) return;

    const errors = validatePasswordChange(passwordDraft);
    setFieldErrors(errors);
    setRequestError(null);
    setPasswordUpdated(false);
    if (Object.keys(errors).length > 0) return;

    submittingPasswordRef.current = true;
    setSubmittingPassword(true);
    try {
      await changePassword(passwordDraft.currentPassword, passwordDraft.newPassword);
      setPasswordDraft(initialPasswordChangeDraft);
      setPasswordUpdated(true);
    } catch (cause) {
      setRequestError(getAuthError(cause, "password"));
    } finally {
      submittingPasswordRef.current = false;
      setSubmittingPassword(false);
    }
  }

  return (
    <main className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
      <div className="mx-auto grid w-full max-w-4xl gap-5">
        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="account-settings-title">
          <header className="flex items-start gap-3 border-b border-border p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <UserRoundIcon className="size-5" />
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

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="password-settings-title">
          <header className="flex items-start gap-3 border-b border-border p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <KeyRoundIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Security
              </p>
              <h2 id="password-settings-title" className="mt-1 text-lg font-semibold">
                Change password
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You will remain signed in here; other sessions will need to sign in again when they refresh.
              </p>
            </div>
          </header>
          <form className="grid gap-4 p-5" onSubmit={handlePasswordChange} noValidate aria-busy={submittingPassword}>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError.userMessage}</AlertDescription>
              </Alert>
            ) : null}
            {passwordUpdated ? (
              <Alert>
                <AlertDescription>Password updated.</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              <PasswordField
                id="axiom-settings-current-password"
                name="currentPassword"
                label="Current password"
                autoComplete="current-password"
                value={passwordDraft.currentPassword}
                error={errorFor("currentPassword")}
                minLength={8}
                required
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, currentPassword: event.target.value }));
                  clearFieldError("currentPassword");
                  setPasswordUpdated(false);
                }}
              />
              <PasswordField
                id="axiom-settings-new-password"
                name="newPassword"
                label="New password"
                autoComplete="new-password"
                value={passwordDraft.newPassword}
                error={errorFor("newPassword")}
                minLength={8}
                required
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }));
                  clearFieldError("newPassword");
                  clearFieldError("confirmPassword");
                  setPasswordUpdated(false);
                }}
              />
              <PasswordField
                id="axiom-settings-confirm-password"
                name="confirmPassword"
                label="Confirm new password"
                autoComplete="new-password"
                value={passwordDraft.confirmPassword}
                error={errorFor("confirmPassword")}
                minLength={8}
                required
                onChange={(event) => {
                  setPasswordDraft((current) => ({ ...current, confirmPassword: event.target.value }));
                  clearFieldError("confirmPassword");
                  setPasswordUpdated(false);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submittingPassword} className="min-w-40">
                {submittingPassword ? <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" /> : <KeyRoundIcon />}
                {submittingPassword ? "Updating password…" : "Update password"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">Use at least 8 characters.</p>
            </div>
          </form>
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

function validatePasswordChange(draft: PasswordChangeDraft) {
  const errors: Partial<Record<PasswordChangeField, string>> = {};

  if (!draft.currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }
  if (draft.newPassword.length < 8) {
    errors.newPassword = "Use at least 8 characters.";
  }
  if (!draft.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (draft.confirmPassword !== draft.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-full break-all font-medium text-right">{value}</dd>
    </div>
  );
}
