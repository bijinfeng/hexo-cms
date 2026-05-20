import type { PluginManifest } from "@hexo-cms/core";

export const DRAFT_COACH_PLUGIN_ID = "hexo-cms-draft-coach";

export const draftCoachManifest: PluginManifest = {
  id: DRAFT_COACH_PLUGIN_ID,
  name: "Draft Coach",
  version: "0.1.0",
  description: "Track stale drafts, word targets, and cover-image completeness.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["content.read", "event.subscribe", "pluginStorage.read", "pluginStorage.write", "pluginConfig.write", "ui.contribute"],
  contributes: {
    dashboardWidgets: [
      { id: "draft.overview", title: "Draft Coach", renderer: "draft.overview", size: "medium", order: 70 },
    ],
    settingsPanels: [{ id: "draft.settings", title: "Draft Coach", schema: "draft.settings" }],
    settingsSchemas: {
      "draft.settings": {
        id: "draft.settings",
        fields: [
          { key: "draftAgeThreshold", label: "Stale draft days", type: "string", defaultValue: "7" },
          { key: "wordCountTarget", label: "Target word count", type: "string", defaultValue: "800" },
          { key: "requireCover", label: "Require cover image", type: "boolean", defaultValue: true },
          { key: "enableNotifications", label: "Enable notifications", type: "boolean", defaultValue: true },
        ],
      },
    },
    sidebarItems: [{ id: "draft.entry", title: "Draft Coach", target: "plugin.settings" }],
    events: [{ name: "post.afterSave", description: "Check draft state after save" }],
    translations: {
      zh: {
        "draft.name": "草稿助手",
        "draft.widget.title": "草稿助手",
        "draft.widget.disabled": "插件未启用。前往设置启用草稿助手以获取草稿提醒。",
        "draft.widget.loading": "检查草稿中...",
        "draft.widget.reminders": "{{count}} 个提醒",
        "draft.widget.allGood": "所有草稿状态良好",
        "draft.widget.unnamed": "未命名草稿",
        "draft.check.overdue": "草稿已创建 {{days}} 天，超过阈值 {{threshold}} 天",
        "draft.check.overdueHint": "考虑完成并发布，或删除不再需要的草稿",
        "draft.check.wordCount": "当前字数 {{current}}，目标 {{target}}",
        "draft.check.wordCountHint": "还需 {{remaining}} 字",
        "draft.check.missingCover": "缺少封面图",
        "draft.check.missingCoverHint": "在 frontmatter 添加 cover 字段",
      },
      en: {
        "draft.name": "Draft Coach",
        "draft.widget.title": "Draft Coach",
        "draft.widget.disabled": "Plugin is disabled. Go to settings to enable Draft Coach for draft reminders.",
        "draft.widget.loading": "Checking drafts...",
        "draft.widget.reminders": "{{{count}}} reminders",
        "draft.widget.allGood": "All drafts are in good shape",
        "draft.widget.unnamed": "Untitled draft",
        "draft.check.overdue": "Draft created {{days}} days ago, exceeds {{threshold}}-day threshold",
        "draft.check.overdueHint": "Consider finishing and publishing, or removing unneeded drafts",
        "draft.check.wordCount": "Current count {{current}}, target {{target}}",
        "draft.check.wordCountHint": "{{remaining}} more words needed",
        "draft.check.missingCover": "Missing cover image",
        "draft.check.missingCoverHint": "Add a cover field in frontmatter",
      },
    },
  },
};
