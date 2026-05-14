import { createRootRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  PluginProvider,
  getAuthRedirect,
  isOnboardingRoute,
  isPublicAuthRoute,
  type AuthSession,
} from "@hexo-cms/ui/app-shell";
import { desktopAuthClient, subscribeToDesktopAuthChanges } from "../lib/desktop-auth-client";
import { desktopDataProvider } from "../lib/desktop-data-provider-instance";
import { UpdateBanner } from "../components/UpdateBanner";
import { useUpdater } from "../hooks/useUpdater";

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = isOnboardingRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(true);
  const updater = useUpdater();

  useEffect(() => {
    let active = true;
    const refreshSession = () => {
      setIsPending(true);
      setHasConfig(null);
      desktopAuthClient.getSession()
        .then(async (nextSession) => {
          if (!active) return;
          setSession(nextSession);

          if (nextSession.state === "authenticated") {
            const config = await desktopDataProvider.getConfig();
            if (active) setHasConfig(Boolean(config));
          } else if (active) {
            setHasConfig(null);
          }
        })
        .catch(() => {
          if (active) {
            setSession({ state: "anonymous" });
            setHasConfig(null);
          }
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
  }, [pathname]);

  const guardPending = isPending || (session?.state === "authenticated" && hasConfig === null && !isSetupRoute);

  useEffect(() => {
    const redirect = getAuthRedirect({ pathname, session, hasConfig, isPending: guardPending });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, hasConfig, guardPending, pathname, navigate]);

  if (guardPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  if (isPublicRoute || isSetupRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          {updater && <UpdateBanner updater={updater} />}
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
