import type { PluginManifest } from "./types";

export const ATTACHMENTS_HELPER_PLUGIN_ID = "hexo-cms-attachments-helper";

export const builtinPluginManifests: PluginManifest[] = [
  {
    id: ATTACHMENTS_HELPER_PLUGIN_ID,
    name: "Attachments Helper",
    version: "0.1.0",
    description: "按附件类型筛选媒体文件，并提供复制链接等轻量辅助能力。",
    source: "builtin",
    engine: {
      hexoCms: ">=0.1.0",
    },
    activation: ["onMedia"],
    permissions: [
      "content.read",
      "pluginStorage.read",
      "pluginStorage.write",
      "pluginConfig.write",
      "ui.contribute",
      "command.register",
    ],
    contributes: {
      dashboardWidgets: [
        {
          id: "attachments.summary",
          title: "附件助手",
          renderer: "builtin.attachments.summary",
          size: "medium",
          order: 80,
        },
      ],
      settingsPanels: [
        {
          id: "attachments.settings",
          title: "附件助手",
          schema: "attachments.settings",
        },
      ],
      sidebarItems: [
        {
          id: "attachments.media-entry",
          title: "附件助手",
          target: "plugin.settings",
        },
      ],
      commands: [
        {
          id: "attachments.copyLink",
          title: "复制附件链接",
        },
      ],
    },
  },
];
