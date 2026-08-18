import { getAppRoutePath, parseAppRoute } from "./paths";
import type { AppRoute } from "./types";

export type AuthRoute = {
  kind: "auth";
  page: "login" | "register";
  returnTo: string;
  reason: "session-expired" | null;
};

export type BrowserRoute =
  | AuthRoute
  | { kind: "app"; route: AppRoute };

export function getSafeReturnTo(value: string | null | undefined): string {
  if (!value) return "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001F\u007F\\]/.test(value)
  ) {
    return "/";
  }

  try {
    const destination = new URL(value, window.location.origin);
    if (destination.origin !== window.location.origin) return "/";
    const pathname = destination.pathname.replace(/\/+$/, "") || "/";
    if (pathname === "/login" || pathname === "/register") return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export function parseBrowserRoute(
  pathname: string,
  search = "",
): BrowserRoute {
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const page =
    normalizedPathname === "/login"
      ? "login"
      : normalizedPathname === "/register"
        ? "register"
        : null;

  if (!page) return { kind: "app", route: parseAppRoute(pathname, search) };

  const params = new URLSearchParams(search);
  return {
    kind: "auth",
    page,
    returnTo: getSafeReturnTo(params.get("returnTo")),
    reason: params.get("reason") === "session-expired" ? "session-expired" : null,
  };
}

export function getAuthRoutePath(route: AuthRoute): string {
  const params = new URLSearchParams();
  const returnTo = getSafeReturnTo(route.returnTo);
  if (returnTo !== "/") params.set("returnTo", returnTo);
  if (route.reason === "session-expired") {
    params.set("reason", "session-expired");
  }
  const search = params.toString();
  return `/${route.page}${search ? `?${search}` : ""}`;
}

export function getBrowserRoutePath(route: BrowserRoute): string {
  return route.kind === "auth" ? getAuthRoutePath(route) : getAppRoutePath(route.route);
}

export function getCurrentBrowserPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
