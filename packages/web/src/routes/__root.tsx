import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router";
import { CMSLayout, DataProviderProvider } from "@hexo-cms/ui";
import { WebDataProvider } from "../lib/web-data-provider";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

const BARE_ROUTES = ["/login"];

const webDataProvider = new WebDataProvider();

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
    links: [{ rel: "stylesheet", href: appCss }],
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
  const isBare = BARE_ROUTES.includes(pathname);

  if (isBare) return <Outlet />;

  return (
    <DataProviderProvider provider={webDataProvider}>
      <CMSLayout>
        <Outlet />
      </CMSLayout>
    </DataProviderProvider>
  );
}
