import {
  PluginCatalog,
  type PluginConfigValue,
  type PluginDefinition,
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
  en,
  getElectronAPI,
  zh,
} from "@hexo-cms/ui";
import type { ComponentType } from "react";
import { desktopDataProvider } from "./desktop-data-provider-instance";

export async function createDesktopPluginHost() {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver<ComponentType<{ config?: PluginConfigValue }>>(
      "official",
      officialPlugins as PluginDefinition<ComponentType<{ config?: PluginConfigValue }>>[],
    ),
    new StaticPluginSourceResolver<ComponentType<{ config?: PluginConfigValue }>>(
      "local-dev",
      localDevPlugins as PluginDefinition<ComponentType<{ config?: PluginConfigValue }>>[],
      {
        enabled: import.meta.env.DEV,
      },
    ),
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
