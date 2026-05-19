import type { PluginManifest } from "@hexo-cms/core";

export const SEO_INSPECTOR_PLUGIN_ID = "hexo-cms-seo-inspector";

export const seoInspectorManifest: PluginManifest = {
  id: SEO_INSPECTOR_PLUGIN_ID,
  name: "SEO Inspector",
  version: "0.1.0",
  description: "Check post SEO fields including title length, excerpt, slug, and taxonomy.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["content.read", "ui.contribute", "pluginConfig.write"],
  contributes: {
    settingsPanels: [{ id: "seo.settings", title: "SEO Inspector", schema: "seo.settings" }],
    settingsSchemas: {
      "seo.settings": {
        id: "seo.settings",
        fields: [
          { key: "minTitleLength", label: "Minimum title length", type: "string", defaultValue: "10" },
          { key: "maxTitleLength", label: "Maximum title length", type: "string", defaultValue: "60" },
          { key: "requireExcerpt", label: "Require excerpt", type: "boolean", defaultValue: true },
          { key: "requireCategories", label: "Require categories", type: "boolean", defaultValue: true },
        ],
      },
    },
    sidebarItems: [{ id: "seo.entry", title: "SEO Inspector", target: "plugin.settings" }],
    diagnostics: [
      { id: "seo.post-checks", title: "Post SEO checks", scope: "post" },
      { id: "seo.site-checks", title: "Site SEO summary", scope: "site" },
    ],
  },
};
