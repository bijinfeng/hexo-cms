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
import { webDataProvider } from "./web-data-provider-instance";

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
