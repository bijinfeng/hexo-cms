# Hexo CMS 插件系统技术方案

> **版本**: 1.0.0  
> **最后更新**: 2026-05-10  
> **状态**: 草案  
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
    manifest.ts
    permissions.ts
    plugin-manager.ts
    extension-registry.ts
    plugin-host.ts
    errors.ts

packages/ui
  plugin/
    plugin-provider.tsx
    extension-outlet.tsx
    plugin-settings-page.tsx
    built-in-renderers.tsx

packages/web
  src/lib/plugin-runtime.ts

packages/desktop
  src/renderer/src/lib/plugin-runtime.ts
```

运行时分层:

1. `PluginManager`: 负责发现、校验、启用、停用、状态持久化。
2. `PluginHost`: 负责加载插件模块或执行插件贡献。
3. `PermissionBroker`: 负责所有 API 调用的权限校验。
4. `ExtensionRegistry`: 保存 UI、命令、事件等贡献点。
5. `ExtensionOutlet`: React 宿主组件，在固定位置渲染声明式贡献。

---

## 3. 插件包模型

### 3.1 Manifest

首版 manifest 使用 `plugin.json`:

```json
{
  "id": "hexo-cms-analytics",
  "name": "Attachments Helper",
  "version": "0.1.0",
  "description": "Show analytics summary on dashboard.",
  "source": "builtin",
  "engine": {
    "hexoCms": ">=0.1.0"
  },
  "activation": [
    "onMedia"
  ],
  "permissions": [
    "content.read",
    "pluginStorage.read",
    "pluginStorage.write",
    "pluginConfig.write",
    "ui.contribute",
    "command.register"
  ],
  "contributes": {
    "sidebarItems": [
      {
        "id": "attachments.media-entry",
        "title": "附件助手",
        "target": "plugin.settings"
      }
    ],
    "settingsPanels": [
      {
        "id": "attachments.settings",
        "title": "附件设置",
        "schema": "attachments.settings"
      }
    ],
    "commands": [
      {
        "id": "attachments.copyLink",
        "title": "复制附件链接"
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
5. manifest 通过 Zod schema 进行运行时校验。
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

Web 存储在 SQLite 表中，Desktop 存储在 Electron userData 目录。存储格式通过平台 DataStore 适配。

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
  "builtin.attachments.filter": AttachmentsFilterPanel,
  "builtin.analytics.summary": AnalyticsSummaryWidget,
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
```

schema 支持字段类型:

1. `string`
2. `password`
3. `select`
4. `boolean`
5. `url`

敏感字段使用 `password`，日志和错误上报中必须脱敏。

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

---

## 6. 权限模型

### 6.1 权限枚举

```ts
type PluginPermission =
  | "content.read"
  | "config.read"
  | "pluginStorage.read"
  | "pluginStorage.write"
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
2. Validate: Zod 校验 manifest。
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

## 10. 数据模型

### 10.1 Web SQLite

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
```

### 10.2 Desktop

Desktop 使用:

1. `plugins/state.json`
2. `plugins/config.json`
3. `plugins/storage/{pluginId}.json`
4. keytar 保存敏感字段。

---

## 11. 实施计划

### Phase 1: MVP 基础

1. `PluginManifest` Zod schema。
2. `PluginManager`。
3. `ExtensionRegistry`。
4. `PluginProvider`。
5. Dashboard widget outlet。
6. Settings 插件管理页。
7. 权限拦截基础。
8. 一个内置插件。

验收:

1. Web/Desktop 可看到内置插件。
2. 可启用/停用插件。
3. Attachments Helper 可用并贡献至少一个 UI 入口。
4. 插件错误不影响 Dashboard。

### Phase 2: 可信插件完善

1. Settings panel schema renderer。
2. Sidebar item。
3. Command API。
4. Event API。
5. 插件日志面板。
6. 三个内置插件。

验收:

1. 插件配置可保存。
2. 命令可执行并被权限控制。
3. 事件只读通知可用。

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

## 12. 测试策略

1. Manifest schema 单元测试。
2. PermissionBroker 单元测试。
3. PluginManager 状态流转测试。
4. ExtensionRegistry 注册/清理测试。
5. Web/Desktop 插件配置持久化测试。
6. 插件 ErrorBoundary 组件测试。
7. 至少一个启停插件的 E2E 测试。

---

## 13. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| UI 插件与沙箱冲突 | 高 | 首版声明式 UI，后续 iframe 沙箱 |
| 权限粒度过粗 | 高 | 不暴露完整 DataProvider，按 API 方法拦截 |
| 插件泄漏敏感配置 | 高 | 敏感字段脱敏，优先密钥存储 |
| Desktop 未信任代码执行风险 | 高 | 首版不运行未信任代码，不采用 vm2 默认方案 |
| API 过早稳定导致包袱 | 中 | 标记 `experimental`，先以内置插件验证 |
| Web/Desktop 行为不一致 | 中 | core 共享 schema 和状态机 |

---

## 14. 待确认问题

1. Web 网络代理是否需要按用户限流。
2. 首个内置插件的 renderer 是否放在 `packages/ui`。
3. 插件状态是否按用户隔离，还是按应用实例全局。

---

## 15. 决策记录

1. 首版不加载未审核第三方插件。
2. 首版不让插件直接提供 React component。
3. 首版不暴露完整 DataProvider。
4. 首版不选择 `vm2` 作为 Desktop 沙箱默认方案。
5. 插件市场单独立项，不进入插件 MVP。
6. 首个内置插件选择 Attachments Helper。
7. 第三方 API Key 必须进入 Secret Store。
8. Desktop 私有插件首版不得任意读取本地文件。
9. Web 首版不支持用户上传本地插件包。
