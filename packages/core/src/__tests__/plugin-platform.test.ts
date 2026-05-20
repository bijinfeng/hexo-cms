import { describe, expect, it } from "vitest";
import {
  PluginCatalog,
  PluginManifestError,
  StaticPluginSourceResolver,
  definePlugin,
  validatePluginManifest,
} from "../plugin";

const validManifest = {
  id: "hexo-cms-test-plugin",
  name: "Test Plugin",
  version: "1.0.0",
  description: "Test plugin",
  origin: "official" as const,
  runtime: "hosted" as const,
  permissions: ["ui.contribute"] as ["ui.contribute"],
  contributes: {
    dashboardWidgets: [
      {
        id: "test.widget",
        title: "Test Widget",
        renderer: "test.widget",
        size: "medium" as const,
      },
    ],
  },
};

describe("plugin platform contract", () => {
  it("validates origin and runtime instead of source", () => {
    expect(validatePluginManifest(validManifest)).toEqual(
      expect.objectContaining({
        id: "hexo-cms-test-plugin",
        origin: "official",
        runtime: "hosted",
      }),
    );

    expect(() =>
      validatePluginManifest({
        ...validManifest,
        origin: "builtin",
      }),
    ).toThrow(PluginManifestError);

    expect(() =>
      validatePluginManifest({
        ...validManifest,
        source: "builtin",
      }),
    ).toThrow(PluginManifestError);
  });

  it("creates a catalog from source resolvers and rejects duplicate ids", async () => {
    const plugin = definePlugin({
      manifest: validManifest,
      renderers: {
        "test.widget": () => null,
      },
    });

    const catalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("official", [plugin]),
    ]);

    expect(catalog.manifests()).toEqual([expect.objectContaining({ id: validManifest.id })]);
    expect(catalog.getDefinition(validManifest.id)).toEqual(plugin);
    expect(catalog.getManifest(validManifest.id)).toEqual(
      expect.objectContaining({
        origin: "official",
        runtime: "hosted",
      }),
    );

    await expect(
      PluginCatalog.discover([new StaticPluginSourceResolver("official", [plugin, plugin])]),
    ).rejects.toThrow(/duplicate plugin id/i);
  });

  it("only includes enabled local-dev definitions when the source is enabled", async () => {
    const plugin = definePlugin({
      manifest: {
        ...validManifest,
        id: "hexo-cms-local-plugin",
        origin: "local-dev",
      },
    });

    const disabledCatalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("local-dev", [plugin], { enabled: false }),
    ]);

    expect(disabledCatalog.manifests()).toEqual([]);

    const enabledCatalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("local-dev", [plugin], { enabled: true }),
    ]);

    expect(enabledCatalog.manifests().map((manifest) => manifest.id)).toEqual([
      "hexo-cms-local-plugin",
    ]);
  });
});
