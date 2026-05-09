import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CMSLayout, DataProviderProvider, ErrorBoundary, getAuthRedirect, isPublicAuthRoute, withCache } from "@hexo-cms/ui";
import { WebDataProvider } from "../lib/web-data-provider";
import { useSession } from "../lib/auth-client";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

const webDataProvider = withCache(new WebDataProvider());

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
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    const redirect = getAuthRedirect({
      pathname,
      session: session ? { state: "authenticated" } : { state: "anonymous" },
      isPending,
    });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, isPending, pathname, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session && !isPublicRoute) return null;

  if (isPublicRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={webDataProvider}>
      <ErrorBoundary>
        <CMSLayout>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </CMSLayout>
      </ErrorBoundary>
    </DataProviderProvider>
  );
}
