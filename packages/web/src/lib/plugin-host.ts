import {
  PluginCatalog,
  type PluginConfigValue,
  PluginHost,
  StaticPluginSourceResolver,
} from "@hexo-cms/core";
import { localDevPlugins, officialPlugins } from "@hexo-cms/plugins";
import {
  createPlatformPluginConfigStore,
  createPlatformPluginFetch,
  createPlatformPluginLogStore,
  createPlatformPluginSecretStore,
  createPlatformPluginStateStore,
  createPlatformPluginStorageStore,
} from "@hexo-cms/ui";
import { en, zh } from "@hexo-cms/ui";
import type { ComponentType } from "react";
import { webDataProvider } from "./web-data-provider-instance";

function getCurrentLocale(): string {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("hexo-cms-locale");
  if (stored === "zh" || stored === "en") return stored;
  return "zh";
}

export async function createWebPluginHost() {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, {
      enabled: import.meta.env.DEV,
    }),
  ]);

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog,
    stateStore: createPlatformPluginStateStore(),
    configStore: createPlatformPluginConfigStore(),
    storageStore: createPlatformPluginStorageStore(),
    secretStore: createPlatformPluginSecretStore(),
    logStore: createPlatformPluginLogStore(),
    fetchImpl: createPlatformPluginFetch(),
    dataProvider: webDataProvider,
    builtinTranslations: { zh, en },
    currentLocale: getCurrentLocale(),
  });
}

export async function getWebPluginManifests() {
  const localDevEnabled = import.meta.env.DEV;
  const catalog = await PluginCatalog.discover([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, { enabled: localDevEnabled }),
  ]);
  return catalog.manifests();
}
