# Hexo CMS — AI Context (CLAUDE.md)

> 这个文件是给 AI 助手（Claude / Kiro 等）读的，帮助快速理解项目上下文。

## 项目是什么

一个给 Hexo 博客用的 Web + 桌面端 CMS。用户通过浏览器或 Electron 桌面应用管理博客内容，所有改动通过 GitHub API 直接提交到 GitHub 仓库，触发 GitHub Actions 自动部署。**没有本地文件写入，GitHub 就是数据库。**

## 工程结构（Monorepo）

```
hexo-cms/                      ← pnpm workspace 根目录
├── .claude/                   ← Claude Code 配置
│   └── README.md             ← AI 文档入口
├── docs/                      ← 项目文档
│   ├── ai/
│   │   ├── AGENTS.md         ← AI 助手上下文
│   │   └── CLAUDE.md         ← 你在这里
│   ├── DESIGN_SYSTEM.md      ← 设计规范（颜色、字体、组件）
│   ├── PROJECT_PLAN.md       ← 功能规划
│   └── ...
├── pnpm-workspace.yaml       ← workspace 配置
├── package.json              ← 根 package（仅 scripts）
└── packages/
    ├── core/                 ← @hexo-cms/core：纯逻辑，无 UI
    ├── ui/                   ← @hexo-cms/ui：共享 React 组件和页面
    ├── web/                  ← @hexo-cms/web：TanStack Start 全栈 Web 应用
    └── desktop/              ← @hexo-cms/desktop：Electron 桌面应用
```

## 包职责

| 包 | 技术 | 职责 |
|---|---|---|
| `@hexo-cms/core` | TypeScript | GitHubService、类型定义，无 UI 依赖 |
| `@hexo-cms/ui` | React + Tailwind | 共享页面组件（纯 React，无路由） |
| `@hexo-cms/web` | TanStack Start | Web 应用，薄路由壳 + API 路由 |
| `@hexo-cms/desktop` | Electron + TanStack Router | 桌面应用，IPC 替代 HTTP API |

## 运行

```bash
# Web 开发
pnpm dev                    # 等同于 pnpm --filter @hexo-cms/web dev
pnpm --filter @hexo-cms/web dev

# 桌面开发
pnpm dev:desktop            # 等同于 pnpm --filter @hexo-cms/desktop dev
```

环境变量（`packages/web/.env`）：
```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## 技术栈

| 层 | 技术 |
|---|---|
| 框架（Web） | TanStack Start（Vite-based 全栈 React SSR） |
| 框架（桌面） | Electron + electron-vite + electron-builder |
| 路由 | TanStack Router（文件路由，自动生成 routeTree.gen.ts） |
| 认证（Web） | Better Auth 1.6.9 + GitHub OAuth（scope: repo, user） |
| 认证（桌面） | keytar 系统钥匙串存储 token |
| 数据库 | SQLite via better-sqlite3，文件 `./hexo-cms.db` |
| GitHub API | Octokit（@hexo-cms/core 中的 GitHubService） |
| 样式 | Tailwind CSS v4（@theme 语法，非 v3 config 文件） |
| 编辑器 | @uiw/react-codemirror + @codemirror/lang-markdown |
| 图标 | lucide-react |
| 包管理 | pnpm workspace |

## 文件结构详情

### packages/core/src/
```
index.ts            # 导出所有
types.ts            # GitHubConfig, HexoPost, GitHubRepoConfig
github.ts           # GitHubService 类（Octokit 封装）
data-provider.ts    # DataProvider 接口定义（平台无关抽象层）
```

### packages/ui/src/
```
index.ts          # 导出所有组件和页面
styles.css        # 全局样式（通过 @hexo-cms/ui/styles 导入）
context/
  data-provider-context.tsx  # DataProvider React Context + useDataProvider hook
pages/            # 纯 React 页面组件（无路由，无 createFileRoute）
  index.tsx       # DashboardPage
  posts.tsx       # PostsPage（含搜索/过滤/批量操作）
  posts.new.tsx   # NewPostPage
  posts.$slug.tsx # EditPostPage
  tags.tsx        # TagsPage（含重命名/删除）
  media.tsx       # MediaPage
  themes.tsx      # ThemesPage
  pages.tsx       # PagesPage
  pages.new.tsx   # NewPagePage
  pages.$slug.tsx # EditPagePage
  deploy.tsx      # DeployPage
  settings.tsx    # SettingsPage
  login.tsx       # LoginPage
components/
  layout/         # CMSLayout, Sidebar, Topbar
  ui/             # badge.tsx, button.tsx, card.tsx
utils.ts          # cn() 工具函数
```

### packages/web/src/
```
routes/           # TanStack Start 路由（薄壳，导入 @hexo-cms/ui 页面）
  __root.tsx      # 根布局，注入 WebDataProvider + 主题脚本
  index.tsx       # / → DashboardPage
  posts.tsx       # /posts → PostsPage
  ... 其他页面路由
  api/
    auth/$.ts         # Better Auth 处理器
    auth/token.ts     # GET /api/auth/token
    github/config.ts  # GET/POST /api/github/config
    github/posts.ts   # GET/POST/DELETE /api/github/posts
    github/pages.ts   # GET/POST/DELETE /api/github/pages
    github/tags.ts    # GET/POST/DELETE /api/github/tags
    github/media.ts   # GET/POST/DELETE /api/github/media
    github/stats.ts   # GET /api/github/stats
    github/themes.ts  # GET/POST /api/github/themes
    deploy.ts         # GET/POST /api/deploy
lib/
  auth.ts              # Better Auth 服务端配置
  auth-client.ts       # signIn, signOut, useSession
  web-data-provider.ts # WebDataProvider 实现（调用 HTTP API）
router.tsx        # 路由配置
styles.css        # @import "@hexo-cms/ui/styles"
vite.config.ts    # TanStack Start + Tailwind
tsconfig.json
```

### packages/desktop/src/
```
main/index.ts     # Electron 主进程（BrowserWindow + 20+ IPC handlers + GitHubService 缓存）
preload/index.ts  # contextBridge 暴露 electronAPI（含 IPC 通道白名单）
renderer/
  index.html      # 渲染进程入口 HTML
  src/
    main.tsx      # React 入口，RouterProvider
    env.d.ts      # Window.electronAPI 类型声明
    lib/
      desktop-data-provider.ts  # DesktopDataProvider 实现（调用 IPC）
    routes/       # TanStack Router 路由（同 web，但无 API 路由）
      __root.tsx  # 注入 DesktopDataProvider + CMSLayout
      index.tsx   # / → DashboardPage
      ... 其他页面路由
electron.vite.config.ts
electron-builder.yml
tsconfig.json
```

## 架构设计（DataProvider 模式）

### 核心理念：平台无关的数据层

借鉴 Notion、VS Code 等大厂产品的架构，使用 **DataProvider 接口** 实现 Web 和 Desktop 的代码共享：

```
┌─────────────────────────────────────────────────────────┐
│  @hexo-cms/ui (共享 UI 组件)                              │
│  - 所有页面组件通过 useDataProvider() 访问数据            │
│  - 不关心底层是 HTTP API 还是 IPC                         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ DataProvider 接口
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────▼────────┐                 ┌────────▼────────┐
│ WebDataProvider│                 │DesktopDataProvider│
│ (HTTP API)     │                 │ (Electron IPC)   │
└────────────────┘                 └──────────────────┘
```

### DataProvider 接口（`packages/core/src/data-provider.ts`）

定义了所有数据操作的抽象接口：

```ts
export interface DataProvider {
  // 配置管理
  getConfig(): Promise<GitHubConfig | null>;
  saveConfig(config: GitHubConfig): Promise<void>;
  
  // Token 管理
  getToken(): Promise<string | null>;
  saveToken(token: string): Promise<void>;
  deleteToken(): Promise<void>;
  
  // 文章管理
  getPosts(): Promise<HexoPost[]>;
  getPost(path: string): Promise<HexoPost>;
  savePost(post: HexoPost): Promise<void>;
  deletePost(path: string): Promise<void>;
  
  // ... 20+ 方法覆盖所有功能
}
```

### Web 端实现（`packages/web/src/lib/web-data-provider.ts`）

```ts
export class WebDataProvider implements DataProvider {
  async getPosts(): Promise<HexoPost[]> {
    const res = await fetch("/api/github/posts");
    const data = await res.json();
    return data.posts ?? [];
  }
  // ... 所有方法调用 HTTP API
}
```

在 `packages/web/src/routes/__root.tsx` 注入：

```tsx
const webProvider = new WebDataProvider();
<DataProviderProvider provider={webProvider}>
  <CMSLayout><Outlet /></CMSLayout>
</DataProviderProvider>
```

### 桌面端实现（`packages/desktop/src/renderer/src/lib/desktop-data-provider.ts`）

```ts
export class DesktopDataProvider implements DataProvider {
  async getPosts(): Promise<HexoPost[]> {
    return window.electronAPI.invoke("github:get-posts");
  }
  // ... 所有方法调用 IPC
}
```

在 `packages/desktop/src/renderer/src/routes/__root.tsx` 注入：

```tsx
const desktopProvider = new DesktopDataProvider();
<DataProviderProvider provider={desktopProvider}>
  <CMSLayout><Outlet /></CMSLayout>
</DataProviderProvider>
```

### UI 组件使用方式

所有 UI 组件通过 `useDataProvider()` 访问数据，无需关心平台：

```tsx
// packages/ui/src/pages/posts.tsx
import { useDataProvider } from "../context/data-provider-context";

export function PostsPage() {
  const dataProvider = useDataProvider();
  
  useEffect(() => {
    async function load() {
      const posts = await dataProvider.getPosts();  // 自动路由到正确实现
      setPosts(posts);
    }
    load();
  }, []);
}
```

### Electron 主进程架构（`packages/desktop/src/main/index.ts`）

**IPC Handlers**：主进程注册 20+ IPC 通道处理所有数据操作

**GitHubService 缓存**：避免重复读取配置文件和 keytar

```ts
let cachedGitHubService: GitHubService | null = null;
let cachedToken: string | null = null;
let cachedConfig: GitHubConfig | null = null;

async function getGitHubService(): Promise<GitHubService | null> {
  const config = loadConfig();
  const token = await keytar.getPassword("hexo-cms", "github-token");
  
  // 返回缓存实例（如果 config 和 token 未变）
  if (cachedGitHubService && cachedToken === token && 
      JSON.stringify(cachedConfig) === JSON.stringify(config)) {
    return cachedGitHubService;
  }
  
  // 创建新实例并缓存
  cachedGitHubService = new GitHubService(token, config);
  return cachedGitHubService;
}

// 在 config/token 变更时失效缓存
ipcMain.handle("config:save", (_event, config) => {
  saveConfigToFile(config);
  invalidateGitHubServiceCache();
});
```

**IPC 通道示例**：

```ts
ipcMain.handle("github:get-posts", async () => {
  const github = await getGitHubService();
  if (!github) return [];
  return github.getPosts();
});

ipcMain.handle("github:save-post", async (_event, post) => {
  const github = await getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  return github.savePost(post);
});
```

### Preload 安全层（`packages/desktop/src/preload/index.ts`）

**IPC 通道白名单**：防止渲染进程调用未授权通道

```ts
const ALLOWED_CHANNELS = [
  "get-token", "set-token", "delete-token",
  "config:get", "config:save",
  "github:get-posts", "github:get-post", "github:save-post",
  // ... 完整白名单
];

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel: string, ...args: any[]): Promise<any> => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
```

### 架构优势

1. **100% UI 代码共享**：所有页面组件在 Web 和 Desktop 完全复用
2. **类型安全**：DataProvider 接口保证两端实现一致
3. **易于测试**：可以 mock DataProvider 进行单元测试
4. **性能优化**：Desktop 端缓存 GitHubService，减少文件 I/O
5. **安全性**：Preload 白名单限制 IPC 通道访问

### GitHub Access Token 获取

**Web 端**：Better Auth 把 OAuth token 存在 `account` 表，通过 `GET /api/auth/token` 暴露给前端。

**桌面端**：通过 IPC 调用 `window.electronAPI.getToken()` 从系统钥匙串读取。

### GitHubService（`packages/core/src/github.ts`）

```ts
const svc = new GitHubService(accessToken, { owner, repo, branch? })
await svc.getPosts()          // 读取 source/_posts/*.md
await svc.getPost(path)       // 读取单篇，解析 frontmatter
await svc.savePost(post)      // 创建或更新文件（自动 commit）
await svc.deletePost(path)    // 删除文件（自动 commit）
```

### Web API 路由模式

```ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "../../lib/auth";  // 相对路径，非 #/ 别名

export const APIRoute = createAPIFileRoute("/api/xxx")({
  GET: async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
    return new Response(JSON.stringify(data), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  },
});
```

### 路径别名

- `packages/web`：`#/` → `./src/`
- `packages/desktop`：`#` → `./src/renderer/src/`

### 主题系统

- `localStorage.theme` 存 `'dark'` 或 `'light'`
- 根布局内联脚本在首屏前读取，避免闪烁
- CSS 用 `.dark` 类切换所有 `var(--token)` 变量
- **所有颜色用 `var(--token-name)`，不写死 hex**

### UI 包页面组件约定

```tsx
// packages/ui/src/pages/xxx.tsx
import { useDataProvider } from "../context/data-provider-context";

export function XxxPage() {
  const dataProvider = useDataProvider();  // 必须通过 DataProvider 访问数据
  return <div className="space-y-6 animate-fade-in">...</div>;
}

// packages/web/src/routes/xxx.tsx（薄壳）
import { createFileRoute } from "@tanstack/react-router";
import { XxxPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/xxx")({ component: XxxPage });
```

**重要**：UI 组件中禁止直接调用 `fetch("/api/...")` 或 `window.electronAPI`，必须通过 `useDataProvider()` 访问数据。

### 通用工具库约定

- Workspace 已安装 `es-toolkit`。
- 需要通用数组、对象、字符串、集合类工具时，优先考虑 `es-toolkit`，不要默认手写 helper。
- 新增工具函数前，先判断原生 JavaScript 是否足够；如果不够，再检查 `es-toolkit` 是否已有合适方法。
- 只有当逻辑是 HexoCMS 特有语义，或者直接用 `es-toolkit` 会明显降低可读性时，才手写实现。

## 设计系统速查

- 主色：Warm Orange `#f97316`（`--brand-primary`）
- 辅色：Fresh Green `#22c55e`（`--brand-accent`）
- UI 字体：Plus Jakarta Sans（`var(--font-sans)`）
- 代码字体：JetBrains Mono（`var(--font-mono)`）
- 输入框用 `.form-input` 类
- 卡片用 `<Card><CardContent>` 组件
- 动画入场用 `animate-fade-in`

详见 `DESIGN_SYSTEM.md`。

## 当前进度

| 功能 | 状态 |
|---|---|
| Monorepo 架构（core/ui/web/desktop）| ✅ 已完成 |
| 所有页面路由（11个）| ✅ 已完成（含静态 UI） |
| GitHub OAuth 登录（Web） | ✅ 已完成 |
| Settings 保存 GitHub 配置 | ✅ 已完成 |
| Posts 页从 GitHub 加载文章 | ✅ 已完成 |
| CodeMirror Markdown 编辑器 | ✅ 已完成 |
| Electron 桌面应用框架 | ✅ 已完成（main/preload/renderer） |
| 新建文章保存到 GitHub | ✅ 已完成 |
| 编辑已有文章 `/posts/$slug` | ✅ 已完成（含删除、图片上传） |
| Markdown 实时预览（渲染 HTML） | ✅ 已完成（marked 库） |
| 图片上传到 GitHub | ✅ 已完成（MediaPage 完整实现） |
| 标签/分类管理 | ✅ 已完成（读取、重命名、删除，批量更新文章） |
| 仪表板真实数据 | ✅ 已完成（/api/github/stats） |
| 桌面端 GitHub token 管理 UI | ✅ 已完成（系统钥匙串存储） |
| 页面管理（Pages） | ✅ 已完成（列表、新建、编辑、删除，完整 CRUD） |
| 部署管理（Deploy） | ✅ 已完成（GitHub Actions API，手动触发） |
| 主题管理（Themes） | ✅ 已完成（读取 _config.yml，列出 themes/ 目录，切换主题） |
| 文章搜索和过滤 | ✅ 已完成（全文搜索、状态/分类/日期过滤、高级筛选面板） |
| 文章批量操作 | ✅ 已完成（批量选择、批量删除、批量发布/取消发布） |
| DataProvider 架构重构 | ✅ 已完成（Web/Desktop 100% 共享 UI 代码） |

## 已知问题

1. **TypeScript 误报**：`@tanstack/react-start/api` 模块解析报错，运行时正常，忽略即可
2. **端口冲突**：dev server 可能用 3001/3002，`auth.ts` 的 `trustedOrigins` 已覆盖三个端口
3. **pnpm EPERM**：遇到权限错误删 `node_modules` 重装
4. **API 路由警告**：TanStack Router 插件会对 `api/` 下的文件报 "does not export a Route" 警告，这是正常的，运行时无影响
