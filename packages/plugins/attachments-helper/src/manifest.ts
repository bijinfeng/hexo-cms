import type { PluginManifest } from "@hexo-cms/core";

export const ATTACHMENTS_HELPER_PLUGIN_ID = "hexo-cms-attachments-helper";

export const attachmentsHelperManifest: PluginManifest = {
  id: ATTACHMENTS_HELPER_PLUGIN_ID,
  name: "Attachments Helper",
  version: "0.1.0",
  description: "Filter media by attachment type and provide copy-link helpers.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
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
        title: "Attachments Helper",
        renderer: "attachments.summary",
        size: "medium",
        order: 80,
      },
    ],
    settingsPanels: [
      {
        id: "attachments.settings",
        title: "Attachments Helper",
        schema: "attachments.settings",
      },
    ],
    settingsSchemas: {
      "attachments.settings": {
        id: "attachments.settings",
        fields: [
          {
            key: "showDocumentFilter",
            label: "Show document filter",
            type: "boolean",
            defaultValue: true,
            description: "Show document filtering and attachment search in the media library.",
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
        title: "Copy attachment link",
      },
    ],
    uiFlags: [
      {
        id: "media-document-filter",
        flag: "media.documentFilter",
        title: "Media document filter",
        order: 10,
      },
      {
        id: "media-search",
        flag: "media.search",
        title: "Media search",
        order: 20,
      },
    ],
    translations: {
      zh: {
        "attachments.widget.loading": "正在读取附件...",
        "attachments.widget.attachmentCount": "附件数",
        "attachments.widget.totalSize": "合计大小",
        "attachments.widget.noAttachments": "暂无附件文件",
        "attachments.widget.copyLink": "复制附件链接",
        "attachments.widget.copied": "已复制",
      },
      en: {
        "attachments.widget.loading": "Loading attachments...",
        "attachments.widget.attachmentCount": "Attachments",
        "attachments.widget.totalSize": "Total Size",
        "attachments.widget.noAttachments": "No attachment files",
        "attachments.widget.copyLink": "Copy attachment link",
        "attachments.widget.copied": "Copied",
      },
    },
  },
};
