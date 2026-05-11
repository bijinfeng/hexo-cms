import { createRootRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  PluginProvider,
  getAuthRedirect,
  isPublicAuthRoute,
  type AuthSession,
} from "@hexo-cms/ui";
import { desktopAuthClient, subscribeToDesktopAuthChanges } from "../lib/desktop-auth-client";
import { desktopDataProvider } from "../lib/desktop-data-provider-instance";

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let active = true;
    const refreshSession = () => {
      desktopAuthClient.getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch(() => {
        if (active) setSession({ state: "anonymous" });
      })
      .finally(() => {
        if (active) setIsPending(false);
      });
    };

    refreshSession();
    const unsubscribe = subscribeToDesktopAuthChanges(refreshSession);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const redirect = getAuthRedirect({ pathname, session, hasConfig: null, isPending });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, isPending, pathname, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  if (isPublicRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          <CMSLayout isElectron>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </CMSLayout>
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
