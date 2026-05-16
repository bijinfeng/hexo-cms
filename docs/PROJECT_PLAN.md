# Hexo CMS — 功能规划与完成度

> **最后更新**: 2026-05-16
> **下一步规划**: 见 `docs/ROADMAP.md`

## 项目概述

一个现代化的 Hexo 博客内容管理系统，通过 GitHub API 直接管理博客内容，提供 Web + 桌面端双端体验。GitHub 即数据库，所有改动自动提交并触发部署。

---

## 设计系统

详见 `docs/DESIGN_SYSTEM.md`。

- **风格**: 年轻活力 · 现代简洁 · 深色/浅色双主题
- **主色调**: Warm Orange `#F97316`
- **辅色调**: Fresh Green `#22C55E`
- **UI 字体**: Plus Jakarta Sans + Inter
- **代码字体**: JetBrains Mono

---

## 核心功能模块

状态标记: ✅ 已完成 | 🔸 部分完成 | ❌ 未实现

### 1. 认证与授权 ✅

- ✅ GitHub OAuth 登录（Web: Better Auth, Desktop: Device Flow）
- ✅ Onboarding 项目导入（仓库搜索/验证/配置）
- ✅ 仓库访问权限管理
- ✅ Token 安全存储（Web: DB, Desktop: keytar）

### 2. 仪表板 / 数据大盘 ✅

- ✅ 博客统计概览（文章数、标签数、分类数）
- ✅ 最近发布文章列表
- ✅ 快速操作入口
- ❌ 流量数据图表（待 Analytics 插件）
- ❌ 待处理评论提醒

### 3. 文章管理 ✅

**文章列表**:
- ✅ 状态筛选（已发布/草稿/归档）
- ✅ 分类、标签筛选
- ✅ 全文搜索
- ✅ 批量操作（删除、发布/取消发布）
- ✅ 高级筛选面板（日期范围等）

**文章编辑器 (TipTap)**:
- ✅ WYSIWYG + 源码模式切换
- ✅ 实时 Markdown 预览（marked + DOMPurify）
- ✅ Frontmatter 可视化编辑（标题、日期、标签、分类、slug）
- ✅ 图片拖拽/粘贴上传
- ✅ 封面图设置
- ❌ 自动保存草稿（localStorage）
- ❌ 字数统计、阅读时间估算
- ❌ 文章版本历史（基于 git commit）

### 4. 标签/分类管理 ✅

- ✅ 标签和分类统一管理（Tab 切换）
- ✅ 重命名（批量更新所有文章）
- ✅ 删除（批量清理所有文章）
- ✅ 文章数量统计
- ✅ 搜索筛选
- ❌ 分类树形结构展示
- ❌ 标签合并功能

### 5. 媒体管理 ✅

- ✅ 图片/文件上传到 GitHub 仓库
- ✅ 网格/列表视图切换
- ✅ 复制 Markdown 链接
- ✅ 删除媒体
- ✅ 文件大小展示
- ❌ 批量删除

### 6. 页面管理 ✅

- ✅ 独立页面列表
- ✅ 页面编辑器（共用 TipTap 编辑器）
- ✅ 页面路径/URL 管理
- ✅ 删除/状态切换

### 7. 主题管理 ✅

- ✅ 已安装主题列表
- ✅ 当前主题标识
- ✅ 主题切换（修改 _config.yml）
- ❌ 主题配置可视化编辑
- ❌ 主题预览链接

### 8. 评论管理 🔸

- ✅ 评论列表 UI（筛选/搜索/状态切换）
- ✅ 审核操作（通过/拒绝/删除）
- 🔸 使用静态 mock 数据，未接入真实评论系统
- ❌ Gitalk / Giscus / Disqus / Waline 集成

### 9. 菜单/导航管理 ❌

- ❌ 整个模块未实现

### 10. 站点配置 ✅

- ✅ 站点基本信息（标题、描述、URL、作者）
- ✅ GitHub 集成配置（owner/repo/branch/目录/工作流）
- ✅ 个人资料编辑
- ✅ 通知设置
- ✅ 插件管理
- ✅ 安全设置
- ❌ 可视化编辑 _config.yml（目前仅 themes 页编辑 theme 字段）

### 11. GitHub 集成 ✅

- ✅ 仓库连接与授权
- ✅ GitHubService（Octokit 封装，10 个公共方法）
- ✅ 文件 CRUD（文章/页面/媒体/配置）
- ✅ GitHub Actions 工作流状态监控
- ✅ 手动触发部署
- ❌ 提交记录查看
- ❌ 多分支工作流

### 12. 部署管理 ✅

- ✅ 部署历史记录
- ✅ 手动触发部署
- ✅ 部署状态展示（成功/失败/运行中）
- ❌ 部署状态实时推送（WebSocket/SSE）
- ❌ 部署日志查看
- ❌ 回滚到指定版本

### 13. 用户设置 ✅

- ✅ 个人资料编辑
- ✅ 通知设置
- ✅ 安全设置（2FA、清缓存）
- ❌ 编辑器偏好设置（主题、字体大小）
- ❌ API Token 管理

### 14. 桌面端 ✅

- ✅ Electron 应用框架（main/preload/renderer）
- ✅ 44 个 IPC 处理器
- ✅ 系统钥匙串 token 存储
- ✅ 窗口控制（最小化/最大化/关闭）
- ✅ 系统托盘
- ✅ 自动更新（electron-updater + Stable/Beta 通道）
- ✅ 多平台打包（macOS/Windows/Linux）

### 15. 插件系统 ✅

- ✅ Manifest 校验/解析
- ✅ PluginManager（install/enable/disable/uninstall）
- ✅ ExtensionRegistry（dashboard/widget/settings/sidebar/command）
- ✅ CommandRegistry（插件命令注册和执行）
- ✅ 权限系统（11 种权限类型）
- ✅ PluginStorage API（Memory/Browser/SQLite 持久化）
- ✅ PluginSecrets API（加密存储）
- ✅ PluginHTTP API（受控网络代理 + 审计日志）
- ✅ PluginEvent API（只读订阅 + 宿主事件派发）
- ✅ 插件日志面板（敏感信息脱敏）
- ✅ 插件级 ErrorBoundary + 错误阈值熔断
- ✅ 内置插件: Attachments Helper, Comments Overview
- ❌ 第三方插件沙箱（iframe/Worker/独立进程）
- ❌ 插件市场/注册中心

### 16. 工程基础设施 ✅

- ✅ CI/CD（GitHub Actions: lint + type-check + test + build）
- ✅ ESLint + TypeScript 严格模式
- ✅ Conventional Commits + commitlint + husky
- ✅ pnpm workspace + catalog 依赖管理
- ✅ 42+ 测试文件（unit + integration + component）
- ✅ 桌面端发版 workflow（Release CI + draft release）
- ❌ E2E 测试（Playwright）
- ❌ 移动端适配

---

## 技术栈

| 层 | 技术 |
|---|---|
| Monorepo | pnpm workspace |
| Web 框架 | TanStack Start (Vite-based SSR) |
| 桌面框架 | Electron + electron-vite + electron-builder |
| 路由 | TanStack Router (文件路由) |
| 认证 | Better Auth + GitHub OAuth |
| 数据库 | SQLite (better-sqlite3) + Drizzle ORM |
| GitHub API | Octokit |
| 编辑器 | TipTap (WYSIWYG + 源码切换) |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 图标 | lucide-react |
| 测试 | Vitest + Testing Library |
| 桌面更新 | electron-updater |

---

## 页面路由

```
/onboarding               # 项目导入
/login                    # 登录
/                         # 仪表板
/posts                    # 文章列表
/posts/new                # 新建文章
/posts/:slug              # 编辑文章
/pages                    # 页面管理
/pages/new                # 新建页面
/pages/:slug              # 编辑页面
/tags                     # 标签/分类管理
/media                    # 媒体管理
/comments                 # 评论管理（mock）
/themes                   # 主题管理
/deploy                   # 部署管理
/settings                 # 站点设置
```

---

## 架构摘要

```
@hexo-cms/core   → 纯逻辑（GitHubService, DataProvider 接口, 插件系统）
@hexo-cms/editor → TipTap 富文本编辑器
@hexo-cms/ui     → 共享 React 组件和页面（通过 useDataProvider() 访问数据）
@hexo-cms/web    → Web 应用（WebDataProvider → HTTP API → GitHubService）
@hexo-cms/desktop→ 桌面应用（DesktopDataProvider → IPC → GitHubService）
```

DataProvider 模式实现 Web/Desktop **100% UI 代码共享**，参考 VS Code 和 Notion 架构。
