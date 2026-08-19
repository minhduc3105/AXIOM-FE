import { useCallback, useLayoutEffect } from "react";
import { AuthRestoreScreen } from "@/features/auth/components/AuthRestoreScreen";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { RegisterPage } from "@/features/auth/components/RegisterPage";
import { useAuth } from "@/features/auth/model/AuthProvider";
import {
  getAuthRoutePath,
  getSafeReturnTo,
  type AuthRoute,
} from "./routing/browserRoutes";
import { createChatHomeRoute, createDataRoute } from "./routing/paths";
import type { AppRoute } from "./routing/types";
import { useBrowserRoute } from "./routing/useBrowserRoute";

type AppRouterProps = {
  renderApp: (route: AppRoute, navigate: (nextRoute: AppRoute) => void) => React.ReactNode;
};

export function AppRouter({ renderApp }: AppRouterProps) {
  const auth = useAuth();
  const { route, path, navigate, navigatePath } = useBrowserRoute();
  const navigateApp = useCallback(
    (nextRoute: AppRoute) => navigate({ kind: "app", route: nextRoute }),
    [navigate],
  );

  const protectedLoginRoute: AuthRoute | null =
    auth.status === "unauthenticated" && route.kind === "app"
      ? {
          kind: "auth",
          page: "login",
          returnTo: getSafeReturnTo(path),
          reason: auth.sessionEndReason,
        }
      : null;
  const authenticatedHomeRoute =
    auth.status === "authenticated" && route.kind === "auth"
      ? createChatHomeRoute()
      : null;
  const isLegacyIngestionPath =
    route.kind === "app" &&
    (path === "/ingest" || path.startsWith("/data/ingestion"));

  useLayoutEffect(() => {
    if (isLegacyIngestionPath) {
      navigate({ kind: "app", route: createDataRoute() }, { replace: true });
      return;
    }
    if (protectedLoginRoute) {
      navigate(protectedLoginRoute, { replace: true });
      return;
    }
    if (authenticatedHomeRoute) {
      navigate({ kind: "app", route: authenticatedHomeRoute }, { replace: true });
    }
  }, [
    authenticatedHomeRoute,
    isLegacyIngestionPath,
    navigate,
    protectedLoginRoute,
  ]);

  if (auth.status === "restoring") {
    return (
      <AuthRestoreScreen
        error={auth.restoreError}
        onRetry={() => void auth.retryRestore()}
        onSignInInstead={() => void auth.logout()}
      />
    );
  }

  if (auth.status === "unauthenticated") {
    const authRoute = protectedLoginRoute ?? route;
    if (authRoute.kind !== "auth") return null;
    const loginRoute: AuthRoute = {
      ...authRoute,
      page: "login",
    };
    const registerRoute: AuthRoute = {
      ...authRoute,
      page: "register",
    };

    if (authRoute.page === "register") {
      return (
        <RegisterPage
          loginHref={getAuthRoutePath(loginRoute)}
          onSignIn={() => navigate(loginRoute)}
          onSuccess={() => navigatePath(registerRoute.returnTo, { replace: true })}
        />
      );
    }

    return (
      <LoginPage
        sessionExpired={authRoute.reason === "session-expired"}
        registerHref={getAuthRoutePath(registerRoute)}
        onRegister={() => navigate(registerRoute)}
        onSuccess={() => navigatePath(loginRoute.returnTo, { replace: true })}
      />
    );
  }

  const appRoute = authenticatedHomeRoute ?? (route.kind === "app" ? route.route : null);
  if (!appRoute) return null;
  return <>{renderApp(appRoute, navigateApp)}</>;
}
