import type { PluginConfigValue, PluginHost } from "@hexo-cms/core";
import { en, getElectronAPI, zh } from "@hexo-cms/ui";
import {
  type AuthSession,
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  getAuthRedirect,
  I18nProvider,
  isOnboardingRoute,
  isPublicAuthRoute,
  PluginProvider,
} from "@hexo-cms/ui/app-shell";
import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { UpdateBanner } from "../components/UpdateBanner";
import { useUpdater } from "../hooks/useUpdater";
import { desktopAuthClient, subscribeToDesktopAuthChanges } from "../lib/desktop-auth-client";
import { desktopDataProvider } from "../lib/desktop-data-provider-instance";
import { createDesktopPluginHost } from "../lib/plugin-host";

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = isOnboardingRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [pluginHost, setPluginHost] = useState<PluginHost<
    ComponentType<{ config?: PluginConfigValue }>
  > | null>(null);
  const loadingRef = useRef(false);
  const updater = useUpdater();
  const [locale, setLocale] = useState<"zh" | "en" | null>(null);
  const [pluginTranslationVersion, setPluginTranslationVersion] = useState(0);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api) {
      setLocale("zh");
      return;
    }
    api.getLocale().then((stored) => {
      if (stored === "zh" || stored === "en") {
        setLocale(stored);
        return;
      }
      api.getSystemLocale().then((sys) => {
        const lang = sys?.split("-")[0];
        if (lang === "zh" || lang === "en") {
          setLocale(lang as "zh" | "en");
        } else {
          setLocale("zh");
        }
      });
    });
  }, []);

  useEffect(() => {
    let active = true;
    loadingRef.current = true;
    const refreshSession = () => {
      setIsPending(true);
      setHasConfig(null);
      setPluginHost(null);
      desktopAuthClient
        .getSession()
        .then(async (nextSession) => {
          if (!active) return;
          setSession(nextSession);

          if (nextSession.state === "authenticated") {
            const [config, host] = await Promise.all([
              desktopDataProvider.getConfig(),
              createDesktopPluginHost(),
            ]);
            if (active) {
              setHasConfig(Boolean(config));
              setPluginHost(host);
            }
          } else if (active) {
            setHasConfig(null);
            setPluginHost(null);
          }
        })
        .catch(() => {
          if (active) {
            setSession({ state: "anonymous" });
            setHasConfig(null);
            setPluginHost(null);
          }
        })
        .finally(() => {
          if (active) {
            loadingRef.current = false;
            setIsPending(false);
          }
        });
    };

    refreshSession();
    const unsubscribe = subscribeToDesktopAuthChanges(refreshSession);

    return () => {
      active = false;
      unsubscribe();
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
    const redirect = getAuthRedirect({ pathname, session, hasConfig, isPending: guardPending });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, hasConfig, guardPending, pathname, navigate]);

  if (guardPending || locale === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  if (isPublicRoute || isSetupRoute)
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );

  if (!pluginHost) return null;

  return (
    <I18nProvider
      config={i18nConfig}
      initialLocale={locale}
      onLocaleChange={(newLocale) => {
        getElectronAPI()?.setLocale(newLocale);
        pluginHost?.setCurrentLocale(newLocale);
      }}
    >
      <DataProviderProvider provider={desktopDataProvider}>
        <PluginProvider
          host={pluginHost}
          onStateChange={() => setPluginTranslationVersion((v) => v + 1)}
        >
          <ErrorBoundary>
            {updater && <UpdateBanner updater={updater} />}
            <CMSLayout
              isElectron
              authClient={desktopAuthClient}
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

export const Route = createRootRoute({
  component: RootComponent,
});
