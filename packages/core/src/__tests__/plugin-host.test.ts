import { describe, expect, it, vi } from "vitest";
import {
  type DataProvider,
  definePlugin,
  MemoryPluginConfigStore,
  MemoryPluginLogStore,
  MemoryPluginSecretStore,
  MemoryPluginStateStore,
  MemoryPluginStorageStore,
  PluginCatalog,
  PluginHost,
} from "../index";

function createDataProvider(): DataProvider {
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
  };
}

function createHost() {
  const renderer = vi.fn();
  const commandHandler = vi.fn().mockReturnValue("ok");
  const diagnosticsHandler = vi.fn().mockResolvedValue([]);
  const eventHandler = vi.fn();
  const plugin = definePlugin({
    defaultEnabled: true,
    manifest: {
      id: "hexo-cms-host-test",
      name: "Host Test",
      version: "1.0.0",
      description: "Host test plugin",
      origin: "official",
      runtime: "hosted",
      permissions: ["ui.contribute", "command.register", "content.read", "event.subscribe"],
      contributes: {
        dashboardWidgets: [
          {
            id: "host.widget",
            title: "Host Widget",
            renderer: "host.widget",
            size: "medium",
          },
        ],
        commands: [{ id: "host.run", title: "Run" }],
        diagnostics: [{ id: "host.diagnostics", title: "Diagnostics", scope: "site" }],
        events: [{ name: "post.afterSave" }],
        uiFlags: [
          { id: "media-documents", flag: "media.documentFilter", title: "Media documents" },
        ],
      },
    },
    renderers: {
      "host.widget": renderer,
    },
    commands: {
      "host.run": () => commandHandler,
    },
    diagnostics: {
      "host.diagnostics": () => diagnosticsHandler,
    },
    events: {
      "post.afterSave": () => eventHandler,
    },
  });

  const host = new PluginHost({
    catalog: new PluginCatalog([plugin]),
    stateStore: new MemoryPluginStateStore(),
    configStore: new MemoryPluginConfigStore(),
    storageStore: new MemoryPluginStorageStore(),
    secretStore: new MemoryPluginSecretStore(),
    logStore: new MemoryPluginLogStore(),
    dataProvider: createDataProvider(),
  });

  return { host, renderer, commandHandler, diagnosticsHandler, eventHandler };
}

describe("PluginHost", () => {
  it("activates default enabled plugin runtime contributions", async () => {
    const { host, renderer, commandHandler, diagnosticsHandler, eventHandler } = createHost();

    const snapshot = host.snapshot();
    expect(snapshot.plugins[0].record.state).toBe("enabled");
    expect(snapshot.extensions.dashboardWidgets[0]).toEqual(
      expect.objectContaining({
        renderer: "host.widget",
        pluginId: "hexo-cms-host-test",
      }),
    );
    expect(snapshot.extensions.uiFlags[0]).toEqual(
      expect.objectContaining({
        flag: "media.documentFilter",
      }),
    );
    expect(host.getDashboardWidgetRenderer(snapshot.extensions.dashboardWidgets[0])).toBe(renderer);

    await expect(host.executePluginCommand("hexo-cms-host-test", "host.run")).resolves.toEqual(
      expect.objectContaining({ ok: true, value: "ok" }),
    );
    expect(commandHandler).toHaveBeenCalled();

    await host.runDiagnostics({ scope: "site" });
    expect(diagnosticsHandler).toHaveBeenCalled();

    await host.emitEvent("post.afterSave", { post: { path: "source/_posts/a.md" } });
    expect(eventHandler).toHaveBeenCalled();
  });

  it("removes runtime contributions when a plugin is disabled", async () => {
    const { host, eventHandler } = createHost();

    host.disablePlugin("hexo-cms-host-test");
    expect(host.snapshot().extensions.dashboardWidgets).toEqual([]);
    expect(host.snapshot().extensions.uiFlags).toEqual([]);

    await expect(host.executePluginCommand("hexo-cms-host-test", "host.run")).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "PLUGIN_COMMAND_NOT_FOUND" }),
      }),
    );

    await host.emitEvent("post.afterSave", {});
    expect(eventHandler).not.toHaveBeenCalled();
  });
});
