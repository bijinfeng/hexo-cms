import type { PluginManifest } from "./types";

export const ATTACHMENTS_HELPER_PLUGIN_ID = "hexo-cms-attachments-helper";
export const COMMENTS_OVERVIEW_PLUGIN_ID = "hexo-cms-comments-overview";

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
      settingsSchemas: {
        "attachments.settings": {
          id: "attachments.settings",
          fields: [
            {
              key: "showDocumentFilter",
              label: "显示文档筛选",
              type: "boolean",
              defaultValue: true,
              description: "在媒体库显示文档筛选和附件搜索入口。",
            },
          ],
        },
      },
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
  {
    id: COMMENTS_OVERVIEW_PLUGIN_ID,
    name: "Comments Overview",
    version: "0.1.0",
    description: "汇总评论状态，并在仪表板展示待处理评论入口。",
    source: "builtin",
    engine: {
      hexoCms: ">=0.1.0",
    },
    activation: ["onDashboard"],
    permissions: ["ui.contribute", "pluginConfig.write", "command.register"],
    contributes: {
      dashboardWidgets: [
        {
          id: "comments.overview",
          title: "评论概览",
          renderer: "builtin.comments.overview",
          size: "medium",
          order: 90,
        },
      ],
      settingsPanels: [
        {
          id: "comments.settings",
          title: "评论概览",
          schema: "comments.settings",
        },
      ],
      settingsSchemas: {
        "comments.settings": {
          id: "comments.settings",
          fields: [
            {
              key: "provider",
              label: "评论服务",
              type: "select",
              defaultValue: "giscus",
              options: [
                { label: "Giscus", value: "giscus" },
                { label: "Waline", value: "waline" },
              ],
              description: "用于展示评论入口和后续同步策略。",
            },
            {
              key: "moderationUrl",
              label: "评论后台 URL",
              type: "url",
              defaultValue: "",
              placeholder: "https://comments.example.com",
              description: "打开评论管理时跳转的后台地址。",
            },
            {
              key: "showPendingAlert",
              label: "展示待审核提醒",
              type: "boolean",
              defaultValue: true,
              description: "在仪表板中显示待审核评论提醒。",
            },
          ],
        },
      },
      sidebarItems: [
        {
          id: "comments.entry",
          title: "评论概览",
          target: "plugin.settings",
        },
      ],
      commands: [
        {
          id: "comments.openModeration",
          title: "打开评论管理",
        },
      ],
    },
  },
];
