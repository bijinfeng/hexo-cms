import type { PluginManifest } from "@hexo-cms/core";

export const COMMENTS_OVERVIEW_PLUGIN_ID = "hexo-cms-comments-overview";

export const commentsOverviewManifest: PluginManifest = {
  id: COMMENTS_OVERVIEW_PLUGIN_ID,
  name: "Comments Overview",
  version: "0.1.0",
  description: "Manage Giscus comments backed by GitHub Discussions.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["ui.contribute", "pluginConfig.write", "command.register", "network.fetch"],
  network: { allowedHosts: ["api.github.com"] },
  contributes: {
    dashboardWidgets: [
      {
        id: "comments.overview",
        title: "Comments Overview",
        renderer: "comments.overview",
        size: "medium",
        order: 90,
      },
    ],
    settingsPanels: [
      {
        id: "comments.giscus",
        title: "Giscus Comments",
        schema: "comments.giscus",
      },
    ],
    settingsSchemas: {
      "comments.giscus": {
        id: "comments.giscus",
        fields: [
          { key: "giscusRepo", label: "GitHub repository", type: "string", defaultValue: "", required: true, placeholder: "owner/repo" },
          { key: "giscusRepoId", label: "Repository ID", type: "string", defaultValue: "", required: true, placeholder: "R_kgDO..." },
          { key: "giscusCategoryId", label: "Discussion Category ID", type: "string", defaultValue: "", required: true, placeholder: "DIC_kw..." },
          { key: "giscusCategory", label: "Discussion category", type: "string", defaultValue: "General", required: true },
        ],
      },
    },
    sidebarItems: [
      {
        id: "comments.entry",
        title: "评论管理",
        target: "/comments",
      },
    ],
    commands: [
      {
        id: "comments.openModeration",
        title: "打开评论管理",
      },
    ],
  },
};
