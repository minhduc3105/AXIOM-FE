import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AuthError } from "@/features/auth/model/types";
import { AuthShell } from "./AuthShell";

type AuthRestoreScreenProps = {
  error?: AuthError | null;
  onRetry?: () => void;
  onSignInInstead?: () => void;
};

export function AuthRestoreScreen({
  error = null,
  onRetry,
  onSignInInstead,
}: AuthRestoreScreenProps) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  return (
    <AuthShell>
      <section className="grid gap-5" aria-busy={!error}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Restoring access</h1>
          {error ? null : (
            <p className="mt-1 text-sm leading-6 text-muted-foreground" role="status">
              Restoring your AXIOM session…
            </p>
          )}
        </div>
        {error ? (
          <>
            <Alert ref={alertRef} tabIndex={-1} variant="destructive">
              <AlertDescription>{error.userMessage}</AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onRetry}>Retry</Button>
              <Button type="button" variant="outline" onClick={onSignInInstead}>
                Sign in instead
              </Button>
            </div>
          </>
        ) : (
          <Progress aria-label="Restoring your AXIOM session" value={null} />
        )}
      </section>
    </AuthShell>
  );
}
