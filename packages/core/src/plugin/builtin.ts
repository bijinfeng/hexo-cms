import type { PluginManifest } from "./types";

export const ATTACHMENTS_HELPER_PLUGIN_ID = "hexo-cms-attachments-helper";
export const COMMENTS_OVERVIEW_PLUGIN_ID = "hexo-cms-comments-overview";
export const SEO_INSPECTOR_PLUGIN_ID = "hexo-cms-seo-inspector";

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
  {
    id: SEO_INSPECTOR_PLUGIN_ID,
    name: "SEO Inspector",
    version: "0.1.0",
    description: "检查文章 SEO 要素：标题长度、摘要、slug、frontmatter 完整性。",
    source: "builtin",
    engine: {
      hexoCms: ">=0.1.0",
    },
    activation: ["onDashboard"],
    permissions: ["content.read", "ui.contribute", "pluginConfig.write"],
    contributes: {
      settingsPanels: [
        {
          id: "seo.settings",
          title: "SEO Inspector",
          schema: "seo.settings",
        },
      ],
      settingsSchemas: {
        "seo.settings": {
          id: "seo.settings",
          fields: [
            {
              key: "minTitleLength",
              label: "标题最小长度",
              type: "string",
              defaultValue: "10",
              description: "小于该字符数的标题会被标记为问题。",
            },
            {
              key: "maxTitleLength",
              label: "标题最大长度",
              type: "string",
              defaultValue: "60",
              description: "大于该字符数的标题会被标记为问题。",
            },
            {
              key: "requireExcerpt",
              label: "要求提供摘要",
              type: "boolean",
              defaultValue: true,
              description: "检查文章是否在 frontmatter 中提供 excerpt 或 description。",
            },
            {
              key: "requireCategories",
              label: "要求分类",
              type: "boolean",
              defaultValue: true,
              description: "检查文章是否至少有一个分类。",
            },
          ],
        },
      },
      sidebarItems: [
        {
          id: "seo.entry",
          title: "SEO Inspector",
          target: "plugin.settings",
        },
      ],
      diagnostics: [
        {
          id: "seo.post-checks",
          title: "文章 SEO 检查",
          scope: "post",
          description: "检查标题长度、摘要、slug 和 frontmatter 关键字段。",
        },
        {
          id: "seo.site-checks",
          title: "站点 SEO 概览",
          scope: "site",
          description: "汇总站点级别的 SEO 问题，识别缺失摘要的文章数量。",
        },
      ],
    },
  },
];
