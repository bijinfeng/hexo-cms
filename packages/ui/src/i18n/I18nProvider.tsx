import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { I18nConfig, I18nContextValue, Locale, TranslationMap } from "@hexo-cms/core";

const I18nContext = createContext<I18nContextValue | null>(null);

function flattenResource(
  resource: Record<string, unknown>,
  prefix = "",
): TranslationMap {
  const result: TranslationMap = {};
  for (const [key, value] of Object.entries(resource)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object") {
      Object.assign(result, flattenResource(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
}

interface I18nProviderProps {
  config: I18nConfig;
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  children: React.ReactNode;
}

export function I18nProvider({
  config,
  initialLocale,
  onLocaleChange,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? config.defaultLocale,
  );

  const maps = useMemo(() => {
    const result: Record<string, TranslationMap> = {};
    for (const loc of config.locales) {
      const resource = config.resources[loc];
      result[loc] = resource ? flattenResource(resource) : {};
    }
    return result;
  }, [config]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const currentMap = maps[locale];
      if (currentMap?.[key]) return interpolate(currentMap[key], params);

      const defaultMap = maps[config.defaultLocale];
      if (locale !== config.defaultLocale && defaultMap?.[key]) {
        return interpolate(defaultMap[key], params);
      }

      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.warn(`[i18n] Missing translation: "${key}" for locale "${locale}"`);
      }
      return key;
    },
    [locale, maps, config.defaultLocale],
  );

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange],
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, locales: config.locales, setLocale, t }),
    [locale, config.locales, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n() must be used within <I18nProvider>");
  return ctx;
}
