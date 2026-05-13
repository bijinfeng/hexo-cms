import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState, useNavigate } from "@tanstack/react-router";
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
} from "@hexo-cms/ui";
import { webAuthClient } from "../lib/auth-client";
import { webDataProvider } from "../lib/web-data-provider-instance";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

function NotFound() {
  return <div className="flex items-center justify-center h-full text-sm">404 — 页面不存在</div>;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hexo CMS" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = isOnboardingRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSessionAndConfig() {
      setIsPending(true);
      setHasConfig(null);
      try {
        const nextSession = await webAuthClient.getSession();
        if (!active) return;
        setSession(nextSession);

        if (nextSession.state === "authenticated") {
          const config = await webDataProvider.getConfig();
          if (active) setHasConfig(Boolean(config));
        } else if (active) {
          setHasConfig(null);
        }
      } catch {
        if (active) {
          setSession({ state: "anonymous" });
          setHasConfig(null);
        }
      } finally {
        if (active) setIsPending(false);
      }
    }

    void loadSessionAndConfig();

    return () => {
      active = false;
    };
  }, [pathname]);

  const guardPending = isPending || (session?.state === "authenticated" && hasConfig === null && !isSetupRoute);

  useEffect(() => {
    const redirect = getAuthRedirect({
      pathname,
      session,
      hasConfig,
      isPending: guardPending,
    });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, hasConfig, guardPending, pathname, navigate]);

  if (guardPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  // Wrap all routes with providers to prevent "usePluginSystem must be used inside PluginProvider" errors
  // Public routes don't use CMSLayout, but still need providers for consistency
  return (
    <DataProviderProvider provider={webDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          {isPublicRoute || isSetupRoute ? (
            <Outlet />
          ) : (
            <CMSLayout>
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </CMSLayout>
          )}
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}
