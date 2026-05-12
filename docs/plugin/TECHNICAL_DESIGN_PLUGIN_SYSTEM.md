# Hexo CMS 插件系统技术方案

> **版本**: 1.3.0
> **最后更新**: 2026-05-12
> **状态**: v0.2 平台持久化与受控网络代理已全部落地，继续设计沙箱方向
> **关联 PRD**: [PRD_PLUGIN_SYSTEM.md](./PRD_PLUGIN_SYSTEM.md)

---

## 1. 目标与原则

本方案定义 Hexo CMS 插件系统的首版技术实现。首版面向可信内置插件，优先建立稳定的扩展点、权限拦截和错误隔离，不在首版开放任意第三方代码执行。

设计原则:

1. 插件默认无权访问宿主内部实现。
2. 插件 API 以 capability 为单位显式授权。
3. UI 贡献优先声明式，避免插件直接注入 React 组件。
4. Web 与 Desktop 共享插件类型、manifest、权限模型和 UI 扩展协议。
5. 插件失败不得影响核心页面。
6. 后续沙箱能力通过同一 PluginHost 协议演进。

---

## 2. 架构概览

```text
packages/core
  plugin/
    types.ts
    manifest.ts
    permissions.ts
    plugin-manager.ts
    extension-registry.ts
    builtin.ts
    errors.ts

packages/ui
  plugin/
    plugin-provider.tsx
    extension-outlet.tsx
    plugin-settings.tsx
    renderers/
      attachments-summary-widget.tsx
      comments-overview-widget.tsx
```

运行时分层:

1. `PluginManager`: 负责发现、校验、启用、停用、状态持久化。
2. `PluginHost`: 负责加载插件模块或执行插件贡献。
3. `PermissionBroker`: 负责所有 API 调用的权限校验。
4. `ExtensionRegistry`: 保存 UI、命令、事件等贡献点。
5. `ExtensionOutlet`: React 宿主组件，在固定位置渲染声明式贡献。

当前已实现:

1. `types.ts`: 插件 manifest、状态、权限、贡献点和只读 Content API 类型。
2. `manifest.ts`: 轻量运行时校验，当前未引入 Zod。
3. `permissions.ts`: `PermissionBroker.assert` 权限拦截。
4. `extension-registry.ts`: dashboard/settings/sidebar/command 贡献注册与清理。
5. `plugin-manager.ts`: 内存和浏览器 localStorage 状态/配置存储、启用/停用、配置更新、snapshot。
6. `builtin.ts`: Attachments Helper 与 Comments Overview 内置插件清单。
7. `plugin-provider.tsx`: UI 侧创建 PluginManager，并默认启用 Attachments Helper。
8. `plugin-settings.tsx`: 插件管理页与声明式 settings schema renderer。
9. `extension-outlet.tsx`: Dashboard widget renderer 映射，并向 renderer 注入插件配置。
10. Sidebar item 已挂载到 `CMSLayout`，插件入口可跳转 Settings 插件区。
11. `CommandRegistry`: 注册、执行、权限校验和错误返回。
12. `recordPluginError`: 连续错误计数与默认 3 次阈值熔断。
13. `plugin-storage.ts`: `PluginStorageAPI`、Memory/Browser store、`pluginId` namespace 隔离和 `pluginStorage.read/write` 权限校验。
14. `event-bus.ts`: `PluginEventAPI`、宿主事件派发、`event.subscribe` 权限校验和 handler 失败隔离。
15. `plugin-logger.ts` 与 `redaction.ts`: 插件日志 Memory/Browser store、`PluginLogger`、运行时日志脱敏与按 `pluginId` 过滤。
16. `PluginManager.snapshot()`: 每个插件暴露最近日志，Settings 插件卡片展示最近日志。
17. `plugin-event-data-provider.ts`: 在 UI DataProvider 层统一派发文章、页面、媒体和部署宿主事件。
18. Web/Desktop root route: 统一包裹 `PluginProvider`。

仍待实现:

1. `PluginHost` 独立运行时和消息协议。
2. Zod manifest schema。
3. Secret Store 平台持久化、受控网络代理平台适配和第三方插件沙箱。

---

## 3. 插件包模型

### 3.1 Manifest

首版 manifest 使用 `plugin.json`:

```json
{
  "id": "hexo-cms-comments-overview",
  "name": "Comments Overview",
  "version": "0.1.0",
  "description": "Show comments summary on dashboard.",
  "source": "builtin",
  "engine": {
    "hexoCms": ">=0.1.0"
  },
  "activation": [
    "onDashboard"
  ],
  "permissions": [
    "pluginConfig.write",
    "ui.contribute",
    "command.register"
  ],
  "contributes": {
    "dashboardWidgets": [
      {
        "id": "comments.overview",
        "title": "评论概览",
        "renderer": "builtin.comments.overview",
        "size": "medium",
        "order": 90
      }
    ],
    "sidebarItems": [
      {
        "id": "comments.entry",
        "title": "评论概览",
        "target": "plugin.settings"
      }
    ],
    "settingsPanels": [
      {
        "id": "comments.settings",
        "title": "评论概览",
        "schema": "comments.settings"
      }
    ],
    "settingsSchemas": {
      "comments.settings": {
        "id": "comments.settings",
        "fields": [
          {
            "key": "provider",
            "label": "评论服务",
            "type": "select",
            "defaultValue": "giscus",
            "options": [
              { "label": "Giscus", "value": "giscus" },
              { "label": "Waline", "value": "waline" }
            ]
          },
          {
            "key": "moderationUrl",
            "label": "评论后台 URL",
            "type": "url",
            "defaultValue": ""
          },
          {
            "key": "showPendingAlert",
            "label": "展示待审核提醒",
            "type": "boolean",
            "defaultValue": true
          }
        ]
      }
    },
    "commands": [
      {
        "id": "comments.openModeration",
        "title": "打开评论管理"
      }
    ]
  }
}
```

关键约束:

1. `id` 全局唯一，必须匹配 `/^[a-z0-9][a-z0-9-_.]+$/`。
2. `source` 首版只能是 `builtin` 或受开发配置保护的 `local-dev`。
3. `renderer` 首版只能引用宿主已注册的 renderer key。
4. `network.allowedHosts` 必须与 `network.fetch` 权限同时声明。
5. manifest 当前通过轻量 TypeScript 运行时校验；v0.2 可迁移到 Zod schema。
6. Web 生产环境不接受用户上传的本地插件包。

### 3.2 插件状态

```ts
type PluginState =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "incompatible";

interface PluginRecord {
  id: string;
  version: string;
  source: "builtin" | "local-dev";
  state: PluginState;
  enabledAt?: string;
  lastError?: PluginErrorSummary;
}
```

v0.1 状态存储:

1. Web 与 Desktop renderer 当前共用 `BrowserPluginStateStore`，存储在 `localStorage` 的 `hexo-cms:plugin-state`。
2. Web 与 Desktop renderer 当前共用 `BrowserPluginConfigStore`，存储在 `localStorage` 的 `hexo-cms:plugin-config`。
3. 单元测试使用 `MemoryPluginStateStore` 与 `MemoryPluginConfigStore`。

当前配置模型:

```ts
type PluginConfigFieldValue = string | boolean;
type PluginConfigValue = Record<string, PluginConfigFieldValue>;
type PluginConfigStoreValue = Record<string, PluginConfigValue>;

interface PluginConfigStore {
  load(): PluginConfigStoreValue;
  save(value: PluginConfigStoreValue): void;
}
```

`PluginManager.updatePluginConfig(pluginId, patch)` 负责合并配置并调用 `PermissionBroker.assert(pluginId, "pluginConfig.write", "plugin.config.write")`。`snapshot.plugins[*].config` 只暴露当前插件自己的配置，UI 层按 manifest id 注入到 dashboard renderer。

v0.2+ 目标状态:

1. Web storage 已通过 `/api/plugin/storage` 持久化到 SQLite `plugin_storage` 表。
2. Desktop storage 已通过 `plugin-storage:*` IPC 持久化到 Electron userData 的 `plugins/storage.json`。
3. 存储格式通过平台 DataStore 适配。
4. Secret 字段不进入 `PluginConfigStore`，只保存 secret 是否已配置和 Secret Store 引用。

---

## 4. 扩展点

### 4.1 首版扩展点

```ts
type ExtensionPoint =
  | "dashboard.widget"
  | "settings.panel"
  | "sidebar.item"
  | "command";
```

### 4.2 Dashboard Widget

```ts
interface DashboardWidgetContribution {
  pluginId: string;
  id: string;
  title: string;
  renderer: string;
  size: "small" | "medium" | "large";
  order?: number;
}
```

宿主通过 `ExtensionOutlet` 渲染:

```tsx
<ExtensionOutlet point="dashboard.widget" />
```

`renderer` 映射到宿主内置 renderer:

```ts
const builtInRenderers = {
  "builtin.attachments.summary": AttachmentsSummaryWidget,
  "builtin.comments.overview": CommentsOverviewWidget,
};
```

首版不接受插件提供的任意 React component。

### 4.3 Settings Panel

Settings panel 由 schema 驱动:

```ts
interface SettingsPanelContribution {
  pluginId: string;
  id: string;
  title: string;
  schema: string;
}

type PluginSettingsFieldType = "string" | "password" | "select" | "boolean" | "url";

interface PluginSettingsSchema {
  id: string;
  fields: PluginSettingsField[];
}

interface PluginSettingsField {
  key: string;
  label: string;
  type: PluginSettingsFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: string | boolean;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
}
```

schema 支持字段类型:

1. `string`
2. `password`
3. `select`
4. `boolean`
5. `url`

敏感字段使用 `password`，日志和错误上报中必须脱敏。

当前实现约束:

1. 内置插件通过 `manifest.contributes.settingsSchemas` 提供 schema。
2. `PluginSettingsPanel` 只在插件启用后渲染该插件的 settings panel。
3. 字段变更即时调用 `updatePluginConfig` 持久化，不提供单独保存按钮。
4. `password` 字段仅作为 UI 类型预留。涉及 API Key、token、webhook secret 时必须改用 Secret Store，不能写入普通配置。
5. 当前 schema renderer 只覆盖基础表单字段，不支持字段联动、条件展示、数组、嵌套对象和自定义 React 组件。

后续增强:

1. 添加 schema 校验与默认值归一化，避免配置中出现非法枚举值或错误类型。
2. 支持字段级 `secret: true`，只展示“已配置/未配置”，写入 Secret Store。
3. 支持 `helpUrl`、`validationPattern`、`min/max` 等轻量约束。
4. 支持配置导入/导出，但必须跳过 secret 明文。

### 4.4 Sidebar Item

首版 sidebar item 只允许跳转到插件设置页或宿主内置插件视图，不允许注册任意路由。

### 4.5 Command

```ts
interface CommandContribution {
  pluginId: string;
  id: string;
  title: string;
}
```

命令执行必须经过 `CommandRegistry.execute(pluginId, commandId)`，由 PermissionBroker 过滤。

---

## 5. Plugin API

### 5.1 API Surface

```ts
interface PluginContext {
  readonly plugin: PluginMetadata;
  readonly content: ContentReadAPI;
  readonly storage: PluginStorageAPI;
  readonly config: PluginConfigAPI;
  readonly ui: PluginUIAPI;
  readonly commands: CommandAPI;
  readonly events: EventAPI;
  readonly http: HttpAPI;
  readonly logger: PluginLogger;
}
```

### 5.2 ContentReadAPI

只读能力:

```ts
interface ContentReadAPI {
  getPosts(): Promise<HexoPost[]>;
  getPages(): Promise<HexoPost[]>;
  getTags(): Promise<TagsResponse>;
  getMediaFiles(): Promise<MediaFile[]>;
  getStats(): Promise<StatsResponse>;
}
```

首版不向插件暴露完整 `DataProvider`，也不暴露 `getToken`、`saveToken`、`deleteToken`、`savePost`、`deletePost`、`triggerDeploy`。

### 5.3 Storage 与 Config

```ts
interface PluginStorageAPI {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

interface PluginConfigAPI {
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}
```

隔离规则:

1. 存储 key 实际落库时自动加 `pluginId` namespace。
2. 插件不能读取其他插件配置。
3. 敏感配置字段不得写入普通配置存储，必须进入 Secret Store。

### 5.3.1 Secret Store

第三方 API Key、access token、webhook secret 等敏感字段统一通过 Secret Store 管理:

```ts
interface PluginSecretAPI {
  has(key: string): Promise<boolean>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

当前实现:

1. `PluginManager.createSecretAPI(pluginId)` 返回插件级 `PluginSecretAPI`。
2. `PluginSecretAPI` 只提供 `has/set/delete`，不提供读取明文 secret 的 API。
3. `pluginSecret.read` 控制 `has`，`pluginSecret.write` 控制 `set/delete`。
4. `MemoryPluginSecretStore` 用于当前 core 能力和测试，Web/Desktop 平台加密持久化待补齐。
5. secret key 按 `pluginId` namespace 隔离。

约束:

1. 插件 UI 只能读取 secret 是否已配置，不返回明文。
2. 普通 `plugin_config` 不保存明文 secret。
3. Secret key 自动按 `pluginId` 隔离。
4. 日志、错误、网络失败信息中必须脱敏 secret。
5. 没有 Secret Store 前，不发布需要 API Key 的插件。

### 5.4 HttpAPI

```ts
interface HttpAPI {
  fetch<T>(url: string, options?: RequestInit): Promise<T>;
}
```

限制:

1. 仅允许 HTTPS。
2. host 必须匹配 manifest 的 `network.allowedHosts`。
3. 禁止自动带上宿主 cookie。
4. 请求和响应体大小需要限制。
5. 超时默认 10 秒。

当前实现:

1. `PluginManager.createHttpAPI(pluginId)` 返回受控 `PluginHttpAPI`。
2. `network.fetch` 权限必需，且 manifest 必须声明 `network.allowedHosts`。
3. URL 必须是 HTTPS，host 支持精确匹配和 `*.example.com` 通配。
4. 请求默认 `credentials: "omit"`，并移除 `Cookie` / `Set-Cookie` 请求头。
5. 默认超时 10 秒，响应按 `content-type` 解析 JSON 或文本。
6. 平台级服务端代理、响应大小限制和审计日志待补齐。

### 5.5 Logger

日志必须自动注入 `pluginId`，并做敏感字段脱敏:

```ts
interface PluginLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
```

当前实现:

1. `PluginManager.createLogger(pluginId)` 返回插件级 `PluginLogger`。
2. `MemoryPluginLogStore` 用于测试和非浏览器场景，`BrowserPluginLogStore` 暂存到 `localStorage` 的 `hexo-cms:plugin-logs`。
3. `PluginManager.getPluginLogs(pluginId, limit)` 按插件读取日志，`snapshot.plugins[*].logs` 默认带最近 5 条日志。
4. `recordPluginError` 会同步写入 error 级日志，`executeCommand` 会记录命令成功和失败。
5. 日志 message、meta、Error stack 使用统一脱敏规则处理 token、cookie、API Key、secret、password 和本地路径。

---

## 6. 权限模型

### 6.1 权限枚举

```ts
type PluginPermission =
  | "content.read"
  | "config.read"
  | "pluginStorage.read"
  | "pluginStorage.write"
  | "pluginSecret.read"
  | "pluginSecret.write"
  | "pluginConfig.write"
  | "ui.contribute"
  | "command.register"
  | "network.fetch";
```

### 6.2 拦截规则

所有 Plugin API 实现必须通过:

```ts
permissionBroker.assert(pluginId, permission, operation);
```

拒绝时抛出:

```ts
class PluginPermissionError extends Error {
  code = "PLUGIN_PERMISSION_DENIED";
}
```

### 6.3 用户确认

启用插件前展示权限摘要。首版权限确认是插件启用确认的一部分，不实现细粒度开关。

### 6.4 禁止能力

以下能力在首版不存在 API:

1. 读取 OAuth token。
2. 执行 shell。
3. 写任意文件。
4. 写文章/页面/媒体。
5. 触发部署。
6. 注册任意路由。
7. 注入任意脚本到宿主页面。
8. 读取本地文件系统。
9. 上传或安装本地插件包。

---

## 7. 插件生命周期

### 7.1 状态流转

```text
discovered -> installed -> enabled
                         -> disabled
                         -> error
                         -> incompatible
```

### 7.2 生命周期流程

1. Discover: 扫描内置插件 manifest。
2. Validate: 当前使用轻量 TypeScript 运行时校验，后续迁移到 Zod manifest schema。
3. Register: 写入 PluginRegistry。
4. Enable: 用户确认权限后启用。
5. Activate: 注册声明式贡献点。
6. Run: 响应命令、事件或渲染请求。
7. Disable: 清理贡献点和运行时资源。
8. Recover: 用户重试或停用错误插件。

### 7.3 错误隔离

1. 插件激活失败只影响该插件。
2. 插件扩展区域使用插件级 ErrorBoundary。
3. 命令执行失败返回插件错误，不抛到全局。
4. 同一插件连续失败超过阈值后自动进入 `error`。

### 7.4 插件级 ErrorBoundary 已落地设计

插件级 ErrorBoundary 已落地，用于补齐“插件失败不影响核心页面白屏”的验收点。

覆盖范围:

1. Dashboard widget renderer。
2. Settings schema renderer。
3. 后续 Sidebar item panel、Command result panel、Event-driven notification renderer。

组件边界:

```tsx
<PluginErrorBoundary pluginId={widget.pluginId} contributionId={widget.id} contributionType="dashboard.widget">
  <PluginRenderer widget={widget} config={config} />
</PluginErrorBoundary>
```

错误记录:

```ts
interface PluginRuntimeError {
  contributionId: string;
  contributionType: "dashboard.widget" | "settings.panel" | "sidebar.item" | "command";
  message: string;
  stack?: string;
  at?: string;
}
```

状态处理:

1. 首次渲染失败时只隐藏该贡献区域，并展示可恢复提示。
2. `PluginManager.recordPluginError(pluginId, error)` 写入 `record.lastError`。
3. Settings 插件管理卡片展示最近错误和启停入口。
4. 后续引入错误计数，连续失败超过阈值后将插件状态置为 `error`。

用户体验:

1. Dashboard 中失败 widget 显示“插件渲染失败，可在设置中停用或重试”。
2. Settings schema 失败时保留插件启停能力和权限摘要。
3. 错误内容必须脱敏，不展示 token、cookie、API Key、完整本地路径。

测试要求:

1. 已构造测试 renderer 抛错，验证 Dashboard 页面仍渲染其他 widget。
2. 已验证 Settings 插件卡片显示 `lastError`。
3. 已验证 Settings 类型贡献失败时插件设置页仍可用。
4. 已验证错误 payload 不包含 token、cookie 和本地路径。

---

## 8. 沙箱策略

### 8.1 首版策略

首版只运行可信内置插件，因此不以“任意代码沙箱”为 MVP 前提。首版安全来自:

1. 不加载外部未审核代码。
2. UI 贡献声明式。
3. API capability 拦截。
4. 插件存储隔离。
5. 网络域名限制。

### 8.2 后续沙箱方向

第三方插件进入前必须完成沙箱原型。候选方案:

1. iframe sandbox: 适合插件 UI，隔离 DOM 和 JS。
2. Web Worker: 适合后台逻辑，不适合直接渲染 React UI。
3. isolated-vm 或独立进程: Desktop 侧候选，需要安全评审。

不选用 `vm2` 作为默认方案。原因是其历史安全风险和维护风险过高，不适合作为生产级未信任代码边界。

### 8.3 沙箱消息协议预留

PluginHost 与插件运行时通过消息协议通信:

```ts
type PluginHostMessage =
  | { type: "api.call"; id: string; pluginId: string; api: string; args: unknown[] }
  | { type: "api.result"; id: string; ok: true; value: unknown }
  | { type: "api.error"; id: string; ok: false; error: PluginErrorPayload }
  | { type: "extension.register"; pluginId: string; contribution: ExtensionContribution };
```

首版可信内置插件可以直接调用本地实现，但接口必须按消息协议可序列化设计。

---

## 9. Web 与 Desktop 适配

### 9.1 共享包

`packages/core/src/plugin` 包含:

1. 类型定义。
2. manifest schema。
3. 权限枚举。
4. PluginManager 核心逻辑。
5. ExtensionRegistry。

### 9.2 Web

Web 侧负责:

1. 插件状态存储在 SQLite。
2. 插件配置经 API route 持久化。
3. 网络请求通过服务端代理执行，避免浏览器 CORS 和 cookie 泄漏。
4. Web 插件 runtime 不接触 OAuth access token。
5. Web 生产环境不支持用户上传本地插件包。
6. Web Secret Store 使用服务端加密存储，密钥来自环境变量。

### 9.3 Desktop

Desktop 侧负责:

1. 插件状态和配置存储在 userData。
2. 敏感配置使用 keytar。
3. 网络请求由 renderer 受控 API 或 main process 执行。
4. 不允许插件调用 Electron IPC 原始通道。
5. 私有插件首版不得任意读取本地文件；未来如开放，必须通过 `filesystem.read`、路径白名单、用户确认和 main process 代理实现。

---

## 10. 架构完善路线

当前实现已经证明“可信内置插件 + 声明式 UI + 配置持久化”的主链路可行。接下来架构应按风险从低到高继续补齐能力。

### 10.1 P0: 稳定性与诊断

已完成:

1. 插件级 ErrorBoundary。
2. `recordPluginError` 与 `lastError` 更新。
3. Dashboard/Settings 插件贡献区域失败隔离。
4. 错误阈值熔断，默认连续 3 次失败后将插件置为 `error` 并移除贡献入口。
5. 插件日志面板，按 `pluginId` 过滤最近日志，并展示命令执行与运行时错误日志。

### 10.2 P1: 扩展点完整性

已完成:

1. Sidebar item 实际挂载到 `CMSLayout`。
2. CommandRegistry: 注册、执行、权限校验、错误返回。
3. EventBus core: 只读订阅、宿主事件派发、权限校验、handler 失败隔离。
4. 核心页面事件派发接入: `post.afterSave/delete`、`page.afterSave/delete`、`media.afterUpload/delete`、`deploy.afterTrigger/statusChange`。

待补齐:

1. Diagnostics 扩展点: SEO、草稿健康度、发布前检查等插件返回结构化问题列表。

### 10.3 P2: 平台持久化与 Secret

已完成:

1. 插件 Storage API Web SQLite/API route 持久化。
2. 插件 Storage API Desktop userData 持久化。
3. 插件状态 Web SQLite/API route 持久化 (`/api/plugin/state`、`plugin_state` 表)。
4. 插件状态 Desktop userData 持久化 (`plugins/state.json` + `plugin-state:*` IPC)。
5. 插件配置 Web SQLite/API route 持久化 (`/api/plugin/config`、`plugin_config` 表)。
6. 插件配置 Desktop userData 持久化 (`plugins/config.json` + `plugin-config:*` IPC)。
7. Secret Store Web SQLite/API route 持久化 (`/api/plugin/secrets`、`plugin_secrets` 表)。
8. Secret Store Desktop keytar 持久化 (`plugin-secret:*` IPC)。

待补齐:

1. 导入/导出配置时跳过 secret 明文。
2. 插件日志的平台级持久化。

### 10.4 P3: 外部集成与沙箱

已完成:

1. 受控 `network.fetch` core，限制 host、协议、超时和 cookie。
2. 受控 `network.fetch` Web 平台代理 (`/api/plugin/fetch`)，在服务端执行并过滤 cookie。
3. 受控 `network.fetch` Desktop 平台代理 (`plugin-http:fetch` IPC)，在 main process 执行并过滤 cookie。
4. 插件网络请求审计日志 (`plugin_network_audit` 表、`plugins/network-audit.json`)，记录 pluginId、URL、method、status 和错误。
5. 响应大小限制 10MB (Web 和 Desktop 均生效)。
6. `PluginFetch` 类型扩展 `pluginId` 字段，供平台代理记录审计上下文。

待补齐:

1. local-dev 插件加载，仅开发模式开启。
2. iframe/Worker/独立进程沙箱原型。
3. 插件签名和私有源。
4. 审计日志 UI 展示面板。

### 10.5 插件化能力映射

| 插件类型 | 必要扩展点 | 必要 API | 先决条件 |
|----------|------------|----------|----------|
| Dashboard 摘要类 | `dashboard.widget`, `settings.panel` | `content.read`, `pluginConfig.write` | 已可支持 |
| Settings 工具类 | `settings.panel`, `command` | `config.read`, `pluginConfig.write` | CommandRegistry |
| 编辑辅助类 | `editor.panel`, `diagnostics` | `content.read` | 新增编辑器扩展点 |
| 发布检查类 | `event`, `diagnostics` | `content.read` | EventBus |
| 外部服务类 | `dashboard.widget`, `command` | `network.fetch`, Secret Store | 网络代理与密钥存储 |
| 团队规范类 | `diagnostics`, `settings.panel`, 私有源 | `content.read`, 私有配置 | 私有插件源 |

---

## 11. 数据模型

### 11.1 Web SQLite

```sql
CREATE TABLE IF NOT EXISTS plugin_state (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  source TEXT NOT NULL,
  state TEXT NOT NULL,
  enabled_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_config (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS plugin_secret_ref (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  provider TEXT NOT NULL,
  ref TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS plugin_storage (
  plugin_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plugin_id, key)
);

CREATE TABLE IF NOT EXISTS plugin_log (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 11.2 Desktop

Desktop 使用:

1. `plugins/state.json`
2. `plugins/config.json`
3. `plugins/storage/{pluginId}.json`
4. keytar 保存敏感字段。

---

## 12. 实施计划

### Phase 1: MVP 基础

状态: 已落地。

1. `PluginManifest` 轻量 schema 校验。
2. `PluginManager`。
3. `ExtensionRegistry`。
4. `PluginProvider`。
5. Dashboard widget outlet。
6. Settings 插件管理页。
7. 权限拦截基础。
8. Attachments Helper 内置插件。
9. Web/Desktop 根布局接入。
10. Media 页面根据插件状态收起插件相关筛选和搜索入口。

验收:

1. Web/Desktop 可看到内置插件。
2. 可启用/停用插件。
3. Attachments Helper 可用并贡献至少一个 UI 入口。
4. 插件错误不影响 Dashboard。

### Phase 2: 可信插件完善

状态: 已落地，平台持久化与受控网络代理全部完成；下一步进入 Phase 3 沙箱预研。

已完成:

1. Settings panel schema renderer。
2. Comments Overview 内置插件。
3. 插件配置持久化基础能力。
4. Dashboard widget 读取插件配置。
5. 插件级 ErrorBoundary。
6. `recordPluginError` 与最近错误展示。
7. Dashboard/Settings 插件贡献区域失败隔离。
8. Sidebar item 实际挂载到 `CMSLayout`。
9. CommandRegistry 注册、执行、权限校验和错误返回。
10. `recordPluginError` 错误计数与阈值熔断。
11. 插件 Storage API core: Memory/Browser store、权限隔离和 namespace 管理。
12. Event API core: 只读订阅、宿主事件派发、权限校验和 handler 失败隔离。
13. 插件日志面板: Memory/Browser log store、logger API、错误/命令日志记录、Settings 最近日志展示与脱敏。
14. 核心页面事件派发接入: DataProvider wrapper 覆盖文章、页面、媒体和部署事件。
15. Storage 平台持久化: Web SQLite/API route 与 Desktop userData IPC 适配。
16. Secret Store core: `has/set/delete`、`pluginId` 隔离和 `pluginSecret.read/write` 权限。
17. `network.fetch` core: HTTPS、allowedHosts、超时、禁 cookie 与权限校验。
18. Secret Store Web/Desktop 平台持久化 (SQLite + keytar)。
19. 受控 `network.fetch` Web/Desktop 平台代理 (API route + main process IPC)，响应大小限制 10MB。
20. 插件网络请求审计日志 (`plugin_network_audit` 表 + `plugins/network-audit.json`)。
21. 插件状态和配置 Web/Desktop 平台持久化，从 localStorage 迁移到 SQLite/userData。

下一轮 P0:

1. 审计日志 UI 展示面板。
2. 插件日志的平台级持久化。

后续 P1:

1. Diagnostics 扩展点。

验收:

1. 插件配置可保存并跨 Web/Desktop 平台持久化。
2. 插件 renderer 抛错不会导致 Dashboard 或 Settings 白屏。
3. Settings 中可看到插件最近错误并停用故障插件。
4. 命令可执行并被权限控制。
5. 事件只读通知可用。
6. Comments Overview 可被启用/停用，并贡献 dashboard widget 与 settings panel。
7. Settings 中可看到插件最近日志，且日志不泄漏 token、cookie、API Key 和本地路径。
8. 文章、页面、媒体和部署操作会向 Event API 派发对应宿主事件。
9. 插件 Storage API 在 Web 刷新和 Desktop 重启后仍能保留同一 `pluginId` namespace 下的数据。
10. Secret API 不返回明文，并按权限和 `pluginId` 隔离。
11. network.fetch 拒绝未授权权限、非 HTTPS 和未声明 host，并不发送 cookie。
12. 插件状态和配置在 Web 刷新和 Desktop 重启后持久化。
13. 网络请求审计日志正确记录 pluginId、URL、method、status 和错误。

### Phase 3: 沙箱预研

1. iframe sandbox UI 原型。
2. Worker 后台逻辑原型。
3. Desktop 独立进程或 isolated-vm 原型。
4. 消息协议压测和安全评审。

验收:

1. 未信任插件无法访问 DOM、token、IPC。
2. API 调用只能经 PermissionBroker。
3. 性能指标满足 UI 可用。

### Phase 4: 生态准备

1. 插件签名。
2. 私有插件源。
3. 插件包完整性校验。
4. 市场 PRD 与技术方案。

---

## 13. 测试策略

1. Manifest schema 单元测试。
2. PermissionBroker 单元测试。
3. PluginManager 状态流转测试。
4. ExtensionRegistry 注册/清理测试。
5. Web/Desktop 插件配置持久化测试。
6. 插件 ErrorBoundary 与 `recordPluginError` 测试。
7. 至少一个启停插件的 E2E 测试。
8. 第二个内置插件启停、renderer 映射和 dashboard 布局测试。

---

## 14. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| UI 插件与沙箱冲突 | 高 | 首版声明式 UI，后续 iframe 沙箱 |
| 权限粒度过粗 | 高 | 不暴露完整 DataProvider，按 API 方法拦截 |
| 插件泄漏敏感配置 | 高 | 敏感字段脱敏，优先密钥存储 |
| Desktop 未信任代码执行风险 | 高 | 首版不运行未信任代码，不采用 vm2 默认方案 |
| API 过早稳定导致包袱 | 中 | 标记 `experimental`，先以内置插件验证 |
| Web/Desktop 行为不一致 | 中 | core 共享 schema 和状态机 |

---

## 15. 待确认问题

1. Web 网络代理是否需要按用户限流。
2. 插件状态 v0.2 是否按登录用户隔离，还是继续按应用实例全局。
3. `diagnostics` 扩展点是否先服务 SEO Inspector / Draft Coach，还是等编辑器扩展点一起设计。

---

## 16. 决策记录

1. 首版不加载未审核第三方插件。
2. 首版不让插件直接提供 React component。
3. 首版不暴露完整 DataProvider。
4. 首版不选择 `vm2` 作为 Desktop 沙箱默认方案。
5. 插件市场单独立项，不进入插件 MVP。
6. 首个内置插件选择 Attachments Helper。
7. 第三方 API Key 必须进入 Secret Store。
8. Desktop 私有插件首版不得任意读取本地文件。
9. Web 首版不支持用户上传本地插件包。
10. 内置插件 renderer 放在 `packages/ui/src/plugin/renderers`。
11. 第二个内置插件选择 Comments Overview，Analytics Dashboard 等 Secret Store 与 network permission 稳定后再做。
12. Comments Overview 先复用静态示例数据和配置入口验证架构，后续再抽象 `CommentProvider`。
13. 插件级 ErrorBoundary 已覆盖 Dashboard widget 和 Settings schema renderer。
14. Sidebar item、CommandRegistry 和错误阈值熔断已落地。
15. 插件 Storage API core 已落地。
16. Event API core 已落地。
17. 插件日志面板已落地。
18. 核心页面事件派发接入已落地。
19. 插件 Storage API 平台持久化适配已落地；下一轮优先补 Secret Store 与受控网络代理。
20. Secret Store core 与 network.fetch core 已落地；下一轮优先补平台级 Secret 持久化和网络代理。
21. Secret Store Web/Desktop 平台持久化已落地；下一步进入受控 network.fetch 平台代理。
22. 受控 network.fetch Web/Desktop 平台代理已落地，支持响应大小限制和审计日志。
23. 插件状态和配置已从 localStorage 迁移到 Web SQLite / Desktop userData；平台级持久化链路打通。
