# Hexo CMS — AI Context (CLAUDE.md)

> 这个文件是给 AI 助手（Claude / Kiro 等）读的，帮助快速理解项目上下文。

## 项目是什么

一个给 Hexo 博客用的 Web + 桌面端 CMS。用户通过浏览器或 Electron 桌面应用管理博客内容，所有改动通过 GitHub API 直接提交到 GitHub 仓库，触发 GitHub Actions 自动部署。**没有本地文件写入，GitHub 就是数据库。**

## 工程结构（Monorepo）

```
hexo-cms/                      ← pnpm workspace 根目录
├── CLAUDE.md                  ← 你在这里
├── DESIGN_SYSTEM.md           ← 设计规范（颜色、字体、组件）
├── PROJECT_PLAN.md            ← 功能规划
├── pnpm-workspace.yaml        ← workspace 配置
├── package.json               ← 根 package（仅 scripts）
└── packages/
    ├── core/                  ← @hexo-cms/core：纯逻辑，无 UI
    ├── ui/                    ← @hexo-cms/ui：共享 React 组件和页面
    ├── web/                   ← @hexo-cms/web：TanStack Start 全栈 Web 应用
    └── desktop/               ← @hexo-cms/desktop：Electron 桌面应用
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
index.ts          # 导出所有
types.ts          # GitHubConfig, HexoPost, GitHubRepoConfig
github.ts         # GitHubService 类（Octokit 封装）
```

### packages/ui/src/
```
index.ts          # 导出所有组件和页面
styles.css        # 全局样式（通过 @hexo-cms/ui/styles 导入）
pages/            # 纯 React 页面组件（无路由，无 createFileRoute）
  index.tsx       # DashboardPage
  posts.tsx       # PostsPage
  posts.new.tsx   # NewPostPage
  tags.tsx        # TagsPage
  media.tsx       # MediaPage
  comments.tsx    # CommentsPage
  themes.tsx      # ThemesPage
  pages.tsx       # PagesPage
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
  __root.tsx      # 根布局，注入主题脚本
  index.tsx       # / → DashboardPage
  posts.tsx       # /posts → PostsPage
  ... 其他页面路由
  api/
    auth/$.ts         # Better Auth 处理器
    auth/token.ts     # GET /api/auth/token
    github/config.ts  # GET/POST /api/github/config
    github/posts.ts   # GET/POST/DELETE /api/github/posts
lib/
  auth.ts         # Better Auth 服务端配置
  auth-client.ts  # signIn, signOut, useSession
router.tsx        # 路由配置
styles.css        # @import "@hexo-cms/ui/styles"
vite.config.ts    # TanStack Start + Tailwind
tsconfig.json
```

### packages/desktop/src/
```
main/index.ts     # Electron 主进程（BrowserWindow + IPC handlers）
preload/index.ts  # contextBridge 暴露 electronAPI
renderer/
  index.html      # 渲染进程入口 HTML
  src/
    main.tsx      # React 入口，RouterProvider
    env.d.ts      # Window.electronAPI 类型声明
    routes/       # TanStack Router 路由（同 web，但无 API 路由）
      __root.tsx  # CMSLayout 包裹
      index.tsx   # / → DashboardPage
      ... 其他页面路由
electron.vite.config.ts
electron-builder.yml
tsconfig.json
```

## 关键实现细节

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
export function XxxPage() {
  return <div className="space-y-6 animate-fade-in">...</div>;
}

// packages/web/src/routes/xxx.tsx（薄壳）
import { createFileRoute } from "@tanstack/react-router";
import { XxxPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/xxx")({ component: XxxPage });
```

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
| 新建文章保存到 GitHub | ❌ 未完成（按钮存在但未接 API） |
| 编辑已有文章 `/posts/$slug` | ❌ 未完成 |
| Markdown 实时预览（渲染 HTML） | ❌ 未完成 |
| 图片上传到 GitHub | ❌ 未完成 |
| 标签/分类读取真实数据 | ❌ 未完成 |
| 仪表板真实数据 | ❌ 未完成 |
| 桌面端 GitHub token 管理 UI | ❌ 未完成 |

## 已知问题

1. **TypeScript 误报**：`@tanstack/react-start/api` 模块解析报错，运行时正常，忽略即可
2. **端口冲突**：dev server 可能用 3001/3002，`auth.ts` 的 `trustedOrigins` 已覆盖三个端口
3. **pnpm EPERM**：遇到权限错误删 `node_modules` 重装
4. **API 路由警告**：TanStack Router 插件会对 `api/` 下的文件报 "does not export a Route" 警告，这是正常的，运行时无影响
