# Hexo CMS 插件开发指南

> **版本**: 1.0.0
> **最后更新**: 2026-05-19
> **适用版本**: hexo-cms >= 0.1.0
> **目标读者**: AI 助手、插件开发者

---

## 目录

1. [概述](#1-概述)
2. [快速上手](#2-快速上手)
3. [PluginManifest 清单](#3-pluginmanifest-清单)
4. [PluginDefinition 定义](#4-plugindefinition-定义)
5. [PluginRuntimeContext 运行时上下文](#5-pluginruntimecontext-运行时上下文)
6. [贡献类型详解](#6-贡献类型详解)
7. [权限模型](#7-权限模型)
8. [完整示例分析](#8-完整示例分析)
9. [测试插件](#9-测试插件)
10. [插件注册与加载](#10-插件注册与加载)

---

## 1. 概述

Hexo CMS 插件系统是一个**声明式扩展框架**。插件通过 manifest 文件声明自己的身份、权限和贡献点，通过 `definePlugin` 将声明与运行时实现绑定。

### 核心概念

| 概念 | 说明 |
|------|------|
| `PluginManifest` | 插件的身份证明和能力声明，纯数据，无运行逻辑 |
| `PluginDefinition` | manifest + 运行时工厂函数，将声明与实现绑定 |
| `PluginCatalog` | 发现、校验、索引所有插件定义 |
| `PluginHost` | 运行时编排器，管理插件的启用/停用生命周期 |
| `PluginRuntimeContext` | 插件运行时注入的上下文，提供 storage/secrets/http/logger 等能力 |

### 设计特点

- **声明式贡献**：UI 入口、设置面板、命令、诊断等都在 manifest 中声明，宿主系统负责渲染
- **显式授权**：插件默认无权访问任何宿主能力，所有权限通过 `permissions` 字段逐一声明
- **错误隔离**：单个插件失败不影响核心页面和其他插件（错误阈值：连续 3 次失败自动进入 error 状态）
- **同构定义**：Web 和 Desktop 共享完全相同的插件定义，平台差异在宿主层处理

---

## 2. 快速上手

### 最小可工作插件

```
packages/plugins/my-plugin/
├── package.json
├── src/
│   ├── index.ts          # 插件入口，导出 manifest + plugin
│   ├── manifest.ts       # 插件清单
│   └── plugin.ts         # 插件定义（绑定运行时实现）
```

**Step 1: 创建 package.json**

```json
{
  "name": "@hexo-cms/plugin-my-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@hexo-cms/core": "workspace:*"
  },
  "peerDependencies": {
    "react": "catalog:react",
    "react-dom": "catalog:react"
  }
}
```

**Step 2: 编写 manifest.ts**

```ts
import type { PluginManifest } from "@hexo-cms/core";

export const MY_PLUGIN_ID = "hexo-cms-my-plugin";

export const myPluginManifest: PluginManifest = {
  id: MY_PLUGIN_ID,
  name: "My Plugin",
  version: "0.1.0",
  description: "一个示例插件。",
  origin: "official",
  runtime: "hosted",
  permissions: ["ui.contribute"],
  contributes: {
    dashboardWidgets: [
      {
        id: "my.widget",
        title: "我的小部件",
        renderer: "my.widget",
        size: "medium",
      },
    ],
  },
};
```

**Step 3: 编写 plugin.ts**

```ts
import { definePlugin } from "@hexo-cms/core";
import { MyWidget } from "./widgets/my-widget";
import { myPluginManifest } from "./manifest";

export const myPlugin = definePlugin({
  manifest: myPluginManifest,
  defaultEnabled: true,
  renderers: {
    "my.widget": MyWidget,  // React 组件
  },
});
```

**Step 4: 编写 index.ts**

```ts
export * from "./manifest";
export * from "./plugin";
```

**Step 5: 注册到官方插件列表**

在 `packages/plugins/src/official.ts` 中添加：

```ts
import { myPlugin } from "@hexo-cms/plugin-my-plugin";

export const officialPlugins = [
  // ... 已有插件
  myPlugin,
];
```

---

## 3. PluginManifest 清单

`PluginManifest` 是插件的静态描述，不包含任何运行时代码。

```ts
interface PluginManifest {
  id: string;                          // 唯一标识，正则：/^[a-z0-9][a-z0-9-_.]+$/
  name: string;                        // 显示名称
  version: string;                     // 版本号，如 "0.1.0"
  description: string;                 // 功能描述
  origin: PluginOrigin;                // 来源："official" | "local-dev" | "private" | "marketplace"
  runtime: PluginRuntime;              // 运行模式："hosted" | "worker" | "iframe"
  engine?: { hexoCms?: string };       // 引擎版本约束，如 ">=0.1.0"
  activation?: PluginActivationEvent[];// 激活条件
  permissions: PluginPermission[];     // 权限列表（见第 7 节）
  network?: { allowedHosts: string[] };// 网络白名单（声明 network.fetch 时必填）
  contributes?: PluginContributions;   // 贡献声明（见第 6 节）
}
```

### id 命名规范

- 前缀 `hexo-cms-`，后接连字符分隔的标识符
- 只允许小写字母、数字、连字符、下划线和点号
- 示例：`hexo-cms-attachments-helper`、`hexo-cms-seo-inspector`

### origin

| 值 | 含义 |
|----|------|
| `"official"` | 随应用发布的官方插件 |
| `"local-dev"` | 本地开发插件（仅 DEV 模式加载） |
| `"private"` | 企业/团队私有插件 |
| `"marketplace"` | 插件市场来源（预留） |

### runtime

目前仅支持 `"hosted"`（运行在主线程）。`"worker"` 和 `"iframe"` 为预留的沙箱模式。

### activation

插件触发激活的页面/时机。目前为声明式标注，后续版本将实现按需激活。

| 值 | 含义 |
|----|------|
| `"onStartup"` | 应用启动时激活 |
| `"onDashboard"` | 首次访问仪表盘时激活 |
| `"onMedia"` | 访问媒体页时激活 |
| `"onSettings"` | 访问设置页时激活 |

---

## 4. PluginDefinition 定义

`PluginDefinition` 将 manifest 与运行时实现绑定在一起。

```ts
interface PluginDefinition<TRenderer = unknown> {
  manifest: PluginManifest;
  defaultEnabled?: boolean;
  renderers?: Record<string, TRenderer>;
  commands?: Record<string, PluginRuntimeFactory<PluginCommandHandler>>;
  diagnostics?: Record<string, PluginRuntimeFactory<DiagnosticsHandler>>;
  events?: Record<string, PluginRuntimeFactory<PluginEventHandler>>;
}
```

### definePlugin

`definePlugin` 是一个类型辅助函数，提供完整的类型推断：

```ts
import { definePlugin } from "@hexo-cms/core";

const plugin = definePlugin({
  manifest: { /* ... */ },
  defaultEnabled: true,
  renderers: { /* ... */ },
  commands: { /* ... */ },
  diagnostics: { /* ... */ },
  events: { /* ... */ },
});
// plugin 的类型自动推断为 PluginDefinition<ComponentType>
```

### PluginRuntimeFactory 模式

`renderers` 的值是直接的渲染组件，而 `commands`、`diagnostics`、`events` 的值是**工厂函数**：

```ts
type PluginRuntimeFactory<T> = (context: PluginRuntimeContext) => T;
```

工厂函数在插件**启用时**被调用，接收 `PluginRuntimeContext`，返回初始化后的处理器。这确保了：

- 处理器在插件状态变为 "enabled" 之前不会被创建
- 每个插件拥有独立的上下文（存储、密钥、日志等）
- 插件停用时，工厂生产的处理器会被统一清理

---

## 5. PluginRuntimeContext 运行时上下文

插件工厂函数接收的上下文对象提供以下 API：

```ts
interface PluginRuntimeContext {
  readonly plugin: PluginManifest;      // 当前插件的 manifest（只读参考）
  readonly content: ContentReadAPI;     // 只读内容访问
  readonly storage: PluginStorageAPI;   // 插件专属键值存储
  readonly secrets: PluginSecretAPI;    // 插件专属密钥存储
  readonly events: PluginEventAPI;      // 事件订阅
  readonly http: PluginHttpAPI;         // 安全 HTTP 请求
  readonly logger: PluginLogger;        // 日志记录
  getConfig(): PluginConfigValue;       // 获取用户在当前插件的设置
}
```

### ContentReadAPI — 只读内容访问

```ts
interface ContentReadAPI {
  getPosts(): Promise<HexoPost[]>;
  getPages(): Promise<HexoPost[]>;
  getTags(): Promise<TagsResponse>;
  getMediaFiles(): Promise<MediaFile[]>;
  getStats(): Promise<StatsResponse>;
}
```

> 需要权限：`content.read`

### PluginStorageAPI — 键值存储

```ts
interface PluginStorageAPI {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}
```

- 数据按插件 ID 隔离，不同插件之间无法互相读取
- 值类型为 `PluginStorageJsonValue`（JSON 可序列化类型）
- 需要 `pluginStorage.read` 读取，`pluginStorage.write` 写入

**使用示例：**

```ts
// 在事件处理器中使用
events: {
  "post.afterSave": ({ storage }) => async (event) => {
    const count = (await storage.get<number>("saveCount")) ?? 0;
    await storage.set("saveCount", count + 1);
  },
},
```

### PluginSecretAPI — 密钥存储

```ts
interface PluginSecretAPI {
  has(key: string): Promise<boolean>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

- 注意：**没有 `get` 方法**——密钥一旦写入不可读取，只能检查是否存在
- 需要 `pluginSecret.read` 检查，`pluginSecret.write` 写入/删除

### PluginHttpAPI — 安全 HTTP 请求

```ts
interface PluginHttpAPI {
  fetch<T = unknown>(url: string, options?: PluginHttpRequestOptions): Promise<T>;
}
```

**安全约束：**
1. 需要 `network.fetch` 权限
2. 需要 `manifest.network.allowedHosts` 声明允许的主机
3. 只允许 HTTPS 协议
4. 主机名必须匹配白名单（支持 `*.domain.com` 通配符）
5. Cookie/Set-Cookie 头自动剥离

**使用示例：**

```ts
// manifest 中声明
network: { allowedHosts: ["api.github.com"] },

// 运行时使用
commands: {
  "fetch.repos": ({ http }) => async () => {
    const data = await http.fetch("https://api.github.com/repos/octocat/hello-world");
    return data;
  },
},
```

### PluginLogger — 日志记录

```ts
interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

- 日志按插件 ID 隔离
- 每个插件默认保留最近 50 条日志
- 日志内容自动脱敏（移除 token、密钥、文件路径等敏感信息）

### PluginEventAPI — 事件订阅

```ts
interface PluginEventAPI {
  on<TPayload>(eventName: PluginEventName, handler: PluginEventHandler<TPayload>): PluginEventSubscription;
}

interface PluginEventSubscription {
  dispose(): void;  // 取消订阅
}
```

---

## 6. 贡献类型详解

### 6.1 DashboardWidget — 仪表盘小部件

显示在 `/` 仪表盘页面。

**Manifest 声明：**

```ts
dashboardWidgets: [
  {
    id: "my.stats",              // 唯一 ID
    title: "数据统计",            // 显示标题
    renderer: "my.stats",        // 对应 PluginDefinition.renderers 中的 key
    size: "small" | "medium" | "large",  // 尺寸
    order: 50,                   // 排序（数字越小越靠前，默认 100）
  },
],
```

**实现：**

```ts
// plugin.ts
renderers: {
  "my.stats": MyStatsWidget,  // React 组件，接收 { config?: PluginConfigValue }
},
```

插件启用后，渲染器会被注册到 PluginHost。UI 层通过 `getDashboardWidgetRenderer(widget)` 获取组件，当插件停用时自动移除。

### 6.2 SettingsPanel — 设置面板

显示在 `/settings` 插件设置区。

**Manifest 声明：**

```ts
settingsPanels: [
  {
    id: "my.settings",           // 唯一 ID
    title: "我的插件设置",        // 面板标题
    schema: "my.settings",       // 引用 settingsSchemas 中的 key
  },
],
settingsSchemas: {
  "my.settings": {
    id: "my.settings",
    fields: [
      {
        key: "apiEndpoint",             // 配置项的 key（存入 config 的键名）
        label: "API 端点",              // 显示标签
        type: "string",                 // 类型
        defaultValue: "https://api.example.com",
        placeholder: "请输入 API 地址",
        description: "插件将调用此 API 获取数据",
        required: true,
      },
      {
        key: "enableNotifications",
        label: "启用通知",
        type: "boolean",                // 布尔类型——渲染为开关
        defaultValue: true,
      },
      {
        key: "logLevel",
        label: "日志级别",
        type: "select",                 // 下拉选择
        defaultValue: "info",
        options: [
          { label: "调试", value: "debug" },
          { label: "信息", value: "info" },
          { label: "警告", value: "warn" },
        ],
      },
      {
        key: "apiKey",
        label: "API Key",
        type: "password",               // 密码类型——输入框掩码
        placeholder: "sk-...",
      },
    ],
  },
},
```

**字段类型一览：**

| type | 渲染形式 | defaultValue 类型 |
|------|---------|------------------|
| `"string"` | 文本输入框 | string |
| `"password"` | 密码输入框（掩码） | string |
| `"boolean"` | 开关组件 | boolean |
| `"select"` | 下拉选择（需提供 options） | string |
| `"url"` | URL 输入框 | string |

**运行时读取配置：**

```ts
// 在插件的任何运行时处理器中使用 getConfig()
commands: {
  "my.fetch": ({ getConfig }) => async () => {
    const config = getConfig();
    const endpoint = config.apiEndpoint as string;
    // ...
  },
},
```

### 6.3 SidebarItem — 侧边栏入口

**Manifest 声明：**

```ts
sidebarItems: [
  {
    id: "my.entry",
    title: "我的插件",
    target: "plugin.settings",    // 跳转到插件设置面板
    // 或 target: "/comments"     // 跳转到指定路由
  },
],
```

### 6.4 Command — 命令

可在 UI 层通过 `executePluginCommand(pluginId, commandId, args)` 调用。

**Manifest 声明：**

```ts
commands: [
  {
    id: "my.copyLink",            // 命令 ID
    title: "复制链接",            // 显示名称
  },
],
```

**实现：**

```ts
commands: {
  "my.copyLink": () => async ({ args }) => {
    // PluginCommandHandler
    // context: { pluginId, commandId, command: RegisteredCommand, args: unknown[] }
    const url = typeof args[0] === "string" ? args[0] : "";
    if (!url) throw new Error("URL is required.");
    await navigator.clipboard.writeText(url);
    return url;  // 返回值存入 PluginCommandExecutionResult.value
  },
},
```

**错误处理约定：**

- 命令抛出异常 → 返回 `{ ok: false, error: { code: "PLUGIN_COMMAND_FAILED", message } }`
- 缺少权限 → 返回 `{ ok: false, error: { code: "PLUGIN_PERMISSION_DENIED", message } }`
- 未注册处理器 → 返回 `{ ok: false, error: { code: "PLUGIN_COMMAND_HANDLER_MISSING", message } }`

### 6.5 Diagnostics — 诊断

在文章编辑、站点级别运行 SEO/质量检查。

**Manifest 声明：**

```ts
diagnostics: [
  {
    id: "my.post-checks",         // 诊断 ID
    title: "文章质量检查",         // 显示标题
    scope: "post",                // "post" | "page" | "site"
    description: "检查标题长度和摘要完整性",
  },
],
```

**实现：**

```ts
diagnostics: {
  "my.post-checks": ({ getConfig }) => async ({ target, content }) => {
    // DiagnosticsHandlerContext: { pluginId, contributionId, target, content }
    const issues: DiagnosticsIssue[] = [];

    if (target.scope === "post" && target.post) {
      if (!target.post.title || target.post.title.length < 10) {
        issues.push({
          id: "my.title.too-short",
          severity: "warn",
          field: "title",
          message: "标题过短，建议不少于 10 个字符",
          hint: "添加更具描述性的标题",
        });
      }
    }

    return issues;
  },
},
```

**DiagnosticsIssue 字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 问题唯一标识 |
| `severity` | `"info" \| "warn" \| "error"` | 是 | 严重程度 |
| `message` | string | 是 | 问题描述 |
| `field` | string | 否 | 关联字段名 |
| `hint` | string | 否 | 修复建议 |

### 6.6 Event — 事件订阅

订阅应用内置事件，在特定时机触发自定义逻辑。

**Manifest 声明：**

```ts
events: [
  {
    name: "post.afterSave",       // 事件名
    description: "文章保存后更新缓存",
  },
],
```

**实现：**

```ts
events: {
  "post.afterSave": ({ getConfig, storage }) => async (event) => {
    // event: PluginEvent<TPayload> { name, payload, at }
    const post = (event.payload as { post?: HexoPost }).post;
    if (!post) return;

    const alerts = (await storage.get("alerts")) ?? [];
    alerts.push({ title: post.title, checkedAt: new Date().toISOString() });
    await storage.set("alerts", alerts);
  },
},
```

**内置事件名：**

| 事件名 | Payload 类型 | 触发时机 |
|--------|-------------|---------|
| `post.afterSave` | `{ post: HexoPost }` | 文章保存后 |
| `post.afterDelete` | `{ path: string }` | 文章删除后 |
| `page.afterSave` | `{ page: HexoPost }` | 页面保存后 |
| `page.afterDelete` | `{ path: string }` | 页面删除后 |
| `media.afterUpload` | `{ file: MediaFile }` | 媒体上传后 |
| `media.afterDelete` | `{ path: string }` | 媒体删除后 |
| `deploy.afterTrigger` | `{ deployment: object }` | 部署触发后 |
| `deploy.statusChange` | `{ status: string }` | 部署状态变更 |

> 也支持自定义事件名（任意字符串）。

### 6.7 UiFlag — UI 功能标记

在当前版本中用于控制媒体页面的文档筛选和搜索功能。

```ts
uiFlags: [
  { id: "media-document-filter", flag: "media.documentFilter", title: "文档筛选", order: 10 },
  { id: "media-search",          flag: "media.search",        title: "媒体搜索", order: 20 },
],
```

当插件启用时，UI 层通过检查 `snapshot.extensions.uiFlags` 来决定是否显示相关功能。

---

## 7. 权限模型

所有插件能力通过**显式声明权限**来申请，未声明的权限操作将抛出 `PluginPermissionError`。

| 权限 | 授予的能力 |
|------|-----------|
| `content.read` | 读取文章、页面、标签、媒体文件、统计数据 |
| `config.read` | 读取全局配置（预留，暂未强制执行） |
| `pluginStorage.read` | 读取插件自身键值存储 |
| `pluginStorage.write` | 写入/删除插件自身键值存储 |
| `pluginSecret.read` | 检查密钥是否存在 |
| `pluginSecret.write` | 写入/删除密钥 |
| `pluginConfig.write` | 通过 UI 修改插件设置 |
| `ui.contribute` | 贡献仪表盘小部件、设置面板、侧边栏、UI 标记 |
| `command.register` | 注册和执行命令 |
| `event.subscribe` | 订阅事件总线事件 |
| `network.fetch` | 发起 HTTP 请求（**需同时声明 `network.allowedHosts`**） |

### 权限与贡献的对应关系

| 贡献类型 | 所需权限 |
|---------|---------|
| dashboardWidgets | `ui.contribute` |
| settingsPanels | `ui.contribute` |
| sidebarItems | `ui.contribute` |
| uiFlags | `ui.contribute` |
| commands | `command.register` |
| diagnostics | `content.read` |
| events | `event.subscribe` |
| 使用 storage API | `pluginStorage.read` / `pluginStorage.write` |
| 使用 secret API | `pluginSecret.read` / `pluginSecret.write` |
| 使用 http API | `network.fetch` |

---

## 8. 完整示例分析

### 8.1 Attachments Helper — 最全面的示例

**文件结构：**

```
packages/plugins/attachments-helper/
├── package.json              # 依赖声明
└── src/
    ├── index.ts              # 重新导出
    ├── manifest.ts           # 清单 → dashboardWidget + settings + commands + uiFlags
    ├── plugin.ts             # 定义 → defaultEnabled + renderers + commands
    └── widgets/
        └── attachments-summary-widget.tsx   # React 组件
```

**manifest.ts 展示了以下贡献：**

- `dashboardWidgets`：在仪表盘显示附件概览
- `settingsPanels` + `settingsSchemas`：提供布尔型配置项
- `sidebarItems`：在侧边栏添加入口
- `commands`：复制附件链接的命令
- `uiFlags`：启用媒体页面的文档筛选和搜索功能

**plugin.ts 展示了运行时实现：**

```ts
commands: {
  "attachments.copyLink": () => async ({ args }) => {
    // 忽略 context，直接返回 async handler
    const value = typeof args[0] === "string" ? args[0] : "";
    if (!value) throw new Error("Attachment link is required.");
    await navigator.clipboard.writeText(value);
    return value;
  },
},
```

### 8.2 SEO Inspector — Diagnostics 示例

展示了如何实现 `diagnostics` 类型的工厂函数：

```ts
diagnostics: {
  "seo.post-checks": ({ getConfig }) => createSeoPostDiagnosticsHandler(getConfig),
  // { getConfig } 从 PluginRuntimeContext 解构
  // createSeoPostDiagnosticsHandler 返回一个 DiagnosticsHandler
  // 这样诊断处理器可以动态读取插件设置
},
```

### 8.3 Draft Coach — Event 示例

展示了如何订阅事件并进行跨调用状态追踪：

```ts
events: {
  "post.afterSave": ({ getConfig, storage }) => createDraftCoachEventHandler(getConfig, storage),
  // 事件处理器在每次 post.afterSave 时触发
  // storage 用于持久化草稿提醒列表
  // getConfig 用于读取用户设置的阈值
},
```

### 8.4 Comments Overview — HTTP + Command 示例

展示了有网络权限的插件配置：

```ts
manifest: {
  // ...
  permissions: ["network.fetch"],
  network: { allowedHosts: ["api.github.com"] },
  contributes: {
    commands: [{ id: "comments.openModeration", title: "Open comment management" }],
  },
}
```

```ts
commands: {
  "comments.openModeration": () => ({ args }) => {
    const url = typeof args[0] === "string" && args[0] ? args[0] : "/comments";
    if (typeof window !== "undefined") window.location.assign(url);
    return url;
  },
},
```

---

## 9. 测试插件

### 测试 Manifest 校验

```ts
import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "@hexo-cms/core";

describe("my plugin", () => {
  it("passes manifest validation", () => {
    expect(() => validatePluginManifest(myManifest)).not.toThrow();
  });

  it("declares origin and runtime", () => {
    expect(myManifest.origin).toBe("official");
    expect(myManifest.runtime).toBe("hosted");
  });
});
```

### 测试渲染器配置

```ts
it("provides renderer for every dashboard widget", () => {
  for (const widget of myManifest.contributes?.dashboardWidgets ?? []) {
    expect(myPlugin.renderers?.[widget.renderer]).toEqual(expect.any(Function));
  }
});
```

### 使用 PluginHost 测试运行时行为

```ts
import { PluginCatalog, PluginHost, definePlugin, MemoryPluginStateStore } from "@hexo-cms/core";

it("activates plugin commands", async () => {
  const plugin = definePlugin({
    manifest: { /* ... */ },
    commands: {
      "my.command": () => ({ args }) => `received: ${args[0]}`,
    },
    defaultEnabled: true,
  });

  const host = new PluginHost({
    catalog: new PluginCatalog([plugin]),
    stateStore: new MemoryPluginStateStore(),
    configStore: new MemoryPluginConfigStore(),
    storageStore: new MemoryPluginStorageStore(),
    secretStore: new MemoryPluginSecretStore(),
    logStore: new MemoryPluginLogStore(),
    dataProvider: mockDataProvider,
  });

  const result = await host.executePluginCommand("my-plugin-id", "my.command", ["hello"]);
  expect(result).toEqual({ ok: true, value: "received: hello" });
});
```

---

## 10. 插件注册与加载

### 插件包目录结构

```
packages/plugins/
├── package.json                  # @hexo-cms/plugins 聚合包
├── vitest.config.ts
└── src/
    ├── index.ts                  # re-export
    ├── official.ts               # officialPlugins 数组
    ├── local-dev.ts              # localDevPlugins 数组（DEV only）
    └── __tests__/
        └── official-plugins.test.tsx
```

### 注册官方插件

1. 在 `packages/plugins/` 下创建子目录
2. 在 `pnpm-workspace.yaml` 中确保包含 `packages/plugins/*`
3. 在聚合包 `package.json` 中添加依赖
4. 在 `src/official.ts` 中将插件添加到 `officialPlugins` 数组

### 注册本地开发插件

在 `src/local-dev.ts` 中添加：

```ts
export const localDevPlugins: PluginDefinition[] = [
  myDevPlugin,  // 仅在 import.meta.env.DEV 时加载
];
```

### 加载流程

```
1. Web/Desktop root 创建 PluginHost
2. PluginHost 调用 PluginCatalog.discover([
     StaticPluginSourceResolver("official", officialPlugins),
     StaticPluginSourceResolver("local-dev", localDevPlugins, { enabled: import.meta.env.DEV }),
   ])
3. PluginCatalog 校验所有 manifest，拒绝非 hosted runtime
4. PluginHost 创建 PluginManager，传入 defaultEnabledPluginIds
5. PluginManager 将 defaultEnabled 的插件状态设为 "enabled"
6. PluginHost.syncRuntimeContributions() 注册渲染器和运行时处理器
7. UI 层通过 snapshot.extensions 读取贡献，通过 getDashboardWidgetRenderer 获取组件
```

---

## 附录 A：错误类型速查

| 错误类 | code | 触发条件 |
|--------|------|---------|
| `PluginManifestError` | `PLUGIN_MANIFEST_INVALID` | manifest 校验失败 |
| `PluginPermissionError` | `PLUGIN_PERMISSION_DENIED` | 未声明的权限操作 |
| `PluginNotFoundError` | `PLUGIN_NOT_FOUND` | 查找不存在的插件 ID |

命令执行结果错误码：

| code | 含义 |
|------|------|
| `PLUGIN_COMMAND_NOT_FOUND` | 命令未注册或插件已停用 |
| `PLUGIN_COMMAND_HANDLER_MISSING` | 有声明但未注册运行时处理器 |
| `PLUGIN_COMMAND_FAILED` | 处理器抛出异常 |
| `PLUGIN_PERMISSION_DENIED` | 缺少 command.register 权限 |

---

## 附录 B：检查清单

在发布一个插件之前，逐项检查：

### Manifest

- [ ] `id` 符合正则 `/^[a-z0-9][a-z0-9-_.]+$/`，前缀 `hexo-cms-`
- [ ] `origin` 为有效值，`runtime` 为 `"hosted"`
- [ ] `permissions` 包含所有使用的 API 所需的权限
- [ ] 声明 `network.fetch` 时，`network.allowedHosts` 有至少一个条目
- [ ] 每个 `dashboardWidget.renderer` 在 `PluginDefinition.renderers` 中都有对应实现
- [ ] 每个 `settingsPanel.schema` 在 `settingsSchemas` 中都有对应 schema 定义

### 运行时

- [ ] 命令处理器正确使用 `PluginRuntimeFactory` 模式
- [ ] 诊断处理器正确使用 `DiagnosticsHandler` 签名
- [ ] 事件处理器正确使用 `PluginEventHandler` 签名

### 合规

- [ ] 插件不直接访问 `fetch()` / `localStorage` / `window.electronAPI`
- [ ] 所有外部调用通过 PluginRuntimeContext 提供的 API
- [ ] 不硬编码敏感信息（密钥、Token），使用 PluginSecretAPI
