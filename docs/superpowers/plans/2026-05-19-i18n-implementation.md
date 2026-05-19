# i18n 国际化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Hexo CMS 添加中英双语支持，提供 React Context 翻译基础设施，Web/Desktop 100% 复用，插件通过 manifest 声明式贡献翻译。

**Architecture:** `@hexo-cms/core` 定义纯类型；`@hexo-cms/ui` 提供 `<I18nProvider>` + `useI18n()`；Web/Desktop 在 `__root.tsx` 检测语言偏好注入 Provider；插件 manifest 内联翻译，PluginHost 自动收集，PluginProvider 通过回调刷新。

**Tech Stack:** React Context + TypeScript（零外部依赖）

---

## File Map

```
NEW:  packages/core/src/i18n/types.ts
NEW:  packages/core/src/i18n/index.ts
MOD:  packages/core/src/index.ts                        (+ export * from "./i18n")
MOD:  packages/core/src/plugin/types.ts                 (+ translations in PluginContributions)

NEW:  packages/ui/src/i18n/I18nProvider.tsx             (I18nProvider + useI18n)
NEW:  packages/ui/src/i18n/index.ts
NEW:  packages/ui/src/i18n/translations/zh.ts           (阶段 3)
NEW:  packages/ui/src/i18n/translations/en.ts           (阶段 3)
MOD:  packages/ui/src/index.ts                          (+ export I18nProvider/useI18n)
MOD:  packages/ui/src/plugin/plugin-provider.tsx        (+ onStateChange callback)
MOD:  packages/ui/src/components/layout/Sidebar.tsx     (阶段 3 - 试点迁移)
MOD:  packages/ui/src/components/layout/Topbar.tsx      (阶段 3 - 语言切换)

MOD:  packages/web/src/routes/__root.tsx                (+ I18nProvider + detectWebLocale)

MOD:  packages/ui/src/types/electron-api.ts             (+ 3 IPC channels)
MOD:  packages/desktop/src/preload/index.ts             (+ locale IPC methods)
MOD:  packages/desktop/src/main/index.ts                (+ locale IPC handlers)
MOD:  packages/desktop/src/main/desktop-persistence.ts  (+ localeStore)
MOD:  packages/desktop/src/renderer/src/routes/__root.tsx (+ I18nProvider + detectDesktopLocale)
```

---

## Phase 1: 基础设施

### Task 1: Core i18n 类型

**Files:** `packages/core/src/i18n/types.ts` (NEW), `packages/core/src/i18n/index.ts` (NEW), `packages/core/src/index.ts` (MODIFY)

- [ ] **Step 1: 创建 `packages/core/src/i18n/types.ts`**

```ts
/** 语言标识 */
export type Locale = "zh" | "en" | (string & {});

/** 翻译资源：嵌套对象结构 */
export type TranslationResource = {
  [key: string]: string | TranslationResource;
};

/** 运行时使用的扁平化翻译映射 */
export type TranslationMap = Record<string, string>;

/** I18n 配置 */
export interface I18nConfig {
  /** 支持的语言列表 */
  locales: Locale[];
  /** 默认语言（回退语言） */
  defaultLocale: Locale;
  /** 各语言翻译资源 */
  resources: Record<Locale, TranslationResource>;
}

/** useI18n() 返回值 */
export interface I18nContextValue {
  /** 当前语言 */
  locale: Locale;
  /** 支持的语言列表 */
  locales: Locale[];
  /** 切换语言 */
  setLocale: (locale: Locale) => void;
  /**
   * 翻译函数
   * @param key 点号分隔的翻译键，如 "posts.page.title"
   * @param params 插值参数，替换模板中的 {{key}}
   */
  t: (key: string, params?: Record<string, string | number>) => string;
}
```

- [ ] **Step 2: 创建 `packages/core/src/i18n/index.ts`**

```ts
export * from "./types";
```

- [ ] **Step 3: 修改 `packages/core/src/index.ts`**，在 `export * from "./taxonomy";` 后新增一行：

```ts
export * from "./i18n";
```

- [ ] **Step 4: 验证编译**

```bash
pnpm --filter @hexo-cms/core typecheck
```

- [ ] **Step 5: Commit & Push**

```bash
git add packages/core/src/i18n/ packages/core/src/index.ts
git commit -m "feat(i18n): add core i18n types"
git push
```

---

### Task 2: I18nProvider + useI18n Hook

**Files:** `packages/ui/src/i18n/I18nProvider.tsx` (NEW), `packages/ui/src/i18n/index.ts` (NEW)

- [ ] **Step 1: 创建 `packages/ui/src/i18n/I18nProvider.tsx`**

```tsx
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { I18nConfig, I18nContextValue, Locale, TranslationMap } from "@hexo-cms/core";

const I18nContext = createContext<I18nContextValue | null>(null);

function flattenResource(
  resource: Record<string, unknown>,
  prefix = "",
): TranslationMap {
  const result: TranslationMap = {};
  for (const [key, value] of Object.entries(resource)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object") {
      Object.assign(result, flattenResource(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
}

interface I18nProviderProps {
  config: I18nConfig;
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  children: React.ReactNode;
}

export function I18nProvider({
  config,
  initialLocale,
  onLocaleChange,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? config.defaultLocale,
  );

  const maps = useMemo(() => {
    const result: Record<string, TranslationMap> = {};
    for (const loc of config.locales) {
      const resource = config.resources[loc];
      result[loc] = resource ? flattenResource(resource) : {};
    }
    return result;
  }, [config]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const currentMap = maps[locale];
      if (currentMap?.[key]) return interpolate(currentMap[key], params);

      const defaultMap = maps[config.defaultLocale];
      if (locale !== config.defaultLocale && defaultMap?.[key]) {
        return interpolate(defaultMap[key], params);
      }

      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation: "${key}" for locale "${locale}"`);
      }
      return key;
    },
    [locale, maps, config.defaultLocale],
  );

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, locales: config.locales, setLocale, t }),
    [locale, config.locales, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n() must be used within <I18nProvider>");
  return ctx;
}
```

- [ ] **Step 2: 创建 `packages/ui/src/i18n/index.ts`**

```ts
export { I18nProvider, useI18n } from "./I18nProvider";
```

- [ ] **Step 3: 验证编译**

```bash
pnpm --filter @hexo-cms/ui typecheck
```

- [ ] **Step 4: Commit & Push**

```bash
git add packages/ui/src/i18n/I18nProvider.tsx packages/ui/src/i18n/index.ts
git commit -m "feat(i18n): add I18nProvider + useI18n hook"
git push
```

---

### Task 3: UI 包导出

**Files:** `packages/ui/src/index.ts` (MODIFY)

- [ ] **Step 1: 在 `packages/ui/src/index.ts` 中添加导出**

在 `// Hooks` 注释块上方新增：
```ts
// I18n
export { I18nProvider, useI18n } from "./i18n";
```

- [ ] **Step 2: 验证编译**

```bash
pnpm --filter @hexo-cms/ui typecheck
```

- [ ] **Step 3: Commit & Push**

```bash
git add packages/ui/src/index.ts
git commit -m "feat(i18n): export I18nProvider + useI18n from @hexo-cms/ui"
git push
```

---

### Task 4: Web 端 __root.tsx 注入 I18nProvider

**Files:** `packages/web/src/routes/__root.tsx` (MODIFY)

- [ ] **Step 1: 添加 import**

在现有 import 中追加 `useMemo`，添加 `I18nProvider`：

```tsx
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
```
```tsx
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  I18nProvider,
  PluginProvider,
  ...
} from "@hexo-cms/ui/app-shell";
```

- [ ] **Step 2: 添加语言检测函数和 locale state**

在 `function NotFound()` 上方新增：
```tsx
function detectWebLocale(): "zh" | "en" {
  const stored = localStorage.getItem("hexo-cms-locale");
  if (stored === "zh" || stored === "en") return stored;
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "zh" || browserLang === "en") return browserLang;
  return "zh";
}
```

在 `RootComponent` 的 `const loadingRef = useRef(false);` 之后新增：
```tsx
const [locale, setLocale] = useState<"zh" | "en">(() => detectWebLocale());
```

- [ ] **Step 3: 创建 i18nConfig**

在 `const guardPending = ...` 之后，所有 return 之前：
```tsx
const i18nConfig = useMemo(() => ({
  locales: ["zh", "en"] as const,
  defaultLocale: "zh" as const,
  resources: {
    zh: {},
    en: {},
  },
}), []);
```

- [ ] **Step 4: 用 I18nProvider 包裹已认证渲染树**

将最后的 return（已认证路径，pluginHost 非 null 时）改为：
```tsx
  return (
    <I18nProvider
      config={i18nConfig}
      initialLocale={locale}
      onLocaleChange={(newLocale) => {
        localStorage.setItem("hexo-cms-locale", newLocale);
      }}
    >
      <DataProviderProvider provider={webDataProvider}>
        <PluginProvider host={pluginHost}>
          <ErrorBoundary>
            <CMSLayout
              authClient={webAuthClient}
              onSignedOut={() => navigate({ to: "/login", replace: true })}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </CMSLayout>
          </ErrorBoundary>
        </PluginProvider>
      </DataProviderProvider>
    </I18nProvider>
  );
```

- [ ] **Step 5: 验证编译**

```bash
pnpm --filter @hexo-cms/web typecheck
```

- [ ] **Step 6: Commit & Push**

```bash
git add packages/web/src/routes/__root.tsx
git commit -m "feat(i18n): inject I18nProvider in web __root.tsx"
git push
```

---

### Task 5: Desktop 端 IPC + __root.tsx 注入

**Files:** 5 files modified (see below)

#### 5a: 扩展 ElectronAPI 类型

**File:** `packages/ui/src/types/electron-api.ts`

- [ ] **Step 1: 在 ELECTRON_IPC_CHANNELS 末尾新增 3 个通道**

```ts
export const ELECTRON_IPC_CHANNELS = [
  // ... 现有全部保持
  "update:get-version",
  "locale:get",
  "locale:set",
  "locale:get-system",
] as const;
```

- [ ] **Step 2: 在 ElectronAPI interface 末尾新增方法**

```ts
export interface ElectronAPI {
  // ... 现有方法保持
  getVersion: () => Promise<{ version: string; channel: UpdateChannel }>;
  /** 读取用户语言偏好 */
  getLocale: () => Promise<string | null>;
  /** 保存用户语言偏好 */
  setLocale: (locale: string) => Promise<void>;
  /** 获取系统语言 */
  getSystemLocale: () => Promise<string>;
}
```

#### 5b: Preload 暴露新 API

**File:** `packages/desktop/src/preload/index.ts`

- [ ] **Step 3: 在 electronAPI 对象中添加**

```ts
const electronAPI: ElectronAPI = {
  // ... 现有方法保持
  getVersion: () => ipcRenderer.invoke("update:get-version"),
  getLocale: () => ipcRenderer.invoke("locale:get"),
  setLocale: (locale) => ipcRenderer.invoke("locale:set", locale),
  getSystemLocale: () => ipcRenderer.invoke("locale:get-system"),
};
```

#### 5c: DesktopPersistence 添加 locale 存储

**File:** `packages/desktop/src/main/desktop-persistence.ts`

- [ ] **Step 4: 在 DesktopPersistence interface 中添加方法**

```ts
export interface DesktopPersistence {
  // ... 现有方法保持
  listPluginNetworkAudit(limit?: number): PluginNetworkAuditEntry[];
  /** 读取语言偏好 */
  loadLocale(): string | null;
  /** 保存语言偏好 */
  saveLocale(locale: string): void;
}
```

- [ ] **Step 5: 在 createDesktopPersistence 函数体中添加 store 和实现**

在 `const configStore = createJsonFileStore<...>` 之后：
```ts
  const localeStore = createJsonFileStore<string | null>(
    () => getUserDataFilePath("locale.json"),
    () => null,
  );
```

在 return 对象中添加：
```ts
    loadLocale: () => localeStore.load(),
    saveLocale: (locale) => localeStore.save(locale),
```

#### 5d: Main 进程 IPC handlers

**File:** `packages/desktop/src/main/index.ts`

- [ ] **Step 6: 添加 locale IPC handlers**

在 `// ==================== 更新 IPC ====================` 块之前添加：
```ts
// ==================== Locale IPC ====================
ipcMain.handle("locale:get", () => {
  return desktopPersistence.loadLocale();
});
ipcMain.handle("locale:set", (_event, locale: string) => {
  desktopPersistence.saveLocale(locale);
});
ipcMain.handle("locale:get-system", () => {
  return app.getLocale();
});
```

#### 5e: Desktop __root.tsx 注入 I18nProvider

**File:** `packages/desktop/src/renderer/src/routes/__root.tsx`

- [ ] **Step 7: 添加 import**

```tsx
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
```
```tsx
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  I18nProvider,
  PluginProvider,
  ...
} from "@hexo-cms/ui/app-shell";
```

- [ ] **Step 8: 添加 locale state 和检测逻辑**

在 `const updater = useUpdater();` 之后：
```tsx
const [locale, setLocale] = useState<"zh" | "en">("zh");

useEffect(() => {
  window.electronAPI.getLocale().then((stored) => {
    if (stored === "zh" || stored === "en") {
      setLocale(stored);
    } else {
      window.electronAPI.getSystemLocale().then((sys) => {
        const lang = sys?.split("-")[0];
        if (lang === "zh" || lang === "en") setLocale(lang as "zh" | "en");
      });
    }
  });
}, []);
```

- [ ] **Step 9: 创建 i18nConfig**

在 `const guardPending = ...` 之后：
```tsx
const i18nConfig = useMemo(() => ({
  locales: ["zh", "en"] as const,
  defaultLocale: "zh" as const,
  resources: {
    zh: {},
    en: {},
  },
}), []);
```

- [ ] **Step 10: 用 I18nProvider 包裹已认证渲染树**

将最后的 return 改为：
```tsx
  return (
    <I18nProvider
      config={i18nConfig}
      initialLocale={locale}
      onLocaleChange={(newLocale) => {
        window.electronAPI.setLocale(newLocale);
      }}
    >
      <DataProviderProvider provider={desktopDataProvider}>
        <PluginProvider host={pluginHost}>
          <ErrorBoundary>
            {updater && <UpdateBanner updater={updater} />}
            <CMSLayout
              isElectron
              authClient={desktopAuthClient}
              onSignedOut={() => navigate({ to: "/login", replace: true })}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </CMSLayout>
          </ErrorBoundary>
        </PluginProvider>
      </DataProviderProvider>
    </I18nProvider>
  );
```

- [ ] **Step 11: 验证编译**

```bash
pnpm typecheck
```

- [ ] **Step 12: Commit & Push**

```bash
git add packages/ui/src/types/electron-api.ts \
        packages/desktop/src/preload/index.ts \
        packages/desktop/src/main/index.ts \
        packages/desktop/src/main/desktop-persistence.ts \
        packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat(i18n): add desktop locale IPC + I18nProvider injection"
git push
```

---

## Phase 2: 插件翻译贡献

### Task 6: PluginContributions 类型扩展

**Files:** `packages/core/src/plugin/types.ts` (MODIFY)

- [ ] **Step 1: 在 PluginContributions 中添加 translations 字段**

在 `export interface PluginContributions {` 块内，`uiFlags` 之后添加：
```ts
  /**
   * 插件提供的翻译资源。
   * key 为 Locale（如 "zh", "en"），value 为扁平翻译映射。
   * 所有 key 应以插件 ID 前缀命名空间。
   */
  translations?: Partial<Record<string, Record<string, string>>>;
```

- [ ] **Step 2: 验证编译**

```bash
pnpm --filter @hexo-cms/core typecheck
```

- [ ] **Step 3: Commit & Push**

```bash
git add packages/core/src/plugin/types.ts
git commit -m "feat(i18n): add translations field to PluginContributions"
git push
```

---

### Task 7: PluginHost.collectPluginTranslations()

**Files:** `packages/core/src/plugin/plugin-host.ts` (MODIFY)

- [ ] **Step 1: 添加 collectPluginTranslations 方法**

在 `getDashboardWidgetRenderer` 方法之后，`private syncRuntimeContributions` 之前添加：
```ts
  collectPluginTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {};
    for (const { manifest, record } of this.snapshot().plugins) {
      if (record.state !== "enabled") continue;
      const pluginTranslations = manifest.contributes?.translations;
      if (!pluginTranslations) continue;
      for (const [locale, map] of Object.entries(pluginTranslations)) {
        if (!map) continue;
        translations[locale] = { ...(translations[locale] ?? {}), ...map };
      }
    }
    return translations;
  }
```

- [ ] **Step 2: 验证编译**

```bash
pnpm --filter @hexo-cms core typecheck
```

- [ ] **Step 3: Commit & Push**

```bash
git add packages/core/src/plugin/plugin-host.ts
git commit -m "feat(i18n): add PluginHost.collectPluginTranslations()"
git push
```

---

### Task 8: PluginProvider 添加 onStateChange 回调

**Files:** `packages/ui/src/plugin/plugin-provider.tsx` (MODIFY)

- [ ] **Step 1: 在 PluginProvider props 中添加 onStateChange**

```tsx
export function PluginProvider({
  children,
  host,
  onStateChange,
}: {
  children: React.ReactNode;
  host: PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
  onStateChange?: () => void;
}) {
```

- [ ] **Step 2: 在 enablePlugin/disablePlugin 中调用回调**

修改 `enablePlugin`:
```tsx
  const enablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.enablePlugin(pluginId));
    onStateChange?.();
  }, [host, onStateChange]);
```

修改 `disablePlugin`:
```tsx
  const disablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.disablePlugin(pluginId));
    onStateChange?.();
  }, [host, onStateChange]);
```

- [ ] **Step 3: 验证编译**

```bash
pnpm --filter @hexo-cms/ui typecheck
```

- [ ] **Step 4: Commit & Push**

```bash
git add packages/ui/src/plugin/plugin-provider.tsx
git commit -m "feat(i18n): add onStateChange callback to PluginProvider"
git push
```

---

### Task 9: Web/Desktop root 合并插件翻译

**Files:** `packages/web/src/routes/__root.tsx` (MODIFY), `packages/desktop/src/renderer/src/routes/__root.tsx` (MODIFY)

#### 9a: Web __root.tsx

- [ ] **Step 1: 添加 pluginTranslationVersion state**

在 `const [pluginHost, setPluginHost] = ...` 之后：
```tsx
const [pluginTranslationVersion, setPluginTranslationVersion] = useState(0);
```

- [ ] **Step 2: 修改 i18nConfig 以合并插件翻译**

```tsx
const i18nConfig = useMemo(() => {
  const pluginTranslations = pluginHost?.collectPluginTranslations() ?? {};
  return {
    locales: ["zh", "en"] as const,
    defaultLocale: "zh" as const,
    resources: {
      zh: { ...(pluginTranslations.zh ?? {}) },
      en: { ...(pluginTranslations.en ?? {}) },
    },
  };
}, [pluginHost, pluginTranslationVersion]);
```

- [ ] **Step 3: 在 PluginProvider 上绑定回调**

```tsx
<PluginProvider
  host={pluginHost}
  onStateChange={() => setPluginTranslationVersion(v => v + 1)}
>
```

#### 9b: Desktop __root.tsx

- [ ] **Step 4: 同样修改 Desktop __root.tsx**

同 9a 的步骤 1-3，使用 `useState(0)` 作为 version counter，传递给 PluginProvider。

- [ ] **Step 5: 验证编译**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit & Push**

```bash
git add packages/web/src/routes/__root.tsx packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat(i18n): merge plugin translations into I18nConfig"
git push
```

---

## Phase 3: 试点迁移（Sidebar + 语言切换入口）

### Task 10: 内置翻译资源

**Files:** `packages/ui/src/i18n/translations/zh.ts` (NEW), `packages/ui/src/i18n/translations/en.ts` (NEW)

- [ ] **Step 1: 创建 `packages/ui/src/i18n/translations/zh.ts`**

```ts
export const zh = {
  common: {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    confirm: "确认",
    loading: "加载中...",
    error: "出错了",
    noData: "暂无数据",
    search: "搜索...",
    actions: "操作",
    back: "返回",
    create: "新建",
    edit: "编辑",
    close: "关闭",
    submit: "提交",
    reset: "重置",
    filter: "筛选",
    clear: "清除",
    all: "全部",
    none: "无",
    enabled: "已启用",
    disabled: "已禁用",
  },
  sidebar: {
    dashboard: "数据大盘",
    posts: "文章管理",
    pages: "页面管理",
    tags: "标签 & 分类",
    media: "媒体管理",
    themes: "主题管理",
    menus: "菜单管理",
    deploy: "部署管理",
    settings: "站点设置",
    comments: "评论管理",
    content: "内容",
    site: "站点",
  },
  topbar: {
    search: "搜索命令...",
    language: "语言",
  },
};
```

- [ ] **Step 2: 创建 `packages/ui/src/i18n/translations/en.ts`**

```ts
export const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading...",
    error: "Something went wrong",
    noData: "No data",
    search: "Search...",
    actions: "Actions",
    back: "Back",
    create: "Create",
    edit: "Edit",
    close: "Close",
    submit: "Submit",
    reset: "Reset",
    filter: "Filter",
    clear: "Clear",
    all: "All",
    none: "None",
    enabled: "Enabled",
    disabled: "Disabled",
  },
  sidebar: {
    dashboard: "Dashboard",
    posts: "Posts",
    pages: "Pages",
    tags: "Tags & Categories",
    media: "Media",
    themes: "Themes",
    menus: "Menus",
    deploy: "Deploy",
    settings: "Settings",
    comments: "Comments",
    content: "Content",
    site: "Site",
  },
  topbar: {
    search: "Search commands...",
    language: "Language",
  },
};
```

- [ ] **Step 3: 更新 web/desktop __root.tsx 的 i18nConfig 以包含内置翻译**

在 web `__root.tsx` 中导入：
```tsx
import { I18nProvider } from "@hexo-cms/ui";
import { zh } from "@hexo-cms/ui/i18n/translations/zh";
import { en } from "@hexo-cms/ui/i18n/translations/en";
```

但这样导入可能有问题——`@hexo-cms/ui/i18n/translations/zh` 路径可能需要 exports 配置。改为直接从相对路径导入或通过 index 重新导出。

**方案**：在 `packages/ui/src/i18n/index.ts` 中导出：
```ts
export { zh } from "./translations/zh";
export { en } from "./translations/en";
```

然后在 web/desktop root 中：
```tsx
import { zh, en } from "@hexo-cms/ui"; // 或 from "@hexo-cms/ui/i18n"
```

修改 i18nConfig：
```tsx
const i18nConfig = useMemo(() => {
  const pluginTranslations = pluginHost?.collectPluginTranslations() ?? {};
  return {
    locales: ["zh", "en"] as const,
    defaultLocale: "zh" as const,
    resources: {
      zh: { ...zh, ...(pluginTranslations.zh ?? {}) },
      en: { ...en, ...(pluginTranslations.en ?? {}) },
    },
  };
}, [pluginHost, pluginTranslationVersion]);
```

- [ ] **Step 4: 同样更新 desktop __root.tsx**

同 Step 3。

- [ ] **Step 5: 验证编译**

```bash
pnpm typecheck
```

- [ ] **Step 6: Commit & Push**

```bash
git add packages/ui/src/i18n/translations/ packages/ui/src/i18n/index.ts \
        packages/web/src/routes/__root.tsx packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat(i18n): add built-in zh/en translation resources"
git push
```

---

### Task 11: 迁移 Sidebar 到 i18n

**Files:** `packages/ui/src/components/layout/Sidebar.tsx` (MODIFY)

- [ ] **Step 1: 导入 useI18n**

```tsx
import { useI18n } from "../../i18n/I18nProvider";
```

- [ ] **Step 2: 在 Sidebar 函数中使用 useI18n**

```tsx
export function Sidebar({ collapsed = false, onToggle, pluginItems = [] }: SidebarProps) {
  const { t } = useI18n();
  // ...
```

- [ ] **Step 3: 替换 navItems 中的硬编码中文**

将 `navItems` 数组改为使用 `t()` 函数：

```tsx
const routerState = useRouterState();
const pathname = routerState.location.pathname;

const navItems = useMemo(() => [
  {
    group: t("sidebar.content"),
    items: [
      { icon: LayoutDashboard, label: t("sidebar.dashboard"), to: "/" },
      { icon: FileText, label: t("sidebar.posts"), to: "/posts" },
      { icon: Tags, label: t("sidebar.tags"), to: "/tags" },
      { icon: Image, label: t("sidebar.media"), to: "/media" },
    ],
  },
  {
    group: t("sidebar.site"),
    items: [
      { icon: Palette, label: t("sidebar.themes"), to: "/themes" },
      { icon: Menu, label: t("sidebar.menus"), to: "/menus" },
      { icon: FolderOpen, label: t("sidebar.pages"), to: "/pages" },
      { icon: GitBranch, label: t("sidebar.deploy"), to: "/deploy" },
      { icon: Settings, label: t("sidebar.settings"), to: "/settings" },
    ],
  },
], [t]);
```

**注意**：原来的 `navItems` 是模块级常量。改为 `useMemo` 后放到组件内部，依赖 `t`。确保 `t` 是 useCallback 创建的稳定引用。

- [ ] **Step 4: 验证编译**

```bash
pnpm --filter @hexo-cms/ui typecheck
```

- [ ] **Step 5: Commit & Push**

```bash
git add packages/ui/src/components/layout/Sidebar.tsx
git commit -m "feat(i18n): migrate Sidebar to useI18n"
git push
```

---

### Task 12: 添加语言切换入口（Topbar）

**Files:** `packages/ui/src/components/layout/Topbar.tsx` (MODIFY)

- [ ] **Step 1: 导入 useI18n 和 Globe 图标**

```tsx
import { Sun, Moon, Bell, Search, Menu, Globe } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
```

- [ ] **Step 2: 在 Topbar 中使用 useI18n**

```tsx
export function Topbar({ title, isElectron, onMenuToggle, showSearch = true, authClient, onSignedOut }: TopbarProps) {
  const { t, locale, setLocale } = useI18n();
  // ...
```

- [ ] **Step 3: 在主题切换按钮旁边添加语言切换按钮**

在现有的 Dark/Light 主题切换按钮旁边添加语言切换按钮：

```tsx
{/* 语言切换 */}
<button
  onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
  className="p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
  title={t("topbar.language")}
>
  <Globe className="w-4 h-4" />
  <span className="ml-1 text-xs font-medium uppercase">{locale}</span>
</button>
```

- [ ] **Step 4: 验证编译**

```bash
pnpm --filter @hexo-cms ui typecheck
```

- [ ] **Step 5: Commit & Push**

```bash
git add packages/ui/src/components/layout/Topbar.tsx
git commit -m "feat(i18n): add language switcher to Topbar"
git push
```

---

## Phase 4: 插件翻译示例

### Task 13: 为 SEO Inspector 插件添加翻译

**Files:** `packages/plugins/seo-inspector/src/manifest.ts` (MODIFY)

- [ ] **Step 1: 在 manifest 的 contributes 中添加 translations**

```ts
contributes: {
  // ... 已有贡献
  translations: {
    zh: {
      "seo.post.title": "SEO 检查",
      "seo.post.missingTitle": "缺少标题",
      "seo.post.titleHint": "在 frontmatter 中添加 title 字段",
      "seo.post.noDescription": "缺少描述",
      "seo.post.descHint": "在 frontmatter 中添加 description 字段",
      "seo.site.title": "站点 SEO 概览",
      "seo.site.noSitemap": "未找到 sitemap",
    },
    en: {
      "seo.post.title": "SEO Check",
      "seo.post.missingTitle": "Missing title",
      "seo.post.titleHint": "Add a title field in frontmatter",
      "seo.post.noDescription": "Missing description",
      "seo.post.descHint": "Add a description field in frontmatter",
      "seo.site.title": "Site SEO Overview",
      "seo.site.noSitemap": "Sitemap not found",
    },
  },
},
```

- [ ] **Step 2: 验证编译**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit & Push**

```bash
git add packages/plugins/seo-inspector/src/manifest.ts
git commit -m "feat(i18n): add translations to SEO Inspector plugin manifest"
git push
```
