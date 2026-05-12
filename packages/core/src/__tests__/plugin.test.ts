import { describe, expect, it, vi } from "vitest";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  SEO_INSPECTOR_PLUGIN_ID,
  MemoryPluginStateStore,
  MemoryPluginConfigStore,
  MemoryPluginLogStore,
  MemoryPluginSecretStore,
  MemoryPluginStorageStore,
  PermissionBroker,
  PluginManager,
  PluginManifestError,
  PluginPermissionError,
  type DiagnosticsHandler,
  type PluginFetch,
  type PluginStorageStoreValue,
  builtinPluginManifests,
  validatePluginManifest,
} from "../plugin";
import type { DataProvider } from "../data-provider";

describe("plugin system", () => {
  it("validates builtin plugin manifests", () => {
    expect(() => validatePluginManifest(builtinPluginManifests[0])).not.toThrow();
  });

  it("requires network hosts when network.fetch is declared", () => {
    expect(() =>
      validatePluginManifest({
        id: "hexo-cms-bad-plugin",
        name: "Bad Plugin",
        version: "0.1.0",
        description: "Bad plugin",
        source: "builtin",
        permissions: ["network.fetch"],
      }),
    ).toThrow(PluginManifestError);
  });

  it("enables and disables plugin contributions", () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
    });

    expect(manager.snapshot().extensions.dashboardWidgets).toHaveLength(0);

    manager.enable(ATTACHMENTS_HELPER_PLUGIN_ID);
    expect(manager.snapshot().extensions.dashboardWidgets).toEqual([
      expect.objectContaining({
        pluginId: ATTACHMENTS_HELPER_PLUGIN_ID,
        renderer: "builtin.attachments.summary",
      }),
    ]);

    manager.disable(ATTACHMENTS_HELPER_PLUGIN_ID);
    expect(manager.snapshot().extensions.dashboardWidgets).toHaveLength(0);
  });

  it("registers comments overview as a second built-in plugin", () => {
    expect(builtinPluginManifests.map((manifest) => manifest.id)).toContain(COMMENTS_OVERVIEW_PLUGIN_ID);

    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
    });

    manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(manager.snapshot().extensions.dashboardWidgets).toEqual([
      expect.objectContaining({
        pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
        renderer: "builtin.comments.overview",
        title: "评论概览",
      }),
    ]);

    manager.disable(COMMENTS_OVERVIEW_PLUGIN_ID);
    expect(manager.snapshot().extensions.dashboardWidgets).toHaveLength(0);
  });

  it("enforces declared permissions", () => {
    const broker = new PermissionBroker(builtinPluginManifests);

    expect(() =>
      broker.assert(ATTACHMENTS_HELPER_PLUGIN_ID, "content.read", "content.getMediaFiles"),
    ).not.toThrow();
    expect(() =>
      broker.assert(ATTACHMENTS_HELPER_PLUGIN_ID, "network.fetch", "http.fetch"),
    ).toThrow(PluginPermissionError);
  });

  it("persists plugin config across manager instances", () => {
    const configStore = new MemoryPluginConfigStore();
    const firstManager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      configStore,
    });

    firstManager.updatePluginConfig(COMMENTS_OVERVIEW_PLUGIN_ID, {
      provider: "waline",
      moderationUrl: "https://comments.example.com",
      showPendingAlert: false,
    });

    const secondManager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      configStore,
    });

    expect(
      secondManager.snapshot().plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID)?.config,
    ).toEqual({
      provider: "waline",
      moderationUrl: "https://comments.example.com",
      showPendingAlert: false,
    });
  });

  it("requires pluginConfig.write permission to persist plugin config", () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-readonly-plugin",
          name: "Readonly Plugin",
          version: "0.1.0",
          description: "Readonly test plugin",
          source: "builtin",
          permissions: ["ui.contribute"],
        },
      ],
      store: new MemoryPluginStateStore(),
    });

    expect(() => manager.updatePluginConfig("hexo-cms-readonly-plugin", { enabled: true })).toThrow(
      PluginPermissionError,
    );
  });

  it("executes registered plugin commands and returns command errors", async () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      commandHandlers: {
        [`${COMMENTS_OVERVIEW_PLUGIN_ID}:comments.openModeration`]: ({ args }) => `opened:${String(args[0])}`,
      },
    });

    manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);

    await expect(
      manager.executeCommand(COMMENTS_OVERVIEW_PLUGIN_ID, "comments.openModeration", [
        "https://comments.example.com",
      ]),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        value: "opened:https://comments.example.com",
      }),
    );

    const missingHandler = await manager.executeCommand(
      COMMENTS_OVERVIEW_PLUGIN_ID,
      "comments.unknown",
    );

    expect(missingHandler).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "PLUGIN_COMMAND_NOT_FOUND" }),
      }),
    );

    const managerWithoutHandlers = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
    });
    managerWithoutHandlers.enable(COMMENTS_OVERVIEW_PLUGIN_ID);

    await expect(
      managerWithoutHandlers.executeCommand(COMMENTS_OVERVIEW_PLUGIN_ID, "comments.openModeration"),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "PLUGIN_COMMAND_HANDLER_MISSING" }),
      }),
    );
  });

  it("returns permission errors for commands declared without command.register", async () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-command-without-permission",
          name: "Command Without Permission",
          version: "0.1.0",
          description: "Command permission test plugin",
          source: "builtin",
          permissions: ["ui.contribute"],
          contributes: {
            commands: [{ id: "unsafe.run", title: "Unsafe Run" }],
          },
        },
      ],
      store: new MemoryPluginStateStore(),
      commandHandlers: {
        "hexo-cms-command-without-permission:unsafe.run": () => "should not run",
      },
    });

    manager.enable("hexo-cms-command-without-permission");

    await expect(
      manager.executeCommand("hexo-cms-command-without-permission", "unsafe.run"),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "PLUGIN_PERMISSION_DENIED" }),
      }),
    );
  });

  it("isolates plugin storage by plugin id and persists through the storage store", async () => {
    const storageStore = new MemoryPluginStorageStore();
    const firstManager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      storageStore,
    });
    const attachmentsStorage = firstManager.createStorageAPI(ATTACHMENTS_HELPER_PLUGIN_ID);

    await attachmentsStorage.set("recentAttachment", {
      name: "guide.pdf",
      path: "source/images/guide.pdf",
    });
    await attachmentsStorage.set("copyCount", 2);

    await expect(attachmentsStorage.keys()).resolves.toEqual(["copyCount", "recentAttachment"]);
    await expect(attachmentsStorage.get("recentAttachment")).resolves.toEqual({
      name: "guide.pdf",
      path: "source/images/guide.pdf",
    });

    const secondManager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      storageStore,
    });
    const secondAttachmentsStorage = secondManager.createStorageAPI(ATTACHMENTS_HELPER_PLUGIN_ID);
    const commentsStorage = secondManager.createStorageAPI(COMMENTS_OVERVIEW_PLUGIN_ID);

    await expect(secondAttachmentsStorage.get("copyCount")).resolves.toBe(2);
    await expect(commentsStorage.keys()).rejects.toThrow(PluginPermissionError);

    await secondAttachmentsStorage.delete("copyCount");
    await expect(secondAttachmentsStorage.keys()).resolves.toEqual(["recentAttachment"]);
  });

  it("requires pluginStorage permissions for storage access", async () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-storage-readonly",
          name: "Storage Readonly",
          version: "0.1.0",
          description: "Storage permission test plugin",
          source: "builtin",
          permissions: ["pluginStorage.read"],
        },
        {
          id: "hexo-cms-storage-writeonly",
          name: "Storage Writeonly",
          version: "0.1.0",
          description: "Storage permission test plugin",
          source: "builtin",
          permissions: ["pluginStorage.write"],
        },
      ],
      store: new MemoryPluginStateStore(),
    });
    const readonlyStorage = manager.createStorageAPI("hexo-cms-storage-readonly");
    const writeonlyStorage = manager.createStorageAPI("hexo-cms-storage-writeonly");

    await expect(readonlyStorage.set("draft", true)).rejects.toThrow(PluginPermissionError);
    await expect(writeonlyStorage.keys()).rejects.toThrow(PluginPermissionError);
  });

  it("supports asynchronous plugin storage stores", async () => {
    const storageStore = {
      value: {} as PluginStorageStoreValue,
      async load() {
        return this.value;
      },
      async save(value: PluginStorageStoreValue) {
        this.value = value;
      },
    };
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      storageStore,
    });
    const storage = manager.createStorageAPI(ATTACHMENTS_HELPER_PLUGIN_ID);

    await storage.set("lastPath", "source/images/guide.pdf");

    await expect(storage.get("lastPath")).resolves.toBe("source/images/guide.pdf");
    await expect(storage.keys()).resolves.toEqual(["lastPath"]);
  });

  it("isolates plugin secrets and never exposes secret values", async () => {
    const secretStore = new MemoryPluginSecretStore();
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-secret-writer",
          name: "Secret Writer",
          version: "0.1.0",
          description: "Secret writer test plugin",
          source: "builtin",
          permissions: ["pluginSecret.read", "pluginSecret.write"],
        },
        {
          id: "hexo-cms-secret-reader",
          name: "Secret Reader",
          version: "0.1.0",
          description: "Secret reader test plugin",
          source: "builtin",
          permissions: ["pluginSecret.read"],
        },
      ],
      store: new MemoryPluginStateStore(),
      secretStore,
    });
    const writerSecrets = manager.createSecretAPI("hexo-cms-secret-writer");
    const readerSecrets = manager.createSecretAPI("hexo-cms-secret-reader");

    await expect(writerSecrets.has("apiKey")).resolves.toBe(false);
    await writerSecrets.set("apiKey", "secret-token");

    await expect(writerSecrets.has("apiKey")).resolves.toBe(true);
    await expect(readerSecrets.has("apiKey")).resolves.toBe(false);
    expect(Object.keys(writerSecrets)).toEqual(["has", "set", "delete"]);

    await writerSecrets.delete("apiKey");
    await expect(writerSecrets.has("apiKey")).resolves.toBe(false);
  });

  it("requires plugin secret permissions", async () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-secret-readonly",
          name: "Secret Readonly",
          version: "0.1.0",
          description: "Secret permission test plugin",
          source: "builtin",
          permissions: ["pluginSecret.read"],
        },
        {
          id: "hexo-cms-secret-writeonly",
          name: "Secret Writeonly",
          version: "0.1.0",
          description: "Secret permission test plugin",
          source: "builtin",
          permissions: ["pluginSecret.write"],
        },
      ],
      store: new MemoryPluginStateStore(),
    });

    await expect(manager.createSecretAPI("hexo-cms-secret-readonly").set("apiKey", "secret")).rejects.toThrow(
      PluginPermissionError,
    );
    await expect(manager.createSecretAPI("hexo-cms-secret-writeonly").has("apiKey")).rejects.toThrow(
      PluginPermissionError,
    );
  });

  it("enforces controlled network fetch permissions and allowed hosts", async () => {
    const fetchImpl = vi.fn<PluginFetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
      json: async () => ({ ok: true }),
      text: async () => "ok",
    });
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-network-plugin",
          name: "Network Plugin",
          version: "0.1.0",
          description: "Network permission test plugin",
          source: "builtin",
          permissions: ["network.fetch"],
          network: { allowedHosts: ["api.example.com", "*.trusted.example"] },
        },
        {
          id: "hexo-cms-network-without-permission",
          name: "Network Without Permission",
          version: "0.1.0",
          description: "Network permission test plugin",
          source: "builtin",
          permissions: ["ui.contribute"],
          network: { allowedHosts: ["api.example.com"] },
        },
      ],
      store: new MemoryPluginStateStore(),
      fetchImpl,
    });
    const http = manager.createHttpAPI("hexo-cms-network-plugin");

    await expect(
      http.fetch("https://api.example.com/status", {
        headers: {
          Cookie: "session=secret",
          Authorization: "Bearer plugin-token",
        },
      }),
    ).resolves.toEqual({ ok: true });
    await expect(http.fetch("https://nested.trusted.example/status")).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls[0][1].credentials).toBe("omit");
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer plugin-token",
    });

    await expect(http.fetch("http://api.example.com/status")).rejects.toThrow(/HTTPS/);
    await expect(http.fetch("https://evil.example.com/status")).rejects.toThrow(/not allowed/);
    await expect(
      manager.createHttpAPI("hexo-cms-network-without-permission").fetch("https://api.example.com/status"),
    ).rejects.toThrow(PluginPermissionError);
  });

  it("passes pluginId to fetchImpl for platform proxy auditing", async () => {
    const fetchImpl = vi.fn<PluginFetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: () => null },
      json: async () => ({ ok: true }),
      text: async () => "ok",
    });
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-audit-plugin",
          name: "Audit Plugin",
          version: "0.1.0",
          description: "Audit plugin",
          source: "builtin",
          permissions: ["network.fetch"],
          network: { allowedHosts: ["api.example.com"] },
        },
      ],
      store: new MemoryPluginStateStore(),
      fetchImpl,
    });

    const http = manager.createHttpAPI("hexo-cms-audit-plugin");
    await http.fetch("https://api.example.com/ping");

    expect(fetchImpl.mock.calls[0][1].pluginId).toBe("hexo-cms-audit-plugin");
  });

  it("records scoped and sanitized plugin logs", () => {
    const logStore = new MemoryPluginLogStore();
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      logStore,
      maxLogEntriesPerPlugin: 2,
    });
    const attachmentsLogger = manager.createLogger(ATTACHMENTS_HELPER_PLUGIN_ID);
    const commentsLogger = manager.createLogger(COMMENTS_OVERVIEW_PLUGIN_ID);

    attachmentsLogger.debug("Preparing attachment scan");
    attachmentsLogger.info("Copied link with token=secret-token at /Users/demo/blog/.env", {
      token: "secret-token",
      path: "/Users/demo/blog/.env",
    });
    attachmentsLogger.warn("Attachment scan finished");
    commentsLogger.error("Comments sync failed with cookie=session-cookie");

    const attachmentsLogs = manager.getPluginLogs(ATTACHMENTS_HELPER_PLUGIN_ID);
    const commentsLogs = manager.getPluginLogs(COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(attachmentsLogs).toHaveLength(2);
    expect(attachmentsLogs[0].message).toBe("Copied link with token=[redacted] at [redacted-path]");
    expect(attachmentsLogs[0].meta).toEqual({
      token: "[redacted]",
      path: "[redacted-path]",
    });
    expect(attachmentsLogs[1].message).toBe("Attachment scan finished");
    expect(commentsLogs).toHaveLength(1);
    expect(commentsLogs[0].message).not.toContain("session-cookie");
  });

  it("includes recent plugin logs in snapshots and writes runtime errors to the log store", () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      logStore: new MemoryPluginLogStore(),
    });

    manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);
    manager.recordPluginError(COMMENTS_OVERVIEW_PLUGIN_ID, {
      contributionId: "comments.overview",
      contributionType: "dashboard.widget",
      message: "Renderer failed with apiKey=secret-key at C:\\Users\\demo\\.env",
    });

    const plugin = manager.snapshot().plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(plugin?.logs).toEqual([
      expect.objectContaining({
        level: "error",
        message: "Renderer failed with apiKey=[redacted] at [redacted-path]",
        meta: expect.objectContaining({
          contributionId: "comments.overview",
          contributionType: "dashboard.widget",
          count: 1,
        }),
      }),
    ]);
    expect(JSON.stringify(plugin?.logs)).not.toContain("secret-key");
    expect(JSON.stringify(plugin?.logs)).not.toContain("C:\\Users");
  });

  it("dispatches plugin events to enabled subscribers and supports disposal", async () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-event-listener",
          name: "Event Listener",
          version: "0.1.0",
          description: "Event listener test plugin",
          source: "builtin",
          permissions: ["event.subscribe"],
        },
      ],
      store: new MemoryPluginStateStore(),
    });
    const received: unknown[] = [];

    manager.enable("hexo-cms-event-listener");
    const events = manager.createEventAPI("hexo-cms-event-listener");
    const subscription = events.on("post.afterSave", (event) => {
      received.push(event.payload);
    });

    await expect(manager.emitEvent("post.afterSave", { path: "source/_posts/hello.md" })).resolves.toEqual([
      expect.objectContaining({
        ok: true,
        pluginId: "hexo-cms-event-listener",
        eventName: "post.afterSave",
      }),
    ]);
    expect(received).toEqual([{ path: "source/_posts/hello.md" }]);

    subscription.dispose();
    await manager.emitEvent("post.afterSave", { path: "source/_posts/second.md" });
    expect(received).toEqual([{ path: "source/_posts/hello.md" }]);
  });

  it("requires event.subscribe permission for event subscriptions", () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-event-without-permission",
          name: "Event Without Permission",
          version: "0.1.0",
          description: "Event permission test plugin",
          source: "builtin",
          permissions: ["ui.contribute"],
        },
      ],
      store: new MemoryPluginStateStore(),
    });

    manager.enable("hexo-cms-event-without-permission");
    const events = manager.createEventAPI("hexo-cms-event-without-permission");

    expect(() => events.on("post.afterSave", () => undefined)).toThrow(PluginPermissionError);
  });

  it("records event handler failures and clears subscriptions when the error fuse trips", async () => {
    const manager = new PluginManager({
      manifests: [
        {
          id: "hexo-cms-throwing-event-listener",
          name: "Throwing Event Listener",
          version: "0.1.0",
          description: "Event failure test plugin",
          source: "builtin",
          permissions: ["event.subscribe"],
        },
      ],
      store: new MemoryPluginStateStore(),
      errorThreshold: 2,
    });

    manager.enable("hexo-cms-throwing-event-listener");
    manager.createEventAPI("hexo-cms-throwing-event-listener").on("post.afterSave", () => {
      throw new Error("Event failed with token=event-secret");
    });

    const firstResults = await manager.emitEvent("post.afterSave", { path: "source/_posts/hello.md" });
    expect(firstResults).toEqual([
      expect.objectContaining({
        ok: false,
        pluginId: "hexo-cms-throwing-event-listener",
        error: expect.objectContaining({ code: "PLUGIN_EVENT_HANDLER_FAILED" }),
      }),
    ]);
    expect(
      manager.snapshot().plugins.find(({ manifest }) => manifest.id === "hexo-cms-throwing-event-listener")?.record,
    ).toEqual(
      expect.objectContaining({
        state: "enabled",
        lastError: expect.objectContaining({
          contributionType: "event",
          message: expect.stringContaining("[redacted]"),
          count: 1,
        }),
      }),
    );

    await manager.emitEvent("post.afterSave", { path: "source/_posts/second.md" });
    const plugin = manager.snapshot().plugins.find(({ manifest }) => manifest.id === "hexo-cms-throwing-event-listener");

    expect(plugin?.record.state).toBe("error");
    expect(plugin?.record.lastError?.count).toBe(2);
    expect(plugin?.record.lastError?.message).not.toContain("event-secret");

    await expect(manager.emitEvent("post.afterSave", { path: "source/_posts/third.md" })).resolves.toEqual([]);
  });

  it("records sanitized plugin runtime errors without disabling the plugin", () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
    });

    manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);
    const snapshot = manager.recordPluginError(COMMENTS_OVERVIEW_PLUGIN_ID, {
      contributionId: "comments.overview",
      contributionType: "dashboard.widget",
      message: "Renderer failed with token=secret-token at C:\\Users\\demo\\project\\.env",
      stack: "Error: Renderer failed\n    at C:\\Users\\demo\\project\\.env:1:1",
    });

    const plugin = snapshot.plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(plugin?.record.state).toBe("enabled");
    expect(snapshot.extensions.dashboardWidgets).toEqual([
      expect.objectContaining({
        pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
      }),
    ]);
    expect(plugin?.record.lastError).toEqual(
      expect.objectContaining({
        contributionId: "comments.overview",
        contributionType: "dashboard.widget",
        message: expect.stringContaining("[redacted]"),
      }),
    );
    expect(plugin?.record.lastError?.message).not.toContain("secret-token");
    expect(plugin?.record.lastError?.message).not.toContain("C:\\Users");
    expect(plugin?.record.lastError?.stack).not.toContain("C:\\Users");
  });

  it("trips an error fuse after repeated plugin runtime failures", () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      errorThreshold: 3,
    });

    manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);
    manager.recordPluginError(COMMENTS_OVERVIEW_PLUGIN_ID, {
      contributionId: "comments.overview",
      contributionType: "dashboard.widget",
      message: "Renderer failed once",
    });
    const secondSnapshot = manager.recordPluginError(COMMENTS_OVERVIEW_PLUGIN_ID, {
      contributionId: "comments.overview",
      contributionType: "dashboard.widget",
      message: "Renderer failed twice",
    });

    expect(
      secondSnapshot.plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID)?.record.state,
    ).toBe("enabled");
    expect(secondSnapshot.extensions.dashboardWidgets).toHaveLength(1);

    const trippedSnapshot = manager.recordPluginError(COMMENTS_OVERVIEW_PLUGIN_ID, {
      contributionId: "comments.overview",
      contributionType: "dashboard.widget",
      message: "Renderer failed three times",
    });
    const plugin = trippedSnapshot.plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(plugin?.record.state).toBe("error");
    expect(plugin?.record.lastError?.count).toBe(3);
    expect(trippedSnapshot.extensions.dashboardWidgets).toHaveLength(0);

    const retriedSnapshot = manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);
    const retriedPlugin = retriedSnapshot.plugins.find(({ manifest }) => manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID);

    expect(retriedPlugin?.record.state).toBe("enabled");
    expect(retriedPlugin?.record.lastError).toBeUndefined();
    expect(retriedSnapshot.extensions.dashboardWidgets).toHaveLength(1);
  });

  it("registers the SEO Inspector manifest with diagnostics contributions", () => {
    expect(builtinPluginManifests.map((m) => m.id)).toContain(SEO_INSPECTOR_PLUGIN_ID);

    const manifest = builtinPluginManifests.find((m) => m.id === SEO_INSPECTOR_PLUGIN_ID);
    expect(manifest?.contributes?.diagnostics).toHaveLength(2);
    expect(manifest?.contributes?.diagnostics?.map((d) => d.scope)).toEqual(["post", "site"]);
  });

  it("runs diagnostics handlers and returns structured reports", async () => {
    function createMockDataProvider(): DataProvider {
      return {
        getConfig: vi.fn().mockResolvedValue(null),
        saveConfig: vi.fn(),
        getToken: vi.fn().mockResolvedValue(null),
        saveToken: vi.fn(),
        deleteToken: vi.fn(),
        getPosts: vi.fn().mockResolvedValue([]),
        getPost: vi.fn().mockResolvedValue(null),
        savePost: vi.fn(),
        deletePost: vi.fn(),
        getPages: vi.fn().mockResolvedValue([]),
        getPage: vi.fn().mockResolvedValue(null),
        savePage: vi.fn(),
        deletePage: vi.fn(),
        getTags: vi.fn().mockResolvedValue({ tags: [], categories: [], total: 0 }),
        renameTag: vi.fn(),
        deleteTag: vi.fn(),
        getMediaFiles: vi.fn().mockResolvedValue([]),
        uploadMedia: vi.fn(),
        deleteMedia: vi.fn(),
        getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
        getThemes: vi.fn().mockResolvedValue({ currentTheme: "", installedThemes: [] }),
        switchTheme: vi.fn(),
        getDeployments: vi.fn().mockResolvedValue([]),
        triggerDeploy: vi.fn(),
      } as unknown as DataProvider;
    }

    const postHandler: DiagnosticsHandler = async ({ target }) => {
      if (target.scope !== "post" || !target.post) return [];
      const issues = [];
      if (!target.post.title) {
        issues.push({ id: "test.title.missing", severity: "error" as const, message: "Title missing" });
      }
      return issues;
    };

    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      dataProvider: createMockDataProvider(),
      diagnosticsHandlers: {
        [`${SEO_INSPECTOR_PLUGIN_ID}:seo.post-checks`]: postHandler,
      },
    });

    manager.enable(SEO_INSPECTOR_PLUGIN_ID);

    const reports = await manager.runDiagnostics({
      scope: "post",
      post: {
        path: "test.md",
        title: "",
        date: "2026-05-12",
        content: "",
        frontmatter: {},
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].pluginId).toBe(SEO_INSPECTOR_PLUGIN_ID);
    expect(reports[0].scope).toBe("post");
    expect(reports[0].issues).toEqual([
      { id: "test.title.missing", severity: "error", message: "Title missing" },
    ]);
  });

  it("returns an error issue when diagnostics handler is missing", async () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      dataProvider: {} as DataProvider,
    });

    manager.enable(SEO_INSPECTOR_PLUGIN_ID);

    const reports = await manager.runDiagnostics({ scope: "post" });
    expect(reports[0].issues[0].severity).toBe("error");
    expect(reports[0].issues[0].message).toContain("not registered");
  });

  it("skips diagnostics contributions from disabled plugins", async () => {
    const manager = new PluginManager({
      manifests: builtinPluginManifests,
      store: new MemoryPluginStateStore(),
      dataProvider: {} as DataProvider,
    });

    // Don't enable SEO Inspector
    const reports = await manager.runDiagnostics({ scope: "post" });
    expect(reports).toHaveLength(0);
  });
});
