import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "@hexo-cms/core";
import { officialPlugins } from "../official";

describe("official plugins", () => {
  it("exports valid official hosted plugin definitions", () => {
    expect(officialPlugins.map((plugin) => plugin.manifest.id)).toEqual([
      "hexo-cms-attachments-helper",
      "hexo-cms-comments-overview",
      "hexo-cms-seo-inspector",
      "hexo-cms-draft-coach",
    ]);

    for (const plugin of officialPlugins) {
      expect(() => validatePluginManifest(plugin.manifest)).not.toThrow();
      expect(plugin.manifest.origin).toBe("official");
      expect(plugin.manifest.runtime).toBe("hosted");
    }
  });

  it("uses local renderer keys without builtin prefixes", () => {
    const renderers = officialPlugins.flatMap((plugin) =>
      Object.keys(plugin.renderers ?? {}).map((renderer) => `${plugin.manifest.id}:${renderer}`),
    );

    expect(renderers).toContain("hexo-cms-attachments-helper:attachments.summary");
    expect(renderers).toContain("hexo-cms-comments-overview:comments.overview");
    expect(renderers).toContain("hexo-cms-draft-coach:draft.overview");
    expect(renderers.some((renderer) => renderer.includes("builtin."))).toBe(false);
  });

  it("provides renderer implementations for every declared dashboard widget", () => {
    for (const plugin of officialPlugins) {
      for (const widget of plugin.manifest.contributes?.dashboardWidgets ?? []) {
        expect(plugin.renderers?.[widget.renderer]).toEqual(expect.any(Function));
      }
    }
  });
});
