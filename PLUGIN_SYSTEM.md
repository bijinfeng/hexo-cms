# Hexo CMS 插件系统设计文档

> **版本**: 1.0.0  
> **最后更新**: 2026-04-30  
> **状态**: 设计阶段

---

## 目录

1. [设计理念](#1-设计理念)
2. [架构概览](#2-架构概览)
3. [插件清单规范](#3-插件清单规范)
4. [插件 API 接口](#4-插件-api-接口)
5. [扩展点与钩子](#5-扩展点与钩子)
6. [插件生命周期](#6-插件生命周期)
7. [沙箱与安全](#7-沙箱与安全)
8. [内置插件示例](#8-内置插件示例)
9. [插件注册中心](#9-插件注册中心)
10. [实施路线图](#10-实施路线图)

---

## 1. 设计理念

### 1.1 为什么需要插件系统

Hexo CMS 当前架构已经实现了核心功能（文章管理、媒体管理、部署管理等），但随着用户需求的多样化，我们需要一个可扩展的插件系统来支持：

- **功能扩展**：统计分析、评论系统、附件管理、SEO 优化等
- **第三方集成**：Google Analytics、Disqus、Algolia 搜索等
- **定制化需求**：企业用户的特殊工作流、自定义编辑器工具等
- **社区生态**：允许开发者贡献插件，形成生态系统

### 1.2 设计原则

借鉴业界最佳实践（VS Code、Figma、Obsidian、WordPress），我们的插件系统遵循以下原则：

1. **最小侵入**：插件不应破坏核心功能，核心代码对插件无感知
2. **类型安全**：完整的 TypeScript 类型定义，编译时检查
3. **沙箱隔离**：插件运行在受限环境中，防止恶意代码
4. **声明式优先**：通过 manifest 声明能力，减少运行时代码
5. **渐进增强**：插件可选，禁用插件不影响核心功能
6. **跨平台一致**：Web 和桌面端使用相同的插件 API

### 1.3 解决的问题

- **核心臃肿**：避免将所有功能塞进核心代码
- **定制困难**：用户可以通过插件实现特定需求
- **维护成本**：插件独立维护，不影响核心稳定性
- **生态建设**：社区可以贡献插件，形成良性循环

---

## 2. 架构概览

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Hexo CMS 应用层                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web App     │  │ Desktop App  │  │   UI Layer   │      │
│  │ (TanStack)   │  │  (Electron)  │  │   (React)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│         ┌──────────────────▼──────────────────┐             │
│         │      Plugin Manager (核心)          │             │
│         │  - 插件加载/卸载                     │             │
│         │  - 生命周期管理                      │             │
│         │  - 权限控制                          │             │
│         │  - 事件总线                          │             │
│         └──────────────────┬──────────────────┘             │
│                            │                                 │
│         ┌──────────────────▼──────────────────┐             │
│         │      Plugin API Surface             │             │
│         │  - DataProvider 访问                │             │
│         │  - UI 扩展点                        │             │
│         │  - 钩子系统                         │             │
│         └──────────────────┬──────────────────┘             │
└────────────────────────────┼──────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
    ┌────▼─────┐  ┌──────────┐  ┌──────────┐  ┌▼──────────┐
    │ Plugin A │  │ Plugin B │  │ Plugin C │  │ Plugin D  │
    │(Analytics)│  │(Comments)│  │(Attach.) │  │(Custom)   │
    └──────────┘  └──────────┘  └──────────┘  └───────────┘
```

### 2.2 与现有架构的集成

Hexo CMS 当前使用 **DataProvider 模式**，插件系统将无缝集成：

```typescript
// 现有架构
packages/
  core/
    src/
      data-provider.ts    // DataProvider 接口定义
      types.ts            // 核心类型
  ui/
    src/
      hooks/
        useDataProvider.ts  // React Hook
  web/
    src/
      lib/
        web-data-provider.ts  // Web 实现
  desktop/
    src/
      main/
        desktop-data-provider.ts  // 桌面实现

// 新增插件系统
packages/
  core/
    src/
      plugin/
        plugin-manager.ts      // 插件管理器
        plugin-api.ts          // 插件 API 接口
        plugin-types.ts        // 插件类型定义
        extension-points.ts    // 扩展点定义
```

### 2.3 核心组件

#### 2.3.1 PluginManager

负责插件的生命周期管理：

```typescript
class PluginManager {
  // 加载插件
  async loadPlugin(pluginId: string): Promise<void>
  
  // 卸载插件
  async unloadPlugin(pluginId: string): Promise<void>
  
  // 激活插件
  async activatePlugin(pluginId: string): Promise<void>
  
  // 停用插件
  async deactivatePlugin(pluginId: string): Promise<void>
  
  // 获取所有插件
  getPlugins(): Plugin[]
  
  // 获取插件实例
  getPlugin(pluginId: string): Plugin | undefined
}
```

#### 2.3.2 ExtensionRegistry

管理所有扩展点：

```typescript
class ExtensionRegistry {
  // 注册扩展点
  registerExtensionPoint(point: ExtensionPoint): void
  
  // 注册扩展
  registerExtension(extension: Extension): void
  
  // 获取扩展点的所有扩展
  getExtensions(pointId: string): Extension[]
}
```


---

## 3. 插件清单规范

### 3.1 plugin.json 结构

每个插件必须包含一个 `plugin.json` 文件，定义插件的元数据和能力：

```json
{
  "id": "hexo-cms-analytics",
  "name": "Analytics Dashboard",
  "version": "1.0.0",
  "description": "统计分析插件，提供文章浏览量、访客统计等功能",
  "author": {
    "name": "Your Name",
    "email": "your@email.com",
    "url": "https://yourwebsite.com"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/hexo-cms-analytics"
  },
  "engines": {
    "hexo-cms": "^1.0.0"
  },
  "main": "./dist/index.js",
  "icon": "./icon.svg",
  "categories": ["analytics", "dashboard"],
  "keywords": ["analytics", "statistics", "dashboard", "metrics"],
  "activationEvents": [
    "onStartup",
    "onView:dashboard",
    "onCommand:analytics.refresh"
  ],
  "contributes": {
    "views": {
      "dashboard": [
        {
          "id": "analytics.widget",
          "name": "访问统计",
          "when": "config.analytics.enabled"
        }
      ],
      "sidebar": [
        {
          "id": "analytics.panel",
          "name": "Analytics",
          "icon": "chart-bar"
        }
      ]
    },
    "commands": [
      {
        "command": "analytics.refresh",
        "title": "刷新统计数据",
        "icon": "refresh"
      }
    ],
    "settings": [
      {
        "key": "analytics.provider",
        "type": "select",
        "default": "google",
        "options": ["google", "umami", "plausible"],
        "title": "统计服务提供商"
      },
      {
        "key": "analytics.trackingId",
        "type": "string",
        "title": "Tracking ID",
        "description": "Google Analytics 或其他服务的 Tracking ID"
      }
    ],
    "hooks": {
      "post.afterSave": "onPostSave",
      "post.afterDelete": "onPostDelete"
    }
  },
  "permissions": [
    "dataProvider.getPosts",
    "dataProvider.getStats",
    "storage.read",
    "storage.write",
    "network.fetch"
  ],
  "dependencies": {
    "chart.js": "^4.0.0"
  }
}
```

### 3.2 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 插件唯一标识符，格式：`hexo-cms-{name}` |
| `name` | string | ✅ | 插件显示名称 |
| `version` | string | ✅ | 语义化版本号 |
| `description` | string | ✅ | 插件描述 |
| `author` | object | ✅ | 作者信息 |
| `license` | string | ✅ | 开源协议 |
| `engines.hexo-cms` | string | ✅ | 兼容的 Hexo CMS 版本 |
| `main` | string | ✅ | 插件入口文件 |
| `icon` | string | ❌ | 插件图标（SVG 或 PNG） |
| `activationEvents` | array | ❌ | 激活事件列表 |
| `contributes` | object | ❌ | 贡献点声明 |
| `permissions` | array | ✅ | 所需权限列表 |

### 3.3 激活事件

插件可以声明何时被激活：

```typescript
type ActivationEvent =
  | "onStartup"                    // 应用启动时
  | "onView:{viewId}"              // 打开特定视图时
  | "onCommand:{commandId}"        // 执行特定命令时
  | "onLanguage:{languageId}"      // 打开特定语言文件时
  | "onFileSystem:{scheme}"        // 访问特定文件系统时
  | "*"                            // 总是激活（不推荐）
```

---

## 4. 插件 API 接口

### 4.1 核心 API

插件通过 `PluginContext` 访问所有 API：

```typescript
/**
 * 插件上下文 - 插件的主要 API 入口
 */
interface PluginContext {
  // 插件元数据
  readonly plugin: PluginMetadata;
  
  // 数据访问
  readonly dataProvider: DataProvider;
  
  // UI 扩展
  readonly ui: UIExtensionAPI;
  
  // 命令系统
  readonly commands: CommandAPI;
  
  // 事件系统
  readonly events: EventAPI;
  
  // 存储系统
  readonly storage: StorageAPI;
  
  // 配置系统
  readonly config: ConfigAPI;
  
  // 日志系统
  readonly logger: LoggerAPI;
  
  // 网络请求
  readonly http: HttpAPI;
}
```

### 4.2 DataProvider API

插件可以访问 DataProvider 的所有方法：

```typescript
interface DataProvider {
  // 文章管理
  getPosts(): Promise<HexoPost[]>;
  getPost(path: string): Promise<HexoPost>;
  savePost(post: HexoPost): Promise<void>;
  deletePost(path: string): Promise<void>;
  
  // 页面管理
  getPages(): Promise<HexoPost[]>;
  getPage(path: string): Promise<HexoPost>;
  savePage(post: HexoPost): Promise<void>;
  deletePage(path: string): Promise<void>;
  
  // 标签和分类
  getTags(): Promise<TagsResponse>;
  renameTag(type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }>;
  deleteTag(type: "tag" | "category", name: string): Promise<{ updatedCount: number }>;
  
  // 媒体管理
  getMediaFiles(): Promise<MediaFile[]>;
  uploadMedia(file: File, path: string): Promise<{ url: string }>;
  deleteMedia(path: string): Promise<void>;
  
  // 统计数据
  getStats(): Promise<StatsResponse>;
  
  // 主题管理
  getThemes(): Promise<ThemesResponse>;
  switchTheme(themeName: string): Promise<void>;
  
  // 部署管理
  getDeployments(): Promise<Deployment[]>;
  triggerDeploy(workflowFile: string): Promise<void>;
}
```

### 4.3 UI Extension API

插件可以扩展 UI：

```typescript
interface UIExtensionAPI {
  // 注册侧边栏面板
  registerSidebarPanel(panel: SidebarPanel): Disposable;
  
  // 注册仪表板小部件
  registerDashboardWidget(widget: DashboardWidget): Disposable;
  
  // 注册编辑器工具栏按钮
  registerEditorToolbarButton(button: ToolbarButton): Disposable;
  
  // 注册设置面板
  registerSettingsPanel(panel: SettingsPanel): Disposable;
  
  // 注册上下文菜单项
  registerContextMenuItem(item: ContextMenuItem): Disposable;
  
  // 显示通知
  showNotification(message: string, type: "info" | "success" | "warning" | "error"): void;
  
  // 显示对话框
  showDialog(options: DialogOptions): Promise<DialogResult>;
}
```

### 4.4 Command API

插件可以注册和执行命令：

```typescript
interface CommandAPI {
  // 注册命令
  registerCommand(commandId: string, handler: CommandHandler): Disposable;
  
  // 执行命令
  executeCommand(commandId: string, ...args: any[]): Promise<any>;
  
  // 获取所有命令
  getCommands(): Command[];
}

type CommandHandler = (...args: any[]) => any | Promise<any>;
```

### 4.5 Event API

插件可以监听和触发事件：

```typescript
interface EventAPI {
  // 监听事件
  on(event: string, handler: EventHandler): Disposable;
  
  // 监听一次
  once(event: string, handler: EventHandler): Disposable;
  
  // 触发事件
  emit(event: string, ...args: any[]): void;
}

// 内置事件
type BuiltInEvent =
  | "post.beforeSave"
  | "post.afterSave"
  | "post.beforeDelete"
  | "post.afterDelete"
  | "page.beforeSave"
  | "page.afterSave"
  | "media.beforeUpload"
  | "media.afterUpload"
  | "theme.beforeSwitch"
  | "theme.afterSwitch"
  | "deploy.beforeTrigger"
  | "deploy.afterTrigger";
```

### 4.6 Storage API

插件可以持久化数据：

```typescript
interface StorageAPI {
  // 获取值
  get<T>(key: string): Promise<T | undefined>;
  
  // 设置值
  set<T>(key: string, value: T): Promise<void>;
  
  // 删除值
  delete(key: string): Promise<void>;
  
  // 清空所有数据
  clear(): Promise<void>;
  
  // 获取所有键
  keys(): Promise<string[]>;
}
```

### 4.7 Config API

插件可以访问配置：

```typescript
interface ConfigAPI {
  // 获取配置值
  get<T>(key: string, defaultValue?: T): T;
  
  // 设置配置值
  set(key: string, value: any): Promise<void>;
  
  // 监听配置变化
  onDidChange(key: string, handler: (value: any) => void): Disposable;
}
```

### 4.8 Logger API

插件可以记录日志：

```typescript
interface LoggerAPI {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error): void;
}
```

### 4.9 Http API

插件可以发起网络请求：

```typescript
interface HttpAPI {
  // GET 请求
  get<T>(url: string, options?: RequestOptions): Promise<T>;
  
  // POST 请求
  post<T>(url: string, data: any, options?: RequestOptions): Promise<T>;
  
  // PUT 请求
  put<T>(url: string, data: any, options?: RequestOptions): Promise<T>;
  
  // DELETE 请求
  delete<T>(url: string, options?: RequestOptions): Promise<T>;
}
```

---

## 8. 内置插件示例

### 8.1 Analytics 插件

统计分析插件，提供文章浏览量、访客统计等功能。

#### 8.1.1 插件清单

```json
{
  "id": "hexo-cms-analytics",
  "name": "Analytics Dashboard",
  "version": "1.0.0",
  "description": "统计分析插件，支持 Google Analytics、Umami、Plausible",
  "main": "./dist/index.js",
  "activationEvents": ["onStartup", "onView:dashboard"],
  "contributes": {
    "views": {
      "dashboard": [{
        "id": "analytics.widget",
        "name": "访问统计",
        "component": "AnalyticsWidget"
      }],
      "sidebar": [{
        "id": "analytics.panel",
        "name": "Analytics",
        "icon": "chart-bar"
      }]
    },
    "settings": [
      {
        "key": "analytics.provider",
        "type": "select",
        "default": "google",
        "options": ["google", "umami", "plausible"]
      },
      {
        "key": "analytics.trackingId",
        "type": "string",
        "title": "Tracking ID"
      }
    ]
  },
  "permissions": [
    "dataProvider.getPosts",
    "dataProvider.getStats",
    "storage.read",
    "storage.write",
    "network.fetch",
    "ui.registerDashboardWidget",
    "ui.registerSidebarPanel"
  ]
}
```

#### 8.1.2 插件实现

```typescript
// src/index.ts
import { PluginContext } from "@hexo-cms/core";
import { AnalyticsWidget } from "./components/AnalyticsWidget";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { AnalyticsService } from "./services/AnalyticsService";

let analyticsService: AnalyticsService;

export async function activate(context: PluginContext): Promise<void> {
  // 初始化服务
  analyticsService = new AnalyticsService(context);
  await analyticsService.initialize();
  
  // 注册仪表板小部件
  context.ui.registerDashboardWidget({
    id: "analytics.widget",
    name: "访问统计",
    component: AnalyticsWidget,
    size: "medium",
    order: 10
  });
  
  // 注册侧边栏面板
  context.ui.registerSidebarPanel({
    id: "analytics.panel",
    name: "Analytics",
    icon: "chart-bar",
    component: AnalyticsPanel,
    order: 100
  });
  
  // 注册命令
  context.commands.registerCommand("analytics.refresh", async () => {
    await analyticsService.refresh();
    context.ui.showNotification("统计数据已刷新", "success");
  });
  
  // 监听文章保存事件
  context.events.on("post.afterSave", async (post) => {
    await analyticsService.trackPostUpdate(post);
  });
  
  context.logger.info("Analytics 插件已激活");
}

export async function deactivate(): Promise<void> {
  if (analyticsService) {
    await analyticsService.cleanup();
  }
}
```

#### 8.1.3 Analytics Service

```typescript
// src/services/AnalyticsService.ts
import { PluginContext, HexoPost } from "@hexo-cms/core";

export class AnalyticsService {
  private provider: "google" | "umami" | "plausible";
  private trackingId: string;
  
  constructor(private context: PluginContext) {
    this.provider = context.config.get("analytics.provider", "google");
    this.trackingId = context.config.get("analytics.trackingId", "");
  }
  
  async initialize(): Promise<void> {
    // 验证配置
    if (!this.trackingId) {
      this.context.logger.warn("Analytics Tracking ID 未配置");
      return;
    }
    
    // 加载历史数据
    const cachedData = await this.context.storage.get("analytics:cache");
    if (cachedData) {
      this.context.logger.info("已加载缓存的统计数据");
    }
  }
  
  async refresh(): Promise<void> {
    this.context.logger.info("刷新统计数据...");
    
    // 根据不同的提供商获取数据
    let data;
    switch (this.provider) {
      case "google":
        data = await this.fetchGoogleAnalytics();
        break;
      case "umami":
        data = await this.fetchUmamiAnalytics();
        break;
      case "plausible":
        data = await this.fetchPlausibleAnalytics();
        break;
    }
    
    // 缓存数据
    await this.context.storage.set("analytics:cache", data);
    await this.context.storage.set("analytics:lastUpdate", Date.now());
  }
  
  async trackPostUpdate(post: HexoPost): Promise<void> {
    // 记录文章更新事件
    const events = await this.context.storage.get<any[]>("analytics:events") || [];
    events.push({
      type: "post.update",
      postPath: post.path,
      timestamp: Date.now()
    });
    await this.context.storage.set("analytics:events", events);
  }
  
  private async fetchGoogleAnalytics(): Promise<any> {
    // 调用 Google Analytics API
    const response = await this.context.http.get(
      `https://analyticsdata.googleapis.com/v1beta/properties/${this.trackingId}/runReport`,
      {
        headers: {
          "Authorization": `Bearer ${await this.getAccessToken()}`
        }
      }
    );
    return response;
  }
  
  private async fetchUmamiAnalytics(): Promise<any> {
    // 调用 Umami API
    // ...
  }
  
  private async fetchPlausibleAnalytics(): Promise<any> {
    // 调用 Plausible API
    // ...
  }
  
  private async getAccessToken(): Promise<string> {
    // 从存储中获取 access token
    return await this.context.storage.get("analytics:accessToken") || "";
  }
  
  async cleanup(): Promise<void> {
    this.context.logger.info("Analytics 插件清理完成");
  }
}
```

### 8.2 Comments 插件

评论系统插件，支持 Disqus、Giscus、Waline 等。

#### 8.2.1 插件清单

```json
{
  "id": "hexo-cms-comments",
  "name": "Comments System",
  "version": "1.0.0",
  "description": "评论系统插件，支持 Disqus、Giscus、Waline",
  "main": "./dist/index.js",
  "activationEvents": ["onView:post-editor"],
  "contributes": {
    "views": {
      "editor": [{
        "id": "comments.panel",
        "name": "评论管理",
        "position": "right"
      }]
    },
    "settings": [
      {
        "key": "comments.provider",
        "type": "select",
        "default": "giscus",
        "options": ["disqus", "giscus", "waline"]
      },
      {
        "key": "comments.repo",
        "type": "string",
        "title": "GitHub Repository (for Giscus)",
        "when": "config.comments.provider == 'giscus'"
      }
    ]
  },
  "permissions": [
    "dataProvider.getPosts",
    "network.fetch",
    "ui.registerEditorPanel"
  ]
}
```

#### 8.2.2 插件实现

```typescript
// src/index.ts
import { PluginContext } from "@hexo-cms/core";
import { CommentsPanel } from "./components/CommentsPanel";
import { CommentsService } from "./services/CommentsService";

let commentsService: CommentsService;

export async function activate(context: PluginContext): Promise<void> {
  commentsService = new CommentsService(context);
  
  // 注册编辑器面板
  context.ui.registerEditorPanel({
    id: "comments.panel",
    name: "评论管理",
    component: CommentsPanel,
    position: "right"
  });
  
  // 注册命令
  context.commands.registerCommand("comments.sync", async () => {
    await commentsService.syncComments();
    context.ui.showNotification("评论已同步", "success");
  });
  
  // 监听文章保存事件
  context.events.on("post.afterSave", async (post) => {
    // 自动在文章 frontmatter 中添加评论配置
    if (!post.frontmatter.comments) {
      post.frontmatter.comments = true;
    }
  });
}

export async function deactivate(): Promise<void> {
  if (commentsService) {
    await commentsService.cleanup();
  }
}
```

### 8.3 Attachments 插件

附件管理插件，支持文件上传、管理、引用。

#### 8.3.1 插件清单

```json
{
  "id": "hexo-cms-attachments",
  "name": "Attachments Manager",
  "version": "1.0.0",
  "description": "附件管理插件，支持 PDF、ZIP 等文件上传和管理",
  "main": "./dist/index.js",
  "activationEvents": ["onView:media"],
  "contributes": {
    "views": {
      "media": [{
        "id": "attachments.panel",
        "name": "附件",
        "icon": "paperclip"
      }]
    },
    "commands": [{
      "command": "attachments.upload",
      "title": "上传附件",
      "icon": "upload"
    }],
    "contextMenu": [{
      "command": "attachments.copyLink",
      "title": "复制附件链接",
      "when": "view == 'media' && selection.type == 'attachment'"
    }]
  },
  "permissions": [
    "dataProvider.getMediaFiles",
    "dataProvider.uploadMedia",
    "dataProvider.deleteMedia",
    "ui.registerMediaPanel",
    "ui.registerCommand"
  ]
}
```

#### 8.3.2 插件实现

```typescript
// src/index.ts
import { PluginContext } from "@hexo-cms/core";
import { AttachmentsPanel } from "./components/AttachmentsPanel";
import { AttachmentsService } from "./services/AttachmentsService";

let attachmentsService: AttachmentsService;

export async function activate(context: PluginContext): Promise<void> {
  attachmentsService = new AttachmentsService(context);
  
  // 注册媒体面板
  context.ui.registerMediaPanel({
    id: "attachments.panel",
    name: "附件",
    icon: "paperclip",
    component: AttachmentsPanel
  });
  
  // 注册上传命令
  context.commands.registerCommand("attachments.upload", async () => {
    const file = await context.ui.showFilePicker({
      accept: ".pdf,.zip,.doc,.docx,.xls,.xlsx",
      multiple: false
    });
    
    if (file) {
      await attachmentsService.uploadAttachment(file);
      context.ui.showNotification("附件上传成功", "success");
    }
  });
  
  // 注册复制链接命令
  context.commands.registerCommand("attachments.copyLink", async (attachment) => {
    await navigator.clipboard.writeText(attachment.url);
    context.ui.showNotification("链接已复制", "success");
  });
  
  // 监听媒体上传事件
  context.events.on("media.afterUpload", async (result) => {
    // 记录上传历史
    await attachmentsService.recordUpload(result);
  });
}

export async function deactivate(): Promise<void> {
  if (attachmentsService) {
    await attachmentsService.cleanup();
  }
}
```

---

## 9. 插件注册中心

### 9.1 注册中心架构

```
┌─────────────────────────────────────────────────────────┐
│              Plugin Registry (插件注册中心)              │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Web UI (https://plugins.hexo-cms.com)        │    │
│  │  - 插件搜索                                     │    │
│  │  - 插件详情                                     │    │
│  │  - 用户评价                                     │    │
│  │  - 安装统计                                     │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  API Server                                     │    │
│  │  - GET /api/plugins (搜索插件)                 │    │
│  │  - GET /api/plugins/:id (获取插件详情)         │    │
│  │  - POST /api/plugins (发布插件)                │    │
│  │  - PUT /api/plugins/:id (更新插件)             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL)                          │    │
│  │  - plugins 表                                   │    │
│  │  - versions 表                                  │    │
│  │  - reviews 表                                   │    │
│  │  - downloads 表                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Storage (S3/CDN)                               │    │
│  │  - 插件包文件 (.tgz)                            │    │
│  │  - 插件图标                                     │    │
│  │  - 插件截图                                     │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 9.2 插件发布流程

#### 9.2.1 CLI 工具

```bash
# 安装 CLI
npm install -g @hexo-cms/plugin-cli

# 初始化插件项目
hexo-cms-plugin init my-plugin

# 开发模式
hexo-cms-plugin dev

# 构建插件
hexo-cms-plugin build

# 发布插件
hexo-cms-plugin publish
```

#### 9.2.2 发布步骤

1. **验证插件**

```bash
hexo-cms-plugin validate
```

检查项：
- `plugin.json` 格式正确
- 必需字段完整
- 版本号符合语义化版本
- 权限声明合理
- 依赖版本兼容

2. **构建插件**

```bash
hexo-cms-plugin build
```

生成：
- `dist/` 目录（编译后的代码）
- `plugin.tgz` 文件（打包文件）

3. **发布到注册中心**

```bash
hexo-cms-plugin publish
```

流程：
- 登录认证
- 上传插件包
- 安全扫描
- 代码审查（自动 + 人工）
- 发布成功

### 9.3 插件安装流程

#### 9.3.1 从注册中心安装

```typescript
// 在 Hexo CMS 中
const pluginManager = context.pluginManager;

// 搜索插件
const results = await pluginManager.search("analytics");

// 安装插件
await pluginManager.install("hexo-cms-analytics");

// 激活插件
await pluginManager.activate("hexo-cms-analytics");
```

#### 9.3.2 从本地安装

```typescript
// 开发模式：从本地目录安装
await pluginManager.installFromDirectory("/path/to/plugin");

// 从 .tgz 文件安装
await pluginManager.installFromFile("/path/to/plugin.tgz");
```

### 9.4 插件更新机制

```typescript
// 检查更新
const updates = await pluginManager.checkUpdates();

// 更新单个插件
await pluginManager.update("hexo-cms-analytics");

// 更新所有插件
await pluginManager.updateAll();
```

### 9.5 插件评价系统

```typescript
interface PluginReview {
  pluginId: string;
  userId: string;
  rating: number;  // 1-5 星
  comment: string;
  version: string;
  createdAt: Date;
}

// 提交评价
await pluginRegistry.submitReview({
  pluginId: "hexo-cms-analytics",
  rating: 5,
  comment: "非常好用的统计插件！"
});

// 获取评价
const reviews = await pluginRegistry.getReviews("hexo-cms-analytics");
```

---

## 10. 实施路线图

### 10.1 第一阶段：核心基础设施（2-3 周）

**目标**：建立插件系统的核心架构

#### 任务清单

1. **PluginManager 实现**
   - [ ] 插件加载/卸载
   - [ ] 生命周期管理
   - [ ] 权限控制
   - [ ] 错误隔离

2. **Plugin API 定义**
   - [ ] `PluginContext` 接口
   - [ ] `DataProvider` 访问
   - [ ] `UIExtensionAPI` 接口
   - [ ] `CommandAPI` 接口
   - [ ] `EventAPI` 接口

3. **Extension Registry**
   - [ ] 扩展点注册
   - [ ] 扩展注册
   - [ ] 条件表达式解析

4. **基础 UI 扩展点**
   - [ ] 侧边栏面板
   - [ ] 仪表板小部件
   - [ ] 设置面板

#### 验收标准

- [ ] 可以加载和卸载插件
- [ ] 插件可以注册侧边栏面板
- [ ] 插件可以注册仪表板小部件
- [ ] 插件可以访问 DataProvider
- [ ] 插件错误不影响核心功能

### 10.2 第二阶段：完善 API 和沙箱（2-3 周）

**目标**：完善插件 API，实现安全沙箱

#### 任务清单

1. **完善 Plugin API**
   - [ ] `StorageAPI` 实现
   - [ ] `ConfigAPI` 实现
   - [ ] `LoggerAPI` 实现
   - [ ] `HttpAPI` 实现

2. **沙箱实现**
   - [ ] Web 端 Worker 沙箱
   - [ ] Desktop 端 VM 沙箱
   - [ ] 权限检查机制
   - [ ] API 调用限流

3. **更多 UI 扩展点**
   - [ ] 编辑器工具栏
   - [ ] 上下文菜单
   - [ ] 对话框
   - [ ] 通知

4. **钩子系统**
   - [ ] 文章钩子
   - [ ] 媒体钩子
   - [ ] 主题钩子
   - [ ] 部署钩子

#### 验收标准

- [ ] 插件运行在沙箱中
- [ ] 权限系统正常工作
- [ ] 插件可以持久化数据
- [ ] 插件可以监听事件
- [ ] 插件可以注册命令

### 10.3 第三阶段：内置插件和工具（2-3 周）

**目标**：开发内置插件和开发工具

#### 任务清单

1. **内置插件**
   - [ ] Analytics 插件
   - [ ] Comments 插件
   - [ ] Attachments 插件

2. **开发工具**
   - [ ] Plugin CLI 工具
   - [ ] 插件模板生成器
   - [ ] 插件调试工具
   - [ ] 插件测试框架

3. **文档**
   - [ ] 插件开发指南
   - [ ] API 参考文档
   - [ ] 最佳实践
   - [ ] 示例插件

#### 验收标准

- [ ] 3 个内置插件可用
- [ ] CLI 工具可以创建插件项目
- [ ] 文档完整且易懂
- [ ] 有完整的示例代码

### 10.4 第四阶段：插件注册中心（3-4 周）

**目标**：建立插件生态系统

#### 任务清单

1. **注册中心后端**
   - [ ] API Server 实现
   - [ ] 数据库设计
   - [ ] 插件上传和存储
   - [ ] 安全扫描

2. **注册中心前端**
   - [ ] 插件搜索页面
   - [ ] 插件详情页面
   - [ ] 用户评价系统
   - [ ] 安装统计

3. **集成到 Hexo CMS**
   - [ ] 插件市场 UI
   - [ ] 一键安装
   - [ ] 自动更新
   - [ ] 评价和反馈

4. **运营和维护**
   - [ ] 插件审核流程
   - [ ] 安全监控
   - [ ] 性能监控
   - [ ] 用户支持

#### 验收标准

- [ ] 注册中心可以访问
- [ ] 可以搜索和安装插件
- [ ] 插件可以自动更新
- [ ] 有完善的审核机制

### 10.5 技术栈选择

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| 插件打包 | Rollup | 轻量，适合库打包 |
| 沙箱（Web） | Web Worker | 浏览器原生支持 |
| 沙箱（Desktop） | vm2 | Node.js 沙箱 |
| 注册中心后端 | Hono + PostgreSQL | 轻量，类型安全 |
| 注册中心前端 | Next.js | SSR，SEO 友好 |
| 存储 | S3 + CloudFront | 可靠，CDN 加速 |

### 10.6 风险和挑战

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 插件安全漏洞 | 高 | 严格审核，沙箱隔离，权限控制 |
| 性能影响 | 中 | 懒加载，限流，监控 |
| API 稳定性 | 高 | 语义化版本，向后兼容 |
| 生态建设 | 中 | 文档完善，示例丰富，社区运营 |

---

## 11. 总结

### 11.1 核心价值

Hexo CMS 插件系统将带来：

1. **可扩展性**：用户可以根据需求安装插件，而不是等待核心功能更新
2. **生态系统**：社区可以贡献插件，形成良性循环
3. **定制化**：企业用户可以开发私有插件，满足特殊需求
4. **核心稳定**：核心代码保持精简，插件独立维护

### 11.2 设计亮点

1. **类型安全**：完整的 TypeScript 类型定义
2. **跨平台一致**：Web 和桌面端使用相同的 API
3. **安全隔离**：沙箱机制保护核心功能
4. **声明式优先**：通过 manifest 声明能力
5. **借鉴最佳实践**：参考 VS Code、Figma、Obsidian 等成熟方案

### 11.3 下一步行动

1. **评审设计方案**：团队评审，收集反馈
2. **技术预研**：验证关键技术点（沙箱、权限控制）
3. **原型开发**：实现最小可用版本（MVP）
4. **迭代优化**：根据反馈持续改进

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-30  
**维护者**: Hexo CMS Team
