import { createRootRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CMSLayout, DataProviderProvider, ErrorBoundary, withCache } from "@hexo-cms/ui";
import { DesktopDataProvider } from "../lib/desktop-data-provider";

const BARE_ROUTES = ["/login", "/onboarding"];

const desktopDataProvider = withCache(new DesktopDataProvider());

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isBare = BARE_ROUTES.includes(pathname);
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    desktopDataProvider.getToken().then((t) => {
      setToken(t);
      setIsPending(false);
    });
  }, []);

  useEffect(() => {
    if (isPending) return;

    if (!token && !isBare) {
      navigate({ to: "/login", replace: true });
    }

    if (token && isBare) {
      navigate({ to: "/", replace: true });
    }
  }, [token, isPending, isBare, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token && !isBare) return null;

  if (isBare) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <ErrorBoundary>
        <CMSLayout isElectron>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </CMSLayout>
      </ErrorBoundary>
    </DataProviderProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
