import { describe, expect, it } from "vitest";
import {
  ATTACHMENTS_HELPER_PLUGIN_ID,
  COMMENTS_OVERVIEW_PLUGIN_ID,
  MemoryPluginStateStore,
  MemoryPluginConfigStore,
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
});
