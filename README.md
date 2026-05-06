# Hexo CMS

<div align="center">

**现代化的 Hexo 博客内容管理系统**

一个为 Hexo 博客设计的 Web + 桌面端 CMS，通过 GitHub API 直接管理博客内容，无需本地文件操作。

[![CI Status](https://github.com/bijinfeng/hexo-cms/workflows/CI/badge.svg)](https://github.com/bijinfeng/hexo-cms/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[功能特性](#功能特性) • [快速开始](#快速开始) • [技术栈](#技术栈) • [开发指南](#开发指南) • [贡献指南](docs/CONTRIBUTING.md)

</div>

---

## 📖 项目简介

Hexo CMS 是一个现代化的博客内容管理系统，专为 Hexo 静态博客设计。它提供了 Web 端和桌面端两种使用方式，让你可以通过直观的图形界面管理博客内容，而无需手动编辑 Markdown 文件。

**核心特点**：
- 🌐 **双端支持**：Web 浏览器和 Electron 桌面应用
- 🔄 **GitHub 集成**：所有改动直接提交到 GitHub 仓库，触发自动部署
- 📝 **实时编辑**：Markdown 编辑器支持实时预览
- 🎨 **现代设计**：基于 Tailwind CSS 的现代化 UI，支持深色模式
- 🔐 **安全认证**：GitHub OAuth 登录，token 安全存储

---

## ✨ 功能特性

### 内容管理
- **文章管理**：创建、编辑、删除文章，支持草稿和发布状态
- **页面管理**：管理独立页面（About、Projects 等）
- **标签/分类管理**：统一管理标签和分类，支持重命名和删除
- **媒体管理**：上传和管理图片资源，自动提交到 GitHub

### 编辑体验
- **Markdown 编辑器**：基于 CodeMirror 的强大编辑器
- **实时预览**：边写边看，所见即所得
- **Front Matter 编辑**：可视化编辑文章元数据
- **图片上传**：拖拽上传图片，自动插入 Markdown 链接

### 部署管理
- **GitHub Actions 集成**：查看部署历史和状态
- **手动触发部署**：一键触发 GitHub Actions 工作流
- **部署日志查看**：实时查看部署进度和日志

### 主题管理
- **主题切换**：在线切换 Hexo 主题
- **主题预览**：查看已安装的主题列表
- **配置编辑**：直接编辑 _config.yml 配置文件

---

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **GitHub 账号**：用于 OAuth 登录和仓库访问

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/bijinfeng/hexo-cms.git
   cd hexo-cms
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   
   复制 `.env.example` 到 `packages/web/.env` 并填写配置：
   ```bash
   cp .env.example packages/web/.env
   ```
   
   编辑 `packages/web/.env`：
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```
   
   > 💡 如何获取 GitHub OAuth 凭证？参见 [GitHub OAuth 配置指南](#github-oauth-配置)

4. **启动开发服务器**
   
   **Web 端**：
   ```bash
   pnpm dev
   # 访问 http://localhost:3000
   ```
   
   **桌面端**：
   ```bash
   pnpm dev:desktop
   ```

### GitHub OAuth 配置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: Hexo CMS
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. 创建后获取 `Client ID` 和 `Client Secret`

---

## 🛠️ 技术栈

### 核心框架
- **[TanStack Start](https://tanstack.com/start)** - 全栈 React SSR 框架（Web 端）
- **[Electron](https://www.electronjs.org/)** - 跨平台桌面应用框架
- **[TanStack Router](https://tanstack.com/router)** - 类型安全的文件路由系统
- **[React 19](https://react.dev/)** - UI 框架

### 认证与数据
- **[Better Auth](https://www.better-auth.com/)** - 现代化认证解决方案
- **[Octokit](https://github.com/octokit/octokit.js)** - GitHub API 客户端
- **[SQLite](https://www.sqlite.org/)** - 轻量级数据库（via better-sqlite3）

### UI 与样式
- **[Tailwind CSS v4](https://tailwindcss.com/)** - 原子化 CSS 框架
- **[Lucide React](https://lucide.dev/)** - 现代图标库
- **[CodeMirror](https://codemirror.net/)** - 代码编辑器

### 开发工具
- **[pnpm](https://pnpm.io/)** - 快速、节省磁盘空间的包管理器
- **[Vite](https://vitejs.dev/)** - 下一代前端构建工具
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript
- **[Vitest](https://vitest.dev/)** - 单元测试框架

---

## 📁 项目结构

```
hexo-cms/
├── packages/
│   ├── core/              # 核心逻辑层（无 UI 依赖）
│   │   ├── src/
│   │   │   ├── github.ts           # GitHubService（Octokit 封装）
│   │   │   ├── types.ts            # 类型定义
│   │   │   └── data-provider.ts    # DataProvider 接口
│   │   └── package.json
│   │
│   ├── ui/                # 共享 UI 组件（平台无关）
│   │   ├── src/
│   │   │   ├── pages/              # 页面组件
│   │   │   ├── components/         # UI 组件
│   │   │   ├── context/            # React Context
│   │   │   └── styles.css          # 全局样式
│   │   └── package.json
│   │
│   ├── web/               # Web 应用
│   │   ├── src/
│   │   │   ├── routes/             # 文件路由
│   │   │   ├── lib/                # Web 特定逻辑
│   │   │   └── styles.css
│   │   └── package.json
│   │
│   └── desktop/           # 桌面应用
│       ├── src/
│       │   ├── main/               # Electron 主进程
│       │   ├── preload/            # Preload 脚本
│       │   └── renderer/           # 渲染进程
│       └── package.json
│
├── CLAUDE.md              # AI 助手上下文文档
├── docs/DESIGN_SYSTEM.md       # 设计系统规范
├── docs/PROJECT_PLAN.md        # 功能规划
└── pnpm-workspace.yaml    # Workspace 配置
```

### 架构设计

Hexo CMS 采用 **DataProvider 模式** 实现 Web 和 Desktop 端的代码共享：

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

这种架构实现了 **100% UI 代码共享**，参考了 VS Code、Notion 等大厂产品的设计模式。

---

## 💻 开发指南

### 🤖 AI 助手文档

本项目为 AI 编程助手（Claude Code、Cursor 等）提供了专门的上下文文档：

- **[AGENTS.md](docs/ai/AGENTS.md)** - AI 助手上下文，包含项目状态、已完成工作和待办事项
- **[CLAUDE.md](docs/ai/CLAUDE.md)** - Claude AI 项目上下文，包含工程结构、技术栈和开发指南

> 💡 **建议**：使用 AI 编程助手时，请先阅读这些文档以获得完整的项目上下文。

### 开发命令

```bash
# Web 端开发
pnpm dev                    # 启动 Web 开发服务器（端口 3000）
pnpm build                  # 构建 Web 生产版本
pnpm preview                # 预览 Web 生产构建

# 桌面端开发
pnpm dev:desktop            # 启动 Electron 开发模式
pnpm build:desktop          # 构建桌面应用安装包

# 测试
pnpm test                   # 运行所有包的测试
pnpm --filter @hexo-cms/web test    # 运行特定包的测试

# 代码检查
pnpm lint                   # 运行 ESLint（即将添加）
pnpm type-check             # TypeScript 类型检查
```

### 目录结构说明

- **packages/core**: 核心业务逻辑，无 UI 依赖
  - `GitHubService`: GitHub API 封装
  - `DataProvider`: 平台无关的数据访问接口
  - `types.ts`: 共享类型定义

- **packages/ui**: 共享 UI 组件
  - `pages/`: 页面组件（纯 React，无路由）
  - `components/`: 可复用 UI 组件
  - `context/`: React Context（DataProvider）

- **packages/web**: Web 应用
  - `routes/`: TanStack Start 文件路由
  - `lib/auth.ts`: Better Auth 配置
  - `lib/web-data-provider.ts`: Web 端 DataProvider 实现

- **packages/desktop**: 桌面应用
  - `main/`: Electron 主进程（IPC handlers）
  - `preload/`: Preload 脚本（安全层）
  - `renderer/`: 渲染进程（React 应用）

### 调试方法

**Web 端**：
- 打开浏览器开发者工具（F12）
- React DevTools 和 TanStack Router DevTools 已集成
- API 请求可在 Network 面板查看

**桌面端**：
- 主进程日志：查看终端输出
- 渲染进程：打开 DevTools（View → Toggle Developer Tools）
- IPC 通信：在 preload.ts 中添加 console.log

### 常见问题

**Q: pnpm install 报 EPERM 错误？**  
A: 删除 `node_modules` 和 `pnpm-lock.yaml`，重新运行 `pnpm install`

**Q: TypeScript 报 `@tanstack/react-start/api` 模块解析错误？**  
A: 这是已知的类型定义问题，运行时正常，可以忽略

**Q: 端口被占用？**  
A: Web 开发服务器默认使用 3000 端口，可在 `packages/web/package.json` 中修改

**Q: GitHub OAuth 回调失败？**  
A: 检查 `.env` 中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否正确，以及 GitHub OAuth App 的回调 URL 是否匹配

---

## 🏗️ 构建与部署

### Web 端部署

```bash
# 构建生产版本
pnpm build

# 输出目录：packages/web/.output/
# 可部署到 Vercel、Netlify、Cloudflare Pages 等平台
```

**推荐部署平台**：
- **Vercel**: 零配置部署，自动 CI/CD
- **Netlify**: 支持 SSR，易于配置
- **Cloudflare Pages**: 全球 CDN，性能优秀

### 桌面端打包

```bash
# 构建桌面应用
pnpm build:desktop

# 输出目录：packages/desktop/dist/
# 包含 Windows、macOS、Linux 安装包
```

**打包配置**：
- 配置文件：`packages/desktop/electron-builder.yml`
- 支持平台：Windows (NSIS)、macOS (DMG)、Linux (AppImage)

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！在提交 PR 之前，请阅读 [贡献指南](docs/CONTRIBUTING.md)。

### 开发流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m "feat: add your feature"`
4. 推送分支：`git push origin feat/your-feature`
5. 创建 Pull Request

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具链相关

---

## 📄 License

[MIT License](LICENSE) © 2026 [bijinfeng](https://github.com/bijinfeng)

---

## 🙏 致谢

本项目使用了以下优秀的开源项目：

- [TanStack Start](https://tanstack.com/start) - 全栈 React 框架
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Better Auth](https://www.better-auth.com/) - 现代化认证解决方案
- [Tailwind CSS](https://tailwindcss.com/) - 原子化 CSS 框架
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API 客户端

特别感谢所有贡献者的付出！

---

<div align="center">

**[⬆ 回到顶部](#hexo-cms)**

Made with ❤️ by [bijinfeng](https://github.com/bijinfeng)

</div>

