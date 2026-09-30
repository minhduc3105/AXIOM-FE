import { useRef, useState, type FormEvent } from "react";
import { ArrowLeftIcon, KeyRoundIcon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { getAuthError } from "@/features/auth/model/authErrors";
import type { AuthError } from "@/features/auth/model/types";
import { PasswordField } from "./PasswordField";

type PasswordChangeField =
  | "currentPassword"
  | "newPassword"
  | "confirmPassword";
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PasswordChangeField, string>>
  >({});
  const [requestError, setRequestError] = useState<AuthError | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (!user) return null;

  const formError = requestError?.field ? null : requestError;

  function errorFor(field: PasswordChangeField) {
    return (
      fieldErrors[field] ??
      (requestError?.field === field ? requestError.userMessage : null)
    );
  }

  function clearFieldError(field: PasswordChangeField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setRequestError((current) => (current?.field === field ? null : current));
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
        <Button
          type="button"
          variant="ghost"
          className="mb-3 -ml-2"
          onClick={onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Back to settings
        </Button>

        <Card
          className="overflow-hidden"
          aria-labelledby="change-password-title"
        >
          <CardHeader className="flex-row items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle
                id="change-password-title"
                className="text-xl sm:text-2xl"
              >
                Change password
              </CardTitle>
              <CardDescription className="mt-1 leading-6">
                Use at least 8 characters for your new password.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <CardContent className="flex flex-col gap-5">
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

              <FieldGroup className="gap-5">
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
                    setDraft((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }));
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
                    setDraft((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }));
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
                    setDraft((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }));
                    clearFieldError("confirmPassword");
                    setPasswordUpdated(false);
                  }}
                />
              </FieldGroup>
            </CardContent>

            <Separator />
            <CardFooter className="justify-end">
              <Button type="submit" disabled={submitting} className="min-w-40">
                {submitting ? (
                  <LoaderCircleIcon
                    className="animate-spin motion-reduce:animate-none"
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                ) : null}
                {submitting ? "Updating password…" : "Update password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}

function validatePasswordChange(draft: PasswordChangeDraft) {
  const errors: Partial<Record<PasswordChangeField, string>> = {};

  if (!draft.currentPassword)
    errors.currentPassword = "Enter your current password.";
  if (draft.newPassword.length < 8)
    errors.newPassword = "Use at least 8 characters.";
  if (!draft.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (draft.confirmPassword !== draft.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
