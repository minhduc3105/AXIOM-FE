import { useRef, useState, type FormEvent } from "react";
import { ArrowLeftIcon, KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { getAuthError } from "@/features/auth/model/authErrors";
import type { AuthError } from "@/features/auth/model/types";
import { PasswordField } from "./PasswordField";

type PasswordChangeField = "currentPassword" | "newPassword" | "confirmPassword";
type PasswordChangeDraft = Record<PasswordChangeField, string>;

const initialDraft: PasswordChangeDraft = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type ChangePasswordPageProps = {
  onBack: () => void;
};

export function ChangePasswordPage({ onBack }: ChangePasswordPageProps) {
  const { user, changePassword } = useAuth();
  const [draft, setDraft] = useState(initialDraft);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PasswordChangeField, string>>>({});
  const [requestError, setRequestError] = useState<AuthError | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const errors = validatePasswordChange(draft);
    setFieldErrors(errors);
    setRequestError(null);
    setPasswordUpdated(false);
    if (Object.keys(errors).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await changePassword(draft.currentPassword, draft.newPassword);
      setDraft(initialDraft);
      setPasswordUpdated(true);
    } catch (cause) {
      setRequestError(getAuthError(cause, "password"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100dvh-var(--app-top-bar-height))] px-5 pb-12 pt-4 sm:px-8 md:pt-6">
      <div className="mx-auto w-full max-w-2xl">
        <Button type="button" variant="ghost" className="mb-3 -ml-2" onClick={onBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Back to settings
        </Button>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="change-password-title">
          <header className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 id="change-password-title" className="text-xl font-semibold tracking-tight sm:text-2xl">
                Change password
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use at least 8 characters for your new password.
              </p>
            </div>
          </header>

          <form className="grid gap-5 p-5 sm:p-6" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
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

            <PasswordField
              id="axiom-settings-current-password"
              name="currentPassword"
              label="Current password"
              autoComplete="current-password"
              value={draft.currentPassword}
              error={errorFor("currentPassword")}
              minLength={8}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, currentPassword: event.target.value }));
                clearFieldError("currentPassword");
                setPasswordUpdated(false);
              }}
            />
            <PasswordField
              id="axiom-settings-new-password"
              name="newPassword"
              label="New password"
              autoComplete="new-password"
              value={draft.newPassword}
              error={errorFor("newPassword")}
              minLength={8}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, newPassword: event.target.value }));
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
              value={draft.confirmPassword}
              error={errorFor("confirmPassword")}
              minLength={8}
              required
              onChange={(event) => {
                setDraft((current) => ({ ...current, confirmPassword: event.target.value }));
                clearFieldError("confirmPassword");
                setPasswordUpdated(false);
              }}
            />

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit" disabled={submitting} className="min-w-40">
                {submitting ? (
                  <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : null}
                {submitting ? "Updating password…" : "Update password"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function validatePasswordChange(draft: PasswordChangeDraft) {
  const errors: Partial<Record<PasswordChangeField, string>> = {};

  if (!draft.currentPassword) errors.currentPassword = "Enter your current password.";
  if (draft.newPassword.length < 8) errors.newPassword = "Use at least 8 characters.";
  if (!draft.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (draft.confirmPassword !== draft.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
