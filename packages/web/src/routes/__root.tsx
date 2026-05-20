import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { PluginConfigValue, PluginHost } from "@hexo-cms/core";
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  I18nProvider,
  PluginProvider,
  getAuthRedirect,
  isOnboardingRoute,
  isPublicAuthRoute,
  type AuthSession,
} from "@hexo-cms/ui/app-shell";
import { zh, en } from "@hexo-cms/ui";
import { webAuthClient } from "../lib/auth-client";
import { webDataProvider } from "../lib/web-data-provider-instance";
import { createWebPluginHost } from "../lib/plugin-host";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

function NotFound() {
  const stored = typeof window !== "undefined" ? localStorage.getItem("hexo-cms-locale") : null;
  const text = stored === "en" ? "404 - Page Not Found" : "404 — 页面不存在";
  return <div className="flex items-center justify-center h-full text-sm">{text}</div>;
}

function detectWebLocale(): "zh" | "en" {
  if (typeof document !== "undefined") {
    const fromCookie = document.cookie.split("; ").find(r => r.startsWith("hexo-cms-locale="))?.split("=")[1];
    if (fromCookie === "zh" || fromCookie === "en") return fromCookie;
  }
  const stored = typeof window !== "undefined" ? localStorage.getItem("hexo-cms-locale") : null;
  if (stored === "zh" || stored === "en") return stored;
  const browserLang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "zh";
  if (browserLang === "zh" || browserLang === "en") return browserLang;
  return "zh";
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
  const stored = typeof window !== "undefined" ? localStorage.getItem("hexo-cms-locale") : null;
  const lang = stored === "en" ? "en" : "zh-CN";
  return (
    <html lang={lang} suppressHydrationWarning>
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
  const [pluginHost, setPluginHost] = useState<PluginHost<ComponentType<{ config?: PluginConfigValue }>> | null>(null);
  const loadingRef = useRef(false);
  const [locale] = useState<"zh" | "en">(() => detectWebLocale());
  const [pluginTranslationVersion, setPluginTranslationVersion] = useState(0);

  useEffect(() => {
    let active = true;
    loadingRef.current = true;

    async function loadSessionAndConfig() {
      setIsPending(true);
      setHasConfig(null);
      setPluginHost(null);
      try {
        const nextSession = await webAuthClient.getSession();
        if (!active) return;
        setSession(nextSession);

        if (nextSession.state === "authenticated") {
          const [config, host] = await Promise.all([
            webDataProvider.getConfig(),
            createWebPluginHost(),
          ]);
          if (active) {
            setHasConfig(Boolean(config));
            setPluginHost(host);
          }
        } else if (active) {
          setHasConfig(null);
          setPluginHost(null);
        }
      } catch {
        if (active) {
          setSession({ state: "anonymous" });
          setHasConfig(null);
          setPluginHost(null);
        }
      } finally {
        if (active) {
          loadingRef.current = false;
          setIsPending(false);
        }
      }
    }

    void loadSessionAndConfig();

    return () => {
      active = false;
    };
  }, [pathname]);

  const guardPending =
    isPending ||
    (session?.state === "authenticated" && hasConfig === null && !isSetupRoute) ||
    (session?.state === "authenticated" && !isPublicRoute && !isSetupRoute && !pluginHost);

  const i18nConfig = useMemo(() => {
    const pluginTranslations = pluginHost?.collectPluginTranslations() ?? {};
    return {
      locales: ["zh", "en"],
      defaultLocale: "zh",
      resources: {
        zh: { ...zh, ...(pluginTranslations.zh ?? {}) },
        en: { ...en, ...(pluginTranslations.en ?? {}) },
      },
    };
  }, [pluginHost, pluginTranslationVersion]);

  useEffect(() => {
    if (loadingRef.current) return;
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

  if (isPublicRoute || isSetupRoute) {
    return (
      <DataProviderProvider provider={webDataProvider}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </DataProviderProvider>
    );
  }

  if (!pluginHost) return null;

  return (
    <I18nProvider
      config={i18nConfig}
      initialLocale={locale}
      onLocaleChange={(newLocale) => {
        localStorage.setItem("hexo-cms-locale", newLocale);
        if (typeof document !== "undefined") {
          document.cookie = `hexo-cms-locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
        }
        pluginHost?.setCurrentLocale(newLocale);
      }}
    >
      <DataProviderProvider provider={webDataProvider}>
        <PluginProvider
          host={pluginHost}
          onStateChange={() => setPluginTranslationVersion(v => v + 1)}
        >
          <ErrorBoundary>
            <CMSLayout
              authClient={webAuthClient}
              onSignedOut={() => navigate({ to: "/login", replace: true })}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </CMSLayout>
          </ErrorBoundary>
        </PluginProvider>
      </DataProviderProvider>
    </I18nProvider>
  );
}
