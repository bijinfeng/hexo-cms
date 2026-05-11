# Hexo CMS 平台 - 项目规划

## 项目概述

一个现代化的 Hexo 博客内容管理系统，通过 GitHub 集成实现博客内容的可视化管理和自动化部署。

## 设计系统

> **配色方案**: DESIGN_SYSTEM.md 为准，以下为摘要

### UI 风格
- **风格**: 年轻活力 · 现代简洁 · 双主题支持（参考 Vercel、Linear、Notion）
- **主色调**: Warm Orange `#F97316`（`--primary-500`）
- **辅色调**: Fresh Green `#22C55E`（`--accent-500`）
- **UI 字体**: Plus Jakarta Sans + Inter fallback
- **代码字体**: JetBrains Mono
- **设计原则**: 简洁、高效、开发者友好
- **深色模式**: class 切换 + CSS 变量

### 配色方案
```
主色 (Primary):          Warm Orange #F97316 (--primary-500)
强调色 (Accent):         Fresh Green #22C55E (--accent-500)
成功色 (Success):        #22C55E
警告色 (Warning):        #F59E0B
错误色 (Error):          #EF4444
信息色 (Info):           #3B82F6
```

## 核心功能模块

### 1. 认证与授权
- **GitHub OAuth 登录**
  - 使用 Better Auth 实现
  - GitHub 账号授权
  - 仓库访问权限管理

### 2. 仪表板 / 数据大盘
- 博客统计概览（文章数、标签数、分类数、评论数）
- 最近发布的文章列表
- GitHub Actions 部署状态实时监控
- 最近 git 提交历史
- 流量数据图表（后续通过 Analytics Dashboard 插件接入 Umami / Plausible）
- 待处理评论提醒（规划通过 Comments Overview 插件提供）
- 草稿文章提醒

### 3. 文章管理
- **文章列表**
  - 支持按状态筛选（已发布 / 草稿 / 归档）
  - 支持按分类、标签筛选
  - 支持全文搜索
  - 批量操作（删除、发布、归档）
  - 排序（时间、标题、浏览量）
- **文章编辑器**
  - 基于 CodeMirror 的 Markdown 编辑器
  - 实时分屏预览
  - Frontmatter 可视化编辑（标题、日期、标签、分类、封面图、摘要、SEO 信息）
  - 图片拖拽上传（自动上传到仓库 source/images 目录）
  - 代码块语法高亮
  - 快捷键支持
  - 自动保存草稿（本地 localStorage）
  - 字数统计、阅读时间估算
  - 文章版本历史（基于 git commit）

### 4. 分类管理
- 分类树形结构展示
- 新增 / 编辑 / 删除分类
- 分类文章数量统计
- 分类排序

### 5. 标签管理
- 标签云展示
- 新增 / 编辑 / 删除标签
- 标签文章数量统计
- 标签合并功能

### 6. 附件 / 媒体管理
- 图片、文件上传（存储到 GitHub 仓库 source/images 目录）
- 媒体库网格视图 / 列表视图
- 图片预览、复制链接
- 文件搜索和筛选
- 批量删除
- 文件大小、上传时间展示

### 7. 页面管理
- 独立页面列表（about、links 等）
- 页面编辑器（与文章编辑器共用）
- 页面路径管理

### 8. 主题管理
- 已安装主题列表
- 主题切换（修改 _config.yml）
- 主题配置可视化编辑（解析 _config.theme.yml）
- 主题预览链接

### 9. 评论管理
- 支持主流评论系统（Gitalk / Giscus / Disqus / Waline）
- 评论列表展示
- 评论审核（通过 / 拒绝 / 删除）
- 评论回复
- 垃圾评论过滤

### 10. 菜单 / 导航管理
- 导航菜单可视化编辑
- 拖拽排序
- 多级菜单支持

### 11. 站点配置
- 站点基本信息（标题、副标题、描述、关键词、作者）
- 可视化编辑 _config.yml
- 社交链接管理
- SEO 全局设置

### 12. GitHub 集成
- 仓库连接与授权
- 实时同步仓库内容
- 提交记录查看
- GitHub Actions 工作流状态监控
- 手动触发部署
- 分支管理（支持多分支工作流）

### 13. 部署管理
- 部署历史记录
- 部署状态实时推送（WebSocket / SSE）
- 部署日志查看
- 回滚到指定版本

### 14. 用户设置
- 个人资料编辑
- 编辑器偏好设置（主题、字体大小、自动保存间隔）
- 通知设置
- API Token 管理

### 15. 插件系统
- v0.1 已支持可信内置插件、manifest 校验、权限拦截、启用/停用和 Dashboard 声明式扩展点
- 首个内置插件 Attachments Helper 已落地，用于附件摘要、媒体文档筛选和复制链接辅助
- v0.2 已落地 Comments Overview、Settings schema renderer、插件配置持久化基础能力和插件级 ErrorBoundary
- v0.2 已继续补齐 Sidebar item、CommandRegistry 与错误阈值熔断，插件入口、命令执行和失败隔离链路已可验证
- 插件 Storage API 已落地，支持 Memory/Browser store、插件级 namespace 隔离、权限校验、Web SQLite/API route 和 Desktop userData IPC 持久化
- Event API core 已开始落地，支持只读订阅、宿主事件派发、权限校验和事件 handler 失败隔离
- 插件日志面板已落地，支持插件级 logger、命令/运行时错误日志记录、Settings 最近日志展示和敏感信息脱敏
- 核心页面事件派发已接入，文章、页面、媒体和部署操作会向插件 Event API 发出宿主事件
- Secret Store core 与 network.fetch core 已落地，支持密钥状态查询/写入/删除、HTTPS/allowedHosts/超时/cookie 限制
- 下一轮优先补 Secret Store 平台持久化与受控 network.fetch 平台代理，继续保证插件失败不影响核心页面
- 后续可插件化方向包括 SEO Inspector、Draft Coach、Link Checker、Theme Config Helper 和企业规范包
- Analytics Dashboard 延后到 Secret Store 与 network permission 稳定后实现

## 技术栈

### 前端
- **框架**: TanStack Start（全栈 React 框架，基于 Vite）
- **路由**: TanStack Router（类型安全路由）
- **状态管理**: TanStack Query（服务端状态）+ Zustand（客户端状态）
- **UI 组件**: shadcn/ui
- **样式**: Tailwind CSS v4
- **编辑器**: CodeMirror 6
- **图表**: Recharts
- **图标**: Lucide React
- **表单**: React Hook Form + Zod

### 后端（TanStack Start Server Functions）
- **认证**: Better Auth（GitHub OAuth）
- **数据库**: SQLite（本地）/ Turso（生产）
- **ORM**: Drizzle ORM
- **GitHub API**: Octokit.js
- **文件处理**: gray-matter（Frontmatter 解析）

### 部署
- **本地开发**: 本地 SQLite
- **生产部署**: Vercel / Cloudflare Workers

## 页面结构

```
/login                    # 登录页（GitHub OAuth）
/                         # 仪表板（数据大盘）
/posts                    # 文章列表
/posts/new                # 新建文章
/posts/:id/edit           # 编辑文章
/pages                    # 页面管理
/pages/new                # 新建页面
/pages/:id/edit           # 编辑页面
/categories               # 分类管理
/tags                     # 标签管理
/media                    # 媒体管理
/comments                 # 评论管理
/themes                   # 主题管理
/menus                    # 菜单管理
/deployments              # 部署管理
/settings                 # 站点设置
/settings/profile         # 个人设置
/settings/github          # GitHub 集成设置
```

## 原型图页面（Figma）

1. 登录页
2. 仪表板
3. 文章列表
4. 文章编辑器
5. 媒体管理
6. 评论管理
7. 主题管理
8. 站点设置

## 开发阶段规划

### Phase 1 - 基础架构（Week 1-2）
- 项目初始化（TanStack Start + shadcn + Tailwind）
- Better Auth 集成（GitHub OAuth）
- Drizzle ORM + SQLite 数据库设计
- 基础布局（侧边栏导航 + 顶部栏）

### Phase 2 - GitHub 集成（Week 2-3）
- Octokit 集成
- 仓库内容读取（文章、配置文件）
- 文件提交（创建/更新/删除）
- GitHub Actions 状态监控

### Phase 3 - 核心内容管理（Week 3-5）
- 文章列表 + 搜索筛选
- Markdown 编辑器（CodeMirror）
- Frontmatter 编辑
- 分类 / 标签管理
- 媒体上传管理

### Phase 4 - 高级功能（Week 5-7）
- 评论管理
- 主题管理
- 部署管理
- 数据大盘图表
- 插件系统 v0.1 MVP（可信内置插件 + Dashboard 扩展点）

### Phase 5 - 优化与完善（Week 7-8）
- 性能优化
- 移动端适配
- 错误处理完善
- 文档编写
- 插件系统 v0.2（Comments Overview + 插件配置/Settings 扩展 + 插件级 ErrorBoundary）
