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
          {
            key: "minTitleLength",
            label: "Minimum title length",
            type: "string",
            defaultValue: "10",
          },
          {
            key: "maxTitleLength",
            label: "Maximum title length",
            type: "string",
            defaultValue: "60",
          },
          { key: "requireExcerpt", label: "Require excerpt", type: "boolean", defaultValue: true },
          {
            key: "requireCategories",
            label: "Require categories",
            type: "boolean",
            defaultValue: true,
          },
        ],
      },
    },
    sidebarItems: [{ id: "seo.entry", title: "SEO Inspector", target: "plugin.settings" }],
    diagnostics: [
      { id: "seo.post-checks", title: "Post SEO checks", scope: "post" },
      { id: "seo.site-checks", title: "Site SEO summary", scope: "site" },
    ],
    translations: {
      zh: {
        "seo.name": "SEO 检查器",
        "seo.post.title": "SEO 检查",
        "seo.post.missingTitle": "缺少标题",
        "seo.post.titleHint": "在 frontmatter 中添加 title 字段",
        "seo.post.noDescription": "缺少描述",
        "seo.post.descHint": "在 frontmatter 中添加 description 字段",
        "seo.site.title": "站点 SEO 概览",
        "seo.site.noSitemap": "未找到 sitemap",
        "seo.diag.missingTitle": "文章缺少标题",
        "seo.diag.missingTitleHint": "添加一个描述性的标题有助于搜索引擎识别内容",
        "seo.diag.titleTooShort": "标题过短（{{length}} 字符），建议不少于 {{min}} 字符",
        "seo.diag.titleTooLong": "标题过长（{{length}} 字符），建议不超过 {{max}} 字符",
        "seo.diag.missingExcerpt": "缺少摘要或描述",
        "seo.diag.missingExcerptHint":
          "在 frontmatter 添加 excerpt 或 description 有助于社交分享和搜索摘要",
        "seo.diag.missingCategories": "文章未设置分类",
        "seo.diag.missingCategoriesHint": "设置分类有助于读者浏览相关内容",
        "seo.diag.missingSlug": "缺少 slug",
        "seo.diag.missingSlugHint": "显式设置 slug 能让 URL 更稳定",
        "seo.diag.siteExcerptCount": "有 {{count}} 篇文章缺少摘要",
        "seo.diag.siteCategoryCount": "有 {{count}} 篇文章未设置分类",
        "seo.diag.siteTitleCount": "有 {{count}} 篇文章标题过短",
      },
      en: {
        "seo.name": "SEO Inspector",
        "seo.post.title": "SEO Check",
        "seo.post.missingTitle": "Missing title",
        "seo.post.titleHint": "Add a title field in frontmatter",
        "seo.post.noDescription": "Missing description",
        "seo.post.descHint": "Add a description field in frontmatter",
        "seo.site.title": "Site SEO Overview",
        "seo.site.noSitemap": "Sitemap not found",
        "seo.diag.missingTitle": "Post is missing a title",
        "seo.diag.missingTitleHint":
          "Add a descriptive title to help search engines identify content",
        "seo.diag.titleTooShort":
          "Title is too short ({{length}} chars), recommended at least {{min}}",
        "seo.diag.titleTooLong":
          "Title is too long ({{length}} chars), recommended at most {{max}}",
        "seo.diag.missingExcerpt": "Missing excerpt or description",
        "seo.diag.missingExcerptHint":
          "Add excerpt or description in frontmatter for social sharing and search summaries",
        "seo.diag.missingCategories": "Post has no categories set",
        "seo.diag.missingCategoriesHint": "Setting categories helps readers browse related content",
        "seo.diag.missingSlug": "Missing slug",
        "seo.diag.missingSlugHint": "Setting an explicit slug makes URLs more stable",
        "seo.diag.siteExcerptCount": "{{count}} posts are missing an excerpt",
        "seo.diag.siteCategoryCount": "{{count}} posts have no categories set",
        "seo.diag.siteTitleCount": "{{count}} posts have titles that are too short",
      },
    },
  },
};
