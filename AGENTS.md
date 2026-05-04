# Hexo CMS — AI 助手上下文（AGENTS.md）

> 自动生成自 /plan-ceo-review + /plan-eng-review (2026-05-04)
> 用于后续 AI 助手了解项目状态和待办

## 产品定位

- **项目**：hexo-cms — 给 Hexo 博客用的 Web + 桌面端 CMS
- **差异化**：Electron 桌面端零部署 + Hexo 深度定制
- **核心用户**：现有 Hexo 用户，提升编辑效率
- **定位**：开源社区项目
- **最酷的版本**：插件化 CMS 平台（插件系统已设计但未实现）

## 设计风格

- **主色**：Warm Orange `#f97316`（--primary-500）
- **辅色**：Fresh Green `#22c55e`（--accent-500）
- **UI 字体**：Plus Jakarta Sans + Inter fallback
- **代码字体**：JetBrains Mono
- **设计规范**：DESIGN_SYSTEM.md（PROJECT_PLAN.md 中的旧配色已过时）
- **深色模式**：class 切换 + CSS 变量

## 两轮评审结果

模式：SELECTIVE EXPANSION（守住现有范围 + 选做扩展）

### 采纳的工作项

| # | 内容 | 工作量 | 类型 |
|---|------|--------|------|
| 1 | Onboarding 首次启动引导（token → 自动检测仓库 → 拉取文章） | ~1d | UX |
| 2 | 保存/部署状态指示灯（编辑器状态栏） | ~0.5d | UX |
| 3 | Error Boundary（全局 + 页面级） | ~0.5d | 稳定性 |
| 4 | 错误处理修复 — github.ts 不吞错 + WebDataProvider 检查 res.ok | ~1d | 稳定性 |
| 5 | DataProvider 错误类型（DataProviderError 区分各类错误） | ~0.5d | 架构 |
| 6 | DOMPurify 净化 Markdown 预览 + Electron sandbox | ~1d | 安全 |
| 7 | 清理 any 类型 + 硬编码字符串（~15处） | ~0.5d | 代码质量 |
| 8 | 提取通用 ListPage 组件（loading/empty/error + 搜索/过滤） | ~0.5d | 代码质量 |
| 9 | GitHubService 缓存浅比较（JSON.stringify → 字段比较） | ~0.1d | 代码质量 |
| 10 | DataProvider 共享工厂函数 | ~0.5d | 架构 |
| 11 | DataProvider 缓存层（TTL 60秒，Cache-First） | ~0.5d | 性能 |
| 12 | Logger 系统（结构化 JSON 日志，GitHubService + IPC） | ~1d | 可观测性 |
| 13 | 核心模块测试（Vitest + testing-library，4个模块） | ~2d | 测试 |
| 14 | 可定制仪表板 Widget（拖拽布局） | ~1d | 功能 |
| 15 | 更新 PROJECT_PLAN.md 配色 | ~0.5d | 文档 |
| | **总计** | **~10.5d** | |

### 推迟到以后
- 智能 Frontmatter 编辑（SEO 描述、OG 图片、一键 slug）
- 插件系统 MVP（Web Worker 沙箱 + UI 扩展点）

## 已知技术债务
- github.ts 静默吞所有 Octokit 错误（rate limit / 401 / 403 / 网络断开）
- WebDataProvider 不检查 HTTP 响应状态码
- Desktop IPC handlers 部分无 try-catch
- 所有错误用 generic `catch (err: any)`，不分类型
- Markdown 预览用 `dangerouslySetInnerHTML` 无净化
- 零测试覆盖
- Project 规范（PROJECT_PLAN.md vs DESIGN_SYSTEM.md）颜色冲突
