import { describe, expect, it } from "vitest";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  MemoryPluginStateStore,
  MemoryPluginConfigStore,
  MemoryPluginStorageStore,
  PermissionBroker,
  PluginManager,
  PluginManifestError,
  PluginPermissionError,
  builtinPluginManifests,
  validatePluginManifest,
} from "../plugin";

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
});
