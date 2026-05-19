# Hexo CMS 插件系统技术方案

> **版本**: 2.0.0
> **最后更新**: 2026-05-19
> **状态**: 架构重塑完成
> **关联 PRD**: [PRD_PLUGIN_SYSTEM.md](./PRD_PLUGIN_SYSTEM.md)
> **开发手册**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — 包含完整 API 参考和使用示例

---

## 1. 设计原则

1. **插件默认无权**：所有能力通过 `permissions` 字段显式声明，未声明即禁止。
2. **声明式贡献优先**：UI 入口、设置面板、命令、诊断、事件都在 manifest 中声明，宿主负责渲染。
3. **Web/Desktop 同构**：共享类型、manifest、权限模型和 UI 扩展协议。
4. **失败隔离**：单个插件失败不影响核心页面，连续 3 次错误进入 error 状态并清理其运行时贡献。
5. **统一加载路径**：官方插件和本地开发插件通过同一 PluginCatalog 路径加载。

---

## 2. 架构总览

```
packages/core/src/plugin/           ← 纯逻辑层（无 UI 依赖）
├── types.ts                        # 所有类型定义
├── manifest.ts                     # Manifest 校验
├── define-plugin.ts                # definePlugin 类型辅助
├── source-resolver.ts              # PluginSourceResolver 接口
├── plugin-catalog.ts               # PluginCatalog 发现/校验/索引
├── plugin-host.ts                  # PluginHost 运行时编排器
├── plugin-manager.ts               # PluginManager 状态机
├── permissions.ts                  # PermissionBroker
├── extension-registry.ts           # 扩展注册表（含 uiFlags）
├── command-registry.ts             # 命令注册/执行
├── diagnostics-registry.ts         # 诊断注册/运行
├── event-bus.ts                    # 事件总线
├── plugin-storage.ts               # 插件级 KV 存储
├── plugin-secret.ts                # 插件级密钥存储
├── plugin-http.ts                  # 安全 HTTP 代理
├── plugin-logger.ts                # 插件日志
├── errors.ts                       # 错误类型
└── stores.ts                       # Memory/Browser 存储基类

packages/plugins/                   ← 官方插件包
├── package.json                    # @hexo-cms/plugins 聚合包
├── src/
│   ├── official.ts                 # officialPlugins 数组
│   └── local-dev.ts               # localDevPlugins 数组
├── attachments-helper/             # 附件助手插件
├── comments-overview/              # 评论管理插件
├── seo-inspector/                  # SEO 检查插件
└── draft-coach/                    # 草稿助手插件

packages/ui/src/plugin/             ← UI 宿主层
├── plugin-provider.tsx             # PluginProvider（接收 PluginHost）
├── extension-outlet.tsx            # 仪表盘小部件渲染出口
├── plugin-settings.tsx             # 设置面板 UI
└── ...                             # 平台适配层
```

---

## 3. 核心数据流

### 3.1 插件加载

```
PluginDefinition[]                       (official / local-dev)
   │
   ▼
PluginSourceResolver.discover()          (StaticPluginSourceResolver)
   │
   ▼
PluginCatalog                            (校验 manifest、去重、索引)
   │
   ▼
PluginHost                               (编排器)
   ├── PluginManager                     (状态管理 + 权限 + 存储)
   │     ├── ExtensionRegistry           (贡献快照)
   │     ├── CommandRegistry             (命令注册/执行)
   │     ├── DiagnosticsRegistry         (诊断运行)
   │     └── EventBus                    (事件派发)
   └── syncRuntimeContributions()        (注册/清理渲染器、命令处理器等)
```

### 3.2 运行时上下文注入

插件启用时，`PluginHost.registerRuntime()` 为每个插件创建 `PluginRuntimeContext`：

```ts
const context: PluginRuntimeContext = {
  plugin:  definition.manifest,    // 只读 manifest
  content: manager.createContentAPI(),  // 只读内容访问
  storage: manager.createStorageAPI(),  // KV 存储
  secrets: manager.createSecretAPI(),   // 密钥存储
  events:  manager.createEventAPI(),    // 事件订阅
  http:    manager.createHttpAPI(),     // HTTP 请求
  logger:  manager.createLogger(),      // 日志记录
  getConfig: () => manager.getPluginConfig(pluginId),
};
```

该上下文被传递给 `PluginDefinition` 中的每个 `PluginRuntimeFactory`，确保每个处理器拥有它所需的能力。

---

## 4. PluginCatalog

`PluginCatalog` 负责从多个 `PluginSourceResolver` 中发现、校验和索引所有插件定义。

```ts
const catalog = await PluginCatalog.discover([
  new StaticPluginSourceResolver("official", officialPlugins),
  new StaticPluginSourceResolver("local-dev", localDevPlugins, {
    enabled: import.meta.env.DEV,
  }),
]);
```

**校验规则：**
- 每个 manifest 通过 `validatePluginManifest()` 校验
- `runtime` 必须为 `"hosted"`（当前实现）
- 插件 ID 必须唯一
- 字段 `source` 被拒绝（强制迁移到 `origin`）

---

## 5. PluginHost

`PluginHost` 是顶层的运行时编排器，在 Web 和 Desktop 根路由中创建。

```ts
const host = new PluginHost({
  catalog,
  stateStore: createPlatformPluginStateStore(),
  configStore: createPlatformPluginConfigStore(),
  // ... 其他 store 实现
  dataProvider,
});
```

**生命周期：**

```
enablePlugin(id)
  → PluginManager.enable(id)
  → syncRuntimeContributions()
    → registerRuntime(id)
      → 注册 renderers (pluginId:rendererId → TRenderer)
      → 创建 PluginRuntimeContext
      → 实例化所有 commands/diagnostics/events 工厂
      → 注册到 PluginManager
------------------------------------------------------
disablePlugin(id)
  → PluginManager.disable(id)
  → syncRuntimeContributions()
    → unregisterRuntime(id)
      → 清理 renderers、command handlers、diagnostics handlers、event subscriptions
```

---

## 6. Web/Desktop 集成

### 6.1 Web 端

```ts
// packages/web/src/lib/plugin-host.ts
export async function createWebPluginHost() {
  const catalog = await PluginCatalog.discover([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, {
      enabled: import.meta.env.DEV,
    }),
  ]);
  return new PluginHost({
    catalog,
    stateStore: createPlatformPluginStateStore(),
    // ... web 平台 store 实现
    dataProvider: webDataProvider,
  });
}

// packages/web/src/routes/__root.tsx — 认证后并行加载
if (nextSession.state === "authenticated") {
  const [config, host] = await Promise.all([
    webDataProvider.getConfig(),
    createWebPluginHost(),
  ]);
  setPluginHost(host);
}

// 渲染时注入
<PluginProvider host={pluginHost}>
  <CMSLayout>...</CMSLayout>
</PluginProvider>
```

### 6.2 Desktop 端

```ts
// 主进程 — packages/desktop/src/main/index.ts
import { officialPlugins } from "@hexo-cms/plugins";
const officialPluginManifests = officialPlugins.map(p => p.manifest);
const pluginHttpProxy = createPluginHttpProxy({
  manifests: officialPluginManifests,
  appendAudit: (entry) => desktopPersistence.appendPluginNetworkAudit(entry),
});

// 渲染进程 — packages/desktop/src/renderer/src/lib/plugin-host.ts
// 结构同 Web 端，使用 desktopDataProvider 和平台的 store 实现
```

### 6.3 评论页面

评论页面从 `@hexo-cms/plugin-comments-overview` 的页面导出加载：

```ts
import { CommentsPage } from "@hexo-cms/plugin-comments-overview/pages/comments";
export const Route = createFileRoute("/comments")({ component: CommentsPage });
```

---

## 7. 权限模型

```
                          ┌──────────────────┐
                          │  PermissionBroker │
                          └────────┬─────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
  content.read            pluginStorage.read          network.fetch
  (读内容)                 pluginStorage.write         (HTTP 请求)
                           (插件存储读写)              │
                                                      ▼
                           pluginSecret.read      network.allowedHosts
                           pluginSecret.write      (主机白名单)
                           (密钥存储读写)
                                                      ▲
                           pluginConfig.write     command.register
                           (插件设置写入)          (命令注册/执行)
                                                      ▲
                           ui.contribute          event.subscribe
                           (UI 贡献)              (事件订阅)
```

---

## 8. 扩展点体系

### 8.1 Dashboard Widget

- 声明：`contributes.dashboardWidgets[]`
- 渲染：host 通过 `getDashboardWidgetRenderer(widget)` 获取组件
- 权限：`ui.contribute`

### 8.2 Settings Panel

- 声明：`contributes.settingsPanels[]` + `contributes.settingsSchemas`
- 渲染：`PluginSettingsPanel` 组件按 schema 渲染表单
- 支持类型：`string`、`password`、`select`、`boolean`、`url`
- 权限：`ui.contribute`

### 8.3 Sidebar Item

- 声明：`contributes.sidebarItems[]`
- 目标：`"plugin.settings"` 或 `"/comments"`
- 权限：`ui.contribute`

### 8.4 Command

- 声明：`contributes.commands[]`
- 执行：UI 层通过 `executePluginCommand(pluginId, commandId, args)` 调用
- 错误码：`PLUGIN_COMMAND_NOT_FOUND` / `PLUGIN_COMMAND_HANDLER_MISSING` / `PLUGIN_COMMAND_FAILED`
- 权限：`command.register`

### 8.5 Diagnostics

- 声明：`contributes.diagnostics[]`，scope 为 `post` / `page` / `site`
- 运行：`host.runDiagnostics(target)` → `DiagnosticsReport[]`
- 权限：`content.read`

### 8.6 Event

- 声明：`contributes.events[]`
- 内置事件：`post.afterSave`、`post.afterDelete`、`page.afterSave`、`page.afterDelete`、`media.afterUpload`、`media.afterDelete`、`deploy.afterTrigger`、`deploy.statusChange`
- 支持自定义事件名
- 权限：`event.subscribe`

### 8.7 UiFlag

- 声明：`contributes.uiFlags[]`
- 当前用途：`media.documentFilter`（媒体文档筛选）、`media.search`（媒体搜索）
- 权限：`ui.contribute`

---

## 9. 错误处理策略

### 9.1 错误熔断

`PluginManager.recordPluginError()` 维护每个插件的错误计数。当累计错误达到 `errorThreshold`（默认 3）时：

1. 插件状态变为 `"error"`
2. ExtensionRegistry 移除该插件的所有贡献
3. EventBus 移除该插件的所有事件订阅

用户可在设置中重新启用进入 error 状态的插件。

### 9.2 错误隔离

- 每个 dashboard widget 包裹在 `PluginErrorBoundary` 中，renderer 报错只影响对应区域
- 事件处理器异常不影响其他订阅者，也不影响宿主
- 诊断处理器异常被包装为诊断问题而非异常抛出
- 命令处理器异常返回结构化错误结果

### 9.3 日志脱敏

所有 plugin-level 日志自动脱敏：
- `token=xxx` / `apiKey=xxx` / `password=xxx` / `secret=xxx` / `cookie=xxx` → `[redacted]`
- Windows 路径 → `[redacted-path]`
- Unix 路径 → `[redacted-path]`

---

## 10. 存储架构

| Store | Key | 用途 |
|-------|-----|------|
| PluginStateStore | `hexo-cms:plugin-state` | 插件启用/停用/错误状态 |
| PluginConfigStore | `hexo-cms:plugin-config` | 插件设置值 |
| PluginStorageStore | `hexo-cms:plugin-storage` | 插件级 KV 数据 |
| PluginSecretStore | `hexo-cms:plugin-secrets` | 插件密钥 |
| PluginLogStore | `hexo-cms:plugin-logs` | 插件日志 |

Web 端使用 `BrowserJsonStore`（localStorage），Desktop 端使用 `MemoryStore`（内存）或对应的持久化实现。

---

## 11. 与旧方案的对比

| 方面 | 旧方案（pre-refactor） | 新方案（当前） |
|------|----------------------|---------------|
| 插件来源 | `source: "builtin"` 硬编码在 core | `origin: "official" \| "local-dev" \| ...` |
| 插件清单位置 | `packages/core/src/plugin/builtin.ts` | `packages/plugins/*/src/manifest.ts` |
| 渲染器注册 | UI 包硬编码 `defaultDashboardWidgetRenderers` map | PluginHost 根据插件启用状态动态注册 |
| 命令/诊断处理器 | PluginProvider 内部硬编码 | PluginDefinition 中的 PluginRuntimeFactory 模式 |
| SEO 插件代码 | `packages/ui/src/plugin/diagnostics/` | `packages/plugins/seo-inspector/` |
| 草稿助手代码 | `packages/ui/src/plugin/draft-coach/` | `packages/plugins/draft-coach/` |
| 评论页面 | `packages/ui/src/pages/comments.tsx` | `packages/plugins/comments-overview/src/pages/comments.tsx` |
| 插件加载 | PluginManager 直接接收 `builtinPluginManifests` | PluginCatalog.discover() + PluginSourceResolver |
