import { useCallback, useEffect, useState } from "react";
import { getAppRoutePath, parseAppRoute } from "./paths";
import type { AppRoute } from "./types";

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname),
  );

  useEffect(() => {
    const normalizedPath = getAppRoutePath(route);
    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState(null, "", normalizedPath);
    }

    const onPopState = () => setRoute(parseAppRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [route]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    const nextPath = getAppRoutePath(nextRoute);
    setRoute(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }, []);

  return { route, navigate };
}
