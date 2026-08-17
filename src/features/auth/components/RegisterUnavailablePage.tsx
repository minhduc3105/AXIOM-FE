import type { MouseEvent } from "react";
import { AuthShell } from "./AuthShell";

type RegisterUnavailablePageProps = {
  loginHref: string;
  onSignIn: () => void;
};

export function RegisterUnavailablePage({
  loginHref,
  onSignIn,
}: RegisterUnavailablePageProps) {
  function handleSignIn(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onSignIn();
  }

  return (
    <AuthShell>
      <section className="grid gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Create your AXIOM account</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Organization registration is not available in this build.
          </p>
        </div>
        <a
          className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href={loginHref}
          onClick={handleSignIn}
        >
          Sign in instead
        </a>
      </section>
    </AuthShell>
  );
}
