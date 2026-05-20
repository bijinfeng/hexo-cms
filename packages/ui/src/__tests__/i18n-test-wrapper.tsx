import type { ReactNode } from "react";
import type { I18nConfig } from "@hexo-cms/core";
import { I18nProvider } from "../i18n/I18nProvider";
import { zh } from "../i18n/translations/zh";
import { en } from "../i18n/translations/en";

const defaultI18nConfig: I18nConfig = {
  locales: ["zh", "en"],
  defaultLocale: "zh",
  resources: { zh, en },
};

export function I18nTestWrapper({ children, locale = "zh" }: { children: ReactNode; locale?: string }) {
  return (
    <I18nProvider config={defaultI18nConfig} initialLocale={locale}>
      {children}
    </I18nProvider>
  );
}
