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

## 实施状态（Weeks 1-4）

已通过 4 轮实施完成所有 15 项工作：

| Week | 提交 | 内容 | 文件 | ±行 |
|------|------|------|------|-----|
| **W1** | `07a0bc5` | Logger + DataProviderError + 错误链修复 + ErrorBoundary + 测试 | 32 | +1171/-287 |
| **W2** | `07a0bc5` | DOMPurify + Electron sandbox + 清理 any + SaveIndicator + Onboarding | (同W1) | |
| **W3** | `2413689` | DataProvider 缓存层 (withCache) + 通用 ListPage + pages.tsx 重构 | 6 | +342/-144 |
| **W4** | `b96ab5a` | 可定制仪表板 (拖拽排序 + 显示切换 + localStorage) | 5 | +363/-142 |
| | **总计** | **15 项，~10.5d 工作量** | **43** | **+1876/-573** |

### 关键变更

| 模块 | 文件 | 变更 |
|------|------|------|
| 日志 | `core/src/logger.ts` | 结构化 JSON 日志，4 级 (debug/info/warn/error) |
| 错误类型 | `core/src/types.ts` | DataProviderError 含 5 种错误码 |
| 错误修复 | `core/src/github.ts` | Octokit 错误不再静默吞掉，抛类型化错误 |
| 错误修复 | `web/.../web-data-provider.ts` | 所有方法检查 res.ok，抛 DataProviderError |
| 错误修复 | `desktop/.../main/index.ts` | IPC handlers 全部 try-catch |
| 安全 | `ui/src/sanitize.ts` | DOMPurify 净化 4 个编辑器页面 |
| 安全 | `desktop/.../main/index.ts` | Electron sandbox: false → true |
| 稳定性 | `ui/src/components/error-boundary.tsx` | 全局 + 页面级 ErrorBoundary |
| 引导 | `ui/src/pages/onboarding.tsx` | 3 步引导向导 |
| 指标 | `ui/src/components/save-indicator.tsx` | 保存状态指示 (idle/saving/saved/error) |
| 缓存 | `ui/src/with-cache.ts` | DataProvider 装饰器，60s TTL |
| 组件 | `ui/src/components/list-page.tsx` | 通用列表页，带 loading/empty/error/search |
| 仪表板 | `ui/src/components/dashboard-widgets.tsx` | @dnd-kit 拖拽布局，localStorage 持久 |
| 文档 | `PROJECT_PLAN.md` | 配色方案更新为 Warm Orange |

### 推迟到以后
- 智能 Frontmatter 编辑（SEO 描述、OG 图片、一键 slug）
- 插件系统 MVP（Web Worker 沙箱 + UI 扩展点）

## 已知技术债务（已修复）
- ~~github.ts 静默吞所有 Octokit 错误~~ ✅ 改为抛 DataProviderError
- ~~WebDataProvider 不检查 HTTP 响应状态码~~ ✅ 所有方法检查 res.ok
- ~~Desktop IPC handlers 部分无 try-catch~~ ✅ 全部包裹
- ~~所有错误用 generic `catch (err: any)`~~ ✅ 部分已改，core 层改用类型化错误
- ~~Markdown 预览用 `dangerouslySetInnerHTML`~~ ✅ 已加 DOMPurify
- ~~零测试覆盖~~ ✅ 84 tests (63 core + 21 ui)
- ~~Project 规范颜色冲突~~ ✅ PROJECT_PLAN.md 已更新
