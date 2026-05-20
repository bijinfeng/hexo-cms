import { PluginCatalog, PluginHost, StaticPluginSourceResolver, type PluginConfigValue } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { officialPlugins, localDevPlugins } from "@hexo-cms/plugins";
import {
  createPlatformPluginConfigStore,
  createPlatformPluginFetch,
  createPlatformPluginLogStore,
  createPlatformPluginSecretStore,
  createPlatformPluginStateStore,
  createPlatformPluginStorageStore,
} from "@hexo-cms/ui";
import { zh, en, getElectronAPI } from "@hexo-cms/ui";
import { desktopDataProvider } from "./desktop-data-provider-instance";

export async function createDesktopPluginHost() {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, {
      enabled: import.meta.env.DEV,
    }),
  ]);

  const api = getElectronAPI();
  let locale = "zh";
  if (api) {
    const stored = await api.getLocale();
    if (stored === "zh" || stored === "en") locale = stored;
  }

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog,
    stateStore: createPlatformPluginStateStore(),
    configStore: createPlatformPluginConfigStore(),
    storageStore: createPlatformPluginStorageStore(),
    secretStore: createPlatformPluginSecretStore(),
    logStore: createPlatformPluginLogStore(),
    fetchImpl: createPlatformPluginFetch(),
    dataProvider: desktopDataProvider,
    builtinTranslations: { zh, en },
    currentLocale: locale,
  });
}
