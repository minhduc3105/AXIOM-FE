import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { LoaderCircleIcon, MailIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { getAuthError } from "@/features/auth/model/authErrors";
import type { AuthError, AuthField } from "@/features/auth/model/types";
import { AuthFormField } from "./AuthFormField";
import { AuthShell } from "./AuthShell";
import { PasswordField } from "./PasswordField";

const defaultEmail = "admin@axiom.local";
const defaultPassword = "password";
const loginHeadingId = "axiom-login-heading";

type LoginPageProps = {
  sessionExpired?: boolean;
  registerHref?: string;
  onRegister?: () => void;
  onSuccess?: () => void;
};

export function LoginPage({
  sessionExpired = false,
  registerHref = "/register",
  onRegister,
  onSuccess,
}: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [showSessionExpired, setShowSessionExpired] = useState(sessionExpired);
  const alertRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  const emailError = error?.field === "email" ? error.userMessage : null;
  const passwordError = error?.field === "password" ? error.userMessage : null;
  const formError = error?.field ? null : error;
  const alertError =
    formError ??
    (showSessionExpired
      ? {
          kind: "session" as const,
          code: "SESSION_EXPIRED",
          status: null,
          field: null,
          userMessage: "Your session expired. Sign in again to continue.",
        }
      : null);

  useEffect(() => {
    setShowSessionExpired(sessionExpired);
  }, [sessionExpired]);

  useEffect(() => {
    if (alertError) alertRef.current?.focus();
  }, [alertError]);

  function clearErrorFor(field: AuthField) {
    setError((current) => {
      if (!current) return null;
      if (current.field === field || current.kind === "credentials")
        return null;
      return current;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setShowSessionExpired(false);
    try {
      await login(email.trim().toLowerCase(), password);
      onSuccess?.();
    } catch (cause) {
      setError(getAuthError(cause, "login"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleRegister(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (!onRegister) return;
    event.preventDefault();
    onRegister();
  }

  return (
    <AuthShell
      title="Sign in"
      titleId={loginHeadingId}
      subtitle="Access your organization's intelligence platform."
    >
      <form
        className="grid gap-4"
        onSubmit={handleSubmit}
        aria-busy={submitting}
        aria-labelledby={loginHeadingId}
      >
        {alertError ? (
          <Alert
            ref={alertRef}
            tabIndex={-1}
            variant="destructive"
            className="border-destructive/20 bg-destructive/5"
          >
            <AlertDescription>{alertError.userMessage}</AlertDescription>
          </Alert>
        ) : null}

        <AuthFormField
          id="axiom-login-email"
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          startAdornment={<MailIcon className="size-4" aria-hidden="true" />}
          className="h-11 rounded-lg bg-background pr-3.5 pl-9 text-sm hover:border-slate-400 focus-visible:ring-primary/10 md:text-sm"
          value={email}
          error={emailError}
          required
          onChange={(event) => {
            setEmail(event.target.value);
            clearErrorFor("email");
          }}
        />

        <PasswordField
          id="axiom-login-password"
          name="password"
          label="Password"
          autoComplete="current-password"
          className="h-11 rounded-lg bg-background px-3.5 text-sm hover:border-slate-400 focus-visible:ring-primary/10 md:text-sm"
          value={password}
          error={passwordError}
          required
          onChange={(event) => {
            setPassword(event.target.value);
            clearErrorFor("password");
          }}
        />

        <Button
          className="mt-2 h-11 rounded-lg font-semibold hover:bg-brand-strong"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <LoaderCircleIcon
              className="animate-spin motion-reduce:animate-none"
              data-icon="inline-start"
              aria-hidden="true"
            />
          ) : null}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>

        {submitting ? (
          <span className="sr-only" role="status">
            Signing in…
          </span>
        ) : null}

        <div
          className="mt-4 flex items-center gap-3 text-sm text-muted-foreground"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex justify-center">
          <a
            className="w-fit rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href={registerHref}
            onClick={handleRegister}
          >
            Create your organization
          </a>
        </div>
      </form>
    </AuthShell>
  );
}
