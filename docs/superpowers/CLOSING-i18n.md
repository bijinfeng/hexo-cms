# i18n 国际化实施完成报告

> **日期**: 2026-05-20
> **状态**: ✅ 完成
> **分支**: master

---

## 概述

Hexo CMS 国际化（i18n）方案已完整实施。支持中英双语切换，Web/Desktop 100% 共享翻译基础设施，插件通过 manifest 声明式贡献翻译。

## 实施的提交

| Commit | 内容 |
|--------|------|
| `b9e9cd6` | Core i18n 类型定义 |
| `66abcea` | I18nProvider + useI18n hook |
| `d725cde` | 导出 I18nProvider/useI18n |
| `b342e9a` | Web __root.tsx 注入 |
| `6de28e2` | Desktop IPC + 注入 |
| `d7e6a6a` | PluginContributions translations 字段 |
| `6ecc427` | PluginHost.collectPluginTranslations() |
| `3a58dfb` | PluginProvider onStateChange 回调 |
| `13db99c` | Web/Desktop 合并插件翻译 |
| `2d0b383` | 内置翻译资源 (zh.ts 540行 / en.ts 540行) |
| `85818b6` | Sidebar 迁移 |
| `06a937e` | Topbar 语言切换按钮 |
| `78f0737` | SEO Inspector 翻译示例 |
| `4a24356` | Posts 页面迁移 (5 files) |
| `ce6a638` | Pages/Tags/Media 迁移 (5 files) |
| `43d9623` | Dashboard/Deploy/Themes/Menus 迁移 (4 files) |
| `f9da11e` | Login/Onboarding/Settings 迁移 (9 files) |
| `12f70e9` | 组件层迁移 (8 files) |
| `34e9425` | 404 + html lang 动态化 |
| `f528855` | 插件 React 组件迁移 |
| `3eac591` | media filter 键修复 |
| `5f9b568` | PluginRuntimeContext.t() |
| `fba5a80` | 插件诊断/事件处理器迁移 |
| `ecf5518` | html lang 同步 + PluginHost locale 同步 |
| `0f5f546` | 测试修复 (14/14 pass) |
| `b7141ca` | SSR Cookie + TranslationKey 类型 |
| `8e0113f` | TranslationKey 导出 |
| `9ca42dc` | 插件名称本地化 + 语言切换器 UX |

**共 28 个提交，修改 50+ 文件。**

## 架构

```
@hexo-cms/core/src/i18n/          ← Locale, I18nConfig, TranslationKeys 类型
@hexo-cms/ui/src/i18n/            ← I18nProvider, useI18n, zh.ts, en.ts
插件 manifest.contributes.translations  ← 插件翻译贡献
PluginHost.collectPluginTranslations()  ← 自动收集
PluginRuntimeContext.t()           ← 插件运行时翻译函数
```

## 文件清单

### 新增
- `packages/core/src/i18n/types.ts`
- `packages/core/src/i18n/index.ts`
- `packages/ui/src/i18n/I18nProvider.tsx`
- `packages/ui/src/i18n/index.ts`
- `packages/ui/src/i18n/translations/zh.ts`
- `packages/ui/src/i18n/translations/en.ts`
- `packages/ui/src/i18n/translations/keys.ts`
- `packages/ui/src/__tests__/i18n-test-wrapper.tsx`
- `docs/superpowers/specs/2026-05-19-i18n-design.md`
- `docs/superpowers/plans/2026-05-19-i18n-implementation.md`

### 修改
- `packages/core/src/index.ts` (+i18n export)
- `packages/core/src/plugin/types.ts` (+translations 字段, +t in PluginRuntimeContext)
- `packages/core/src/plugin/plugin-host.ts` (+collectPluginTranslations, +setCurrentLocale, +t in createRuntimeContext)
- `packages/ui/src/index.ts` (+i18n exports)
- `packages/ui/src/app-shell.ts` (+I18nProvider export)
- `packages/ui/src/plugin/plugin-provider.tsx` (+onStateChange, +setPluginLocale)
- `packages/ui/src/types/electron-api.ts` (+3 IPC channels)
- `packages/ui/src/components/layout/Sidebar.tsx` (useI18n + 插件名本地化)
- `packages/ui/src/components/layout/Topbar.tsx` (useI18n + 语言切换器)
- `packages/ui/src/components/layout/CMSLayout.tsx` (useI18n)
- `packages/ui/src/components/command-palette.tsx` (useI18n)
- `packages/ui/src/components/error-boundary.tsx` (useI18n)
- `packages/ui/src/components/save-indicator.tsx` (useI18n)
- `packages/ui/src/components/user-menu.tsx` (useI18n)
- `packages/ui/src/components/list-page.tsx` (useI18n)
- 16 个页面组件 (useI18n)
- `packages/web/src/routes/__root.tsx` (I18nProvider + cookie)
- `packages/web/src/lib/plugin-host.ts` (builtinTranslations)
- `packages/desktop/src/renderer/src/routes/__root.tsx` (I18nProvider)
- `packages/desktop/src/renderer/src/lib/plugin-host.ts` (builtinTranslations)
- `packages/desktop/src/main/index.ts` (+3 locale IPC)
- `packages/desktop/src/main/desktop-persistence.ts` (+localeStore)
- `packages/desktop/src/preload/index.ts` (+locale methods)
- 4 个插件 manifest (translations)
- 5 个插件组件 (useI18n / context.t())
- 9 个测试文件 (I18nTestWrapper)

## CI 状态

- **Type Check**: 0 new errors (pre-existing errors only: tsconfig baseUrl + plugin-host discover type)
- **Tests**: 14/14 files pass, 71/71 tests pass
- **Lint**: All files pass

## 使用方式

```tsx
// React 组件中
const { t, locale, setLocale } = useI18n();
t("posts.list.title")             // → "文章管理" / "Posts"
t("posts.list.subtitle", { count: 5 })  // → "共 5 篇文章" / "5 posts total"
setLocale("en");                  // 切换语言

// 插件诊断/事件处理器中 (PluginRuntimeContext)
context.t("seo.diag.missingTitle")
```

## 插件翻译贡献

```ts
// manifest.ts
contributes: {
  translations: {
    zh: { "my.name": "我的插件", "my.hello": "你好" },
    en: { "my.name": "My Plugin", "my.hello": "Hello" },
  },
}
```

## 后续可做

- 翻译编辑 UI（作为插件实现）
- 复数规则引擎（有其他语言需求时）
- RTL 布局支持
- 翻译资源一致性校验脚本
- 第三方插件市场的翻译贡献指南
