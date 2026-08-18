import { useCallback, useEffect, useState } from "react";
import {
  getBrowserRoutePath,
  getCurrentBrowserPath,
  parseBrowserRoute,
  type BrowserRoute,
} from "./browserRoutes";

type BrowserLocation = {
  route: BrowserRoute;
  path: string;
};

function readBrowserLocation(): BrowserLocation {
  return {
    route: parseBrowserRoute(window.location.pathname, window.location.search),
    path: getCurrentBrowserPath(),
  };
}

export function useBrowserRoute() {
  const [location, setLocation] = useState<BrowserLocation>(readBrowserLocation);

  useEffect(() => {
    const onPopState = () => setLocation(readBrowserLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback(
    (nextRoute: BrowserRoute, options: { replace?: boolean } = {}) => {
      const nextPath = getBrowserRoutePath(nextRoute);
      if (getCurrentBrowserPath() !== nextPath) {
        window.history[options.replace ? "replaceState" : "pushState"](
          null,
          "",
          nextPath,
        );
      }
      setLocation({ route: nextRoute, path: nextPath });
    },
    [],
  );

  const navigatePath = useCallback(
    (nextPath: string, options: { replace?: boolean } = {}) => {
      const destination = new URL(nextPath, window.location.origin);
      if (destination.origin !== window.location.origin) return;
      const path = `${destination.pathname}${destination.search}${destination.hash}`;
      if (getCurrentBrowserPath() !== path) {
        window.history[options.replace ? "replaceState" : "pushState"](
          null,
          "",
          path,
        );
      }
      setLocation({
        route: parseBrowserRoute(destination.pathname, destination.search),
        path,
      });
    },
    [],
  );

  return { route: location.route, path: location.path, navigate, navigatePath };
}
