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
        "draft.widget.title": "草稿助手",
        "draft.widget.disabled": "插件未启用。前往设置启用草稿助手以获取草稿提醒。",
        "draft.widget.loading": "检查草稿中...",
        "draft.widget.reminders": "{count} 个提醒",
        "draft.widget.allGood": "所有草稿状态良好",
        "draft.widget.unnamed": "未命名草稿",
      },
      en: {
        "draft.widget.title": "Draft Coach",
        "draft.widget.disabled": "Plugin is disabled. Go to settings to enable Draft Coach for draft reminders.",
        "draft.widget.loading": "Checking drafts...",
        "draft.widget.reminders": "{count} reminders",
        "draft.widget.allGood": "All drafts are in good shape",
        "draft.widget.unnamed": "Untitled draft",
      },
    },
  },
};
