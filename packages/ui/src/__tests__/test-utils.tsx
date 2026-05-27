import {
  type DataProvider,
  MemoryStore,
  PluginCatalog,
  type PluginConfigStoreValue,
  type PluginConfigValue,
  type PluginDefinition,
  PluginHost,
  type PluginLogStoreValue,
  type PluginSecretStoreValue,
  type PluginStateStoreValue,
  type PluginStorageStoreValue,
  StaticPluginSourceResolver,
} from "@hexo-cms/core";
import { officialPlugins } from "@hexo-cms/plugins";
import type { ComponentType } from "react";
import { vi } from "vitest";

function createMockDataProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return {
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(null),
    saveToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    getPosts: vi.fn().mockResolvedValue([]),
    getPost: vi.fn().mockResolvedValue(null),
    savePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue(null),
    savePage: vi.fn().mockResolvedValue(undefined),
    deletePage: vi.fn().mockResolvedValue(undefined),
    getTags: vi.fn().mockResolvedValue({ tags: [], categories: [], total: 0 }),
    renameTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    deleteTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    mergeTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: "" }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi
      .fn()
      .mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: "", installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    readConfigFile: vi.fn().mockResolvedValue(""),
    writeConfigFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Creates a real PluginHost with official plugins for testing.
 * This provides realistic plugin data so UI tests work properly.
 */
export async function createTestPluginHost(
  dataProviderOverrides: Partial<DataProvider> = {},
): Promise<PluginHost<ComponentType<{ config?: PluginConfigValue }>>> {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver(
      "official",
      officialPlugins as PluginDefinition<ComponentType<{ config?: PluginConfigValue }>>[],
    ),
  ]);

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog,
    stateStore: new MemoryStore<PluginStateStoreValue>({}),
    configStore: new MemoryStore<PluginConfigStoreValue>({}),
    storageStore: new MemoryStore<PluginStorageStoreValue>({}),
    secretStore: new MemoryStore<PluginSecretStoreValue>({}),
    logStore: new MemoryStore<PluginLogStoreValue>({}),
    fetchImpl: vi.fn().mockResolvedValue(new Response("{}")),
    dataProvider: createMockDataProvider(dataProviderOverrides),
  });
}

/**
 * Creates a minimal mock PluginHost with no plugins (for tests that don't need plugin behavior).
 */
export function createMockPluginHost(): PluginHost<ComponentType<{ config?: PluginConfigValue }>> {
  return {
    snapshot: vi.fn(() => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
        sidebarItems: [],
        settingsPanels: [],
        pages: [],
        uiFlags: [],
      },
    })),
    manifests: vi.fn(() => []),
    getManifest: vi.fn(() => undefined),
    enablePlugin: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
        sidebarItems: [],
        settingsPanels: [],
        pages: [],
        uiFlags: [],
      },
    })),
    disablePlugin: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
        sidebarItems: [],
        settingsPanels: [],
        pages: [],
        uiFlags: [],
      },
    })),
    updatePluginConfig: vi.fn(() => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
        sidebarItems: [],
        settingsPanels: [],
        pages: [],
        uiFlags: [],
      },
    })),
    recordPluginError: vi.fn(async () => ({
      plugins: [],
      extensions: {
        commands: [],
        diagnostics: [],
        dashboardWidgets: [],
        events: [],
        sidebarItems: [],
        settingsPanels: [],
        pages: [],
        uiFlags: [],
      },
    })),
    executePluginCommand: vi.fn(async () => ({ ok: true, result: undefined })),
    runDiagnostics: vi.fn(async () => []),
    emitEvent: vi.fn(async () => []),
    getDashboardWidgetRenderer: vi.fn(() => undefined),
    getPluginPageRenderer: vi.fn(() => undefined),
  } as unknown as PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
}
