# Hexo CMS 插件系统 PRD

> **版本**: 1.2.3
> **最后更新**: 2026-05-12
> **状态**: v0.2 可信插件扩展与稳定性能力已继续补强，继续迭代中
> **关联技术方案**: [TECHNICAL_DESIGN_PLUGIN_SYSTEM.md](./TECHNICAL_DESIGN_PLUGIN_SYSTEM.md)

---

## 1. 背景

Hexo CMS 当前已经具备内容管理、媒体管理、主题管理、部署管理等核心能力。随着用户场景扩展，继续把统计、评论、附件、SEO、企业工作流等能力直接放进核心应用，会带来三个问题:

1. 核心功能边界膨胀，发布风险增大。
2. 不同用户对第三方服务的偏好差异大，内置所有集成不现实。
3. 企业和高级用户需要自定义工作流，但核心仓库不应承载所有定制需求。

本 PRD 目标是定义一个可渐进落地的插件系统，让 Hexo CMS 在不牺牲安全性和核心稳定性的前提下支持扩展。

---

## 2. 目标

### 2.1 产品目标

1. 建立稳定的插件基础能力，让内置扩展可以脱离核心页面迭代。
2. 首版支持可信内置插件，不开放任意第三方代码执行。
3. 通过声明式 manifest 注册 UI 入口、设置项和权限需求。
4. 插件可被启用、停用、配置和诊断，插件失败不影响核心内容管理流程。
5. 为后续第三方插件、私有插件和插件市场预留演进路径。

### 2.2 当前实现状态

截至 2026-05-11，插件系统 v0.1 MVP、v0.2 首批能力与稳定性补强已完成:

1. `packages/core/src/plugin` 提供 manifest 校验、权限拦截、ExtensionRegistry、PluginManager 和内置插件清单。
2. Web 与 Desktop 根布局已接入 `PluginProvider`，共享同一套插件状态与声明式扩展协议。
3. Settings 已提供插件管理入口，支持查看内置插件、权限摘要、启用和停用。
4. Settings 已支持声明式 schema renderer，内置插件可贡献 `string`、`url`、`select`、`boolean` 配置字段。
5. 插件配置已按 plugin id 隔离并持久化到浏览器 `localStorage`，刷新或重新挂载后可恢复。
6. Dashboard 已支持插件小部件扩展，Attachments Helper 与 Comments Overview 已贡献小部件。
7. Comments Overview 已支持评论服务类型、评论后台 URL 和待审核提醒开关，并将配置应用到 dashboard widget。
8. Media 页面已按 Attachments Helper 的启停状态控制文档筛选、文件名搜索和顶栏搜索入口。
9. 插件级 ErrorBoundary 已覆盖 Dashboard widget 与 Settings schema 贡献区域，renderer 抛错只影响对应插件区域。
10. `PluginManager.recordPluginError` 已将运行时错误写入 `record.lastError`，Settings 插件卡片展示最近错误。
11. Sidebar item 扩展点已挂载到 `CMSLayout`，启用插件后可从侧边栏进入插件设置入口。
12. `CommandRegistry` 已支持命令注册、执行、权限校验、缺失命令/handler 错误返回，并接入 Comments Overview 与 Attachments Helper 的宿主命令。
13. `recordPluginError` 已增加连续错误计数与默认 3 次错误阈值熔断；熔断后插件进入 `error` 状态并移除贡献入口，Settings 可重试启用。
14. 插件 Storage API core 已开始落地，提供 Memory/Browser store、`pluginId` namespace 隔离和 `pluginStorage.read/write` 权限校验。
15. Event API core 已开始落地，提供只读订阅、宿主事件派发、`event.subscribe` 权限校验和事件 handler 失败隔离。
16. 插件日志面板已落地，提供 Memory/Browser log store、插件级 logger、命令/运行时错误日志记录、Settings 最近日志展示和脱敏。
17. 核心页面事件派发已接入 UI DataProvider 层，覆盖文章保存/删除、页面保存/删除、媒体上传/删除、部署触发和部署状态变化。
18. 插件 Storage API 平台持久化已接入，Web 通过 SQLite/API route 保存，Desktop 通过 IPC 保存到 userData。
19. Secret Store core 已接入，插件只能查询是否已配置、写入和删除自身 secret，不能读取明文。
20. 受控 network.fetch core 已接入，限制 HTTPS、allowedHosts、超时和 cookie。
21. 已覆盖 core 插件单元测试、UI 插件管理测试、配置持久化测试、媒体边界测试、布局边界测试、ErrorBoundary 测试、Sidebar/Command/Storage/Event/Log/Secret/Network 测试和 switch 组件回归测试。

v0.2 仍需继续补齐:

1. Secret Store 平台持久化、受控网络代理平台适配和第三方插件沙箱。
2. 插件状态、配置和日志的完整平台持久化。当前 state/config/log 仍主要使用 renderer 侧 localStorage，后续 Web 应落到服务端/SQLite，Desktop 应落到 userData。

v0.2 不再包含的已落地项:

1. 插件设置面板 schema renderer。
2. 插件配置持久化基础能力。
3. Comments Overview 内置插件。
4. 插件级 ErrorBoundary 与最近错误展示。
5. Sidebar item 实际挂载。
6. CommandRegistry 注册、执行、权限校验和错误返回。
7. 错误阈值熔断。
8. 插件 Storage API core: Memory/Browser store、namespace 隔离和权限校验。
9. Event API core: 只读订阅、宿主派发和事件 handler 失败隔离。
10. 插件日志面板: logger API、最近日志展示和敏感信息脱敏。
11. 核心页面事件派发: 文章、页面、媒体、部署操作通过 DataProvider wrapper 发出宿主事件。
12. 插件 Storage API 平台持久化: Web SQLite/API route 与 Desktop userData IPC。
13. Secret Store core: has/set/delete、`pluginId` 隔离和不返回明文。
14. network.fetch core: HTTPS、allowedHosts、超时、禁 cookie 和权限校验。

### 2.3 非目标

以下内容不纳入首版:

1. 公共插件市场、评价系统、自动更新。
2. 从任意 URL、npm 包、tgz 文件安装未审核插件。
3. 插件直接渲染任意 React 组件到宿主应用。
4. 插件直接访问 GitHub OAuth token 或宿主内部密钥。
5. 插件自定义认证扩展协议。
6. 插件修改核心路由、绕过权限守卫或替换 DataProvider 实现。

---

## 3. 用户与场景

### 3.1 目标用户

1. 普通博主: 希望按需启用统计、评论、SEO 等增强能力。
2. 高级用户: 希望按自己的博客工作流添加工具面板和自动化命令。
3. 企业/团队用户: 希望通过私有插件沉淀团队规范和发布流程。
4. 开发者: 希望有稳定 API 开发扩展，但不需要在首版进入公共市场。

### 3.2 核心场景

1. 管理员在设置页查看系统内置插件列表。
2. 管理员启用首个内置插件，例如 Attachments Helper。
3. 插件在仪表板贡献一个统计小部件，并在设置页贡献配置项。
4. 插件只获得声明范围内的能力，例如读取文章列表和写入自身配置。
5. 插件运行失败时，用户看到可恢复提示，核心文章编辑和部署不受影响。

### 3.3 插件化适用准则

一个能力适合插件化，需要满足至少两项:

1. 依赖可选服务或外部平台，例如评论、统计、搜索、SEO、通知、翻译。
2. 用户差异明显，不同站点需要不同实现或不同配置。
3. 失败后不应阻塞核心内容编辑、媒体管理、登录和部署流程。
4. 可以通过声明式扩展点表达，不需要接管核心路由、认证或 DataProvider。
5. 权限边界清晰，可以用现有 capability 或少量新增 capability 描述。
6. 可以独立启用、停用、配置、诊断和测试。

以下能力不适合首批插件化:

1. 登录、仓库授权、token 管理。
2. 文章/页面核心编辑保存链路。
3. 部署触发与回滚等高风险写操作。
4. 需要任意本地文件系统、shell 或原始 Electron IPC 的能力。
5. 与全局路由守卫、应用启动和数据同步强耦合的基础设施。

### 3.4 可插件化场景池

优先级按安全性、复用价值和对现有架构的验证价值排序。

| 场景 | 插件候选 | 价值 | 需要的能力 | 建议阶段 |
|------|----------|------|------------|----------|
| 评论入口与提醒 | Comments Overview | 汇总 Giscus/Waline 入口和待审核提醒 | Settings schema、Dashboard widget、可选 Command | v0.2 已启动 |
| 附件辅助 | Attachments Helper | 媒体库文档筛选、附件摘要、复制链接 | content.read、Dashboard widget、Media 边界开关 | v0.1 已落地 |
| SEO 检查 | SEO Inspector | 检查标题、摘要、slug、frontmatter、图片 alt | content.read、editor/sidebar panel、diagnostics | v0.2+ |
| 草稿健康度 | Draft Coach | 草稿超期提醒、字数/封面/标签完整性检查 | content.read、Dashboard widget、Event API | v0.2+ |
| 链接检查 | Link Checker | 扫描文章外链和站内链接失效 | content.read、network.fetch、Command API | v0.3 前置 |
| 站点地图/Feed 预览 | Sitemap & Feed Preview | 预览生成结果和缺失页面 | content.read、settings panel、command | v0.2+ |
| 统计分析 | Analytics Dashboard | 接入 Umami/Plausible 摘要 | Secret Store、network.fetch、Dashboard widget | v0.3 |
| 发布前检查 | Publish Checklist | 团队发布规范、缺失字段、敏感词提示 | Event API、diagnostics、可选 content.write 审批 | v0.3+ |
| 图像优化建议 | Image Optimizer Advisor | 找出过大图片、缺失尺寸、重复资源 | content.read、media.read、Command API | v0.3+ |
| 通知集成 | Notification Bridge | 发布、评论、部署状态通知到 Slack/Discord | Event API、Secret Store、network.fetch | v0.3+ |
| 主题配置助手 | Theme Config Helper | 为不同主题提供配置 schema 和校验 | config.read、settings schema、可选 config.write | v0.3+ |
| 企业规范包 | Team Policy Pack | 固化分类、标签、SEO、审批规范 | diagnostics、Event API、私有插件源 | v1.0 |

下一批内置插件建议优先选择:

1. `SEO Inspector`: 不需要 Secret Store，能验证 content diagnostics 与编辑/设置扩展点。
2. `Draft Coach`: 不需要外部网络，能验证 Event API 和 dashboard 提醒。
3. `Link Checker`: 需要受控 network.fetch，适合在网络代理能力完成后验证安全边界。

---

## 4. 范围

### 4.1 首版必须支持 (Must)

1. 内置插件发现、启用、停用。
2. 插件 manifest 校验。
3. 插件状态管理: `installed`、`enabled`、`disabled`、`error`。
4. 声明式 UI 扩展点:
   - 仪表板小部件。
   - 设置页配置面板。
   - 侧边栏入口。
5. 受控 Plugin API:
   - 只读内容数据。
   - 插件自身配置读写。
   - 插件自身存储读写。
   - 通知和日志。
6. 权限声明与运行时拦截。
7. 插件错误隔离。
8. Web 与 Desktop 暴露一致的产品行为。

### 4.2 应该支持 (Should)

1. 命令注册与执行，例如刷新统计数据。
2. 文章保存后的只读事件通知。
3. 插件启用前展示权限说明。
4. 插件配置导入/导出。
5. 基础开发者文档和一个示例插件。

### 4.3 可以支持 (Could)

1. 编辑器工具栏按钮。
2. 上下文菜单项。
3. 本地开发模式加载私有插件。
4. iframe 沙箱插件 UI。

### 4.4 暂不支持 (Won't)

1. 插件市场。
2. 插件自动更新。
3. 未审核第三方插件安装。
4. 插件写文章、删文章、触发部署等高风险写操作。
5. 插件管理 GitHub OAuth 授权。

---

## 5. 产品模型

### 5.1 插件来源

首版仅支持以下来源:

1. `builtin`: 随应用发布的内置插件。
2. `local-dev`: 开发模式下的本地插件，仅在显式开发配置开启时可用。

后续版本再引入:

1. `private`: 企业私有插件源。
2. `marketplace`: 公共插件市场。

### 5.2 插件状态

1. `installed`: 已发现但未启用。
2. `enabled`: 已启用并可贡献 UI/命令。
3. `disabled`: 用户停用。
4. `error`: 激活或运行时失败。
5. `incompatible`: manifest 或版本要求不兼容。

### 5.3 权限分级

首版采用最小权限:

1. `content.read`: 读取文章、页面、标签、媒体列表。
2. `config.read`: 读取站点和插件配置中的非敏感字段。
3. `pluginStorage.read`: 读取插件自己的存储。
4. `pluginStorage.write`: 写入插件自己的存储。
5. `pluginConfig.write`: 写入插件自己的配置。
6. `ui.contribute`: 注册声明式 UI 贡献点。
7. `command.register`: 注册插件命令。
8. `network.fetch`: 发起网络请求，必须声明允许的域名。

以下权限不进入首版:

1. `content.write`
2. `content.delete`
3. `deploy.trigger`
4. `auth.token.read`
5. `filesystem.write`
6. `shell.execute`

---

## 6. 插件体验

### 6.1 插件管理页

插件管理入口放在 Settings 中，展示:

1. 插件名称、描述、版本、来源。
2. 当前状态。
3. 权限摘要。
4. 启用/停用按钮。
5. 配置入口。
6. 最近错误信息。

### 6.2 启用流程

1. 用户点击启用。
2. 系统校验 manifest 和兼容版本。
3. 系统展示权限说明。
4. 用户确认。
5. 插件进入 `enabled`。
6. 插件贡献的 UI 在对应扩展点出现。

### 6.3 失败体验

1. 插件激活失败时标记为 `error`，并显示“插件启动失败，可停用或重试”。
2. 插件运行时失败只影响插件贡献区域。
3. 插件错误日志不得包含 token、cookie 或用户私密配置。
4. 用户可以一键停用故障插件。

---

## 7. 首版内置插件

### 7.1 Attachments Helper

目标: 在媒体管理中区分附件类型并提供复制链接等辅助能力。

首版能力:

1. 读取媒体文件列表。
2. 按文件类型筛选附件。
3. 复制附件链接。
4. 在媒体管理页或仪表板贡献一个轻量入口。

限制:

1. 不新增任意文件上传路径。
2. 不删除媒体文件。
3. 不读取本地文件系统。

选择理由:

1. 依赖现有媒体列表能力，不需要第三方账号和 API Key。
2. 可以验证 PluginManager、manifest、权限拦截和 UI 扩展点。
3. 实现风险低，适合作为插件 MVP 的第一块验证样本。

### 7.2 Analytics Dashboard

目标: 在仪表板展示第三方统计数据摘要。

后续能力:

1. 设置统计服务类型: Umami 或 Plausible 优先。
2. 设置站点 ID/API Endpoint/API Key。
3. 仪表板展示 PV、UV、热门文章摘要。
4. 刷新统计命令。

限制:

1. 不接管 Google OAuth。
2. 第三方 API Key 必须进入系统密钥存储，不得保存到普通插件配置。
3. 网络请求仅允许访问用户配置的统计服务域名。
4. 在 secret store 与 network permission 稳定前不进入 MVP。

### 7.3 Comments Overview

目标: 汇总评论系统入口和待处理提醒，作为 Attachments Helper 之后的第二个内置插件。

选择顺序:

1. 优先于 Analytics Dashboard 实现，因为 Comments Overview 不需要 API Key 和 Secret Store。
2. 可以复用现有评论管理页面的示例数据与状态模型，先验证第二个内置插件、多 renderer、多 manifest 的链路。
3. 可以推动 v0.2 所需的 settings panel schema renderer 和插件配置持久化。

当前能力:

1. 支持 Giscus/Waline 配置摘要。
2. 在仪表板显示待处理评论入口。
3. 提供跳转到外部评论后台的操作。
4. 在插件设置中配置评论服务类型、后台 URL 和是否展示待审核提醒。

后续增强:

1. 抽象 `CommentProvider`，统一 Giscus/Waline/Disqus 等只读摘要接口。
2. 通过 Command API 支持手动刷新评论摘要。
3. 通过 Event API 在 dashboard 或通知中心推送新的待审核评论提醒。

限制:

1. 不在首版实现完整评论审核。
2. 不写入文章 frontmatter。
3. 不保存 API Key，不调用第三方评论系统写接口。

---

## 8. 验收标准

### 8.1 功能验收

1. 用户可以在 Settings 中看到内置插件列表。
2. 用户可以启用/停用内置插件。
3. 至少一个内置插件在 Web 与 Desktop 正常贡献仪表板小部件。
4. 插件配置可以保存并在刷新后恢复。
5. 插件错误不会导致核心页面白屏。

### 8.2 安全验收

1. 插件无法读取 GitHub OAuth token。
2. 未声明权限的 API 调用会被拒绝。
3. 插件存储按插件 ID 隔离。
4. 插件网络请求受允许域名限制。
5. 插件日志不包含 token、cookie、API Key。

### 8.3 回归验收

1. 禁用全部插件后，文章、页面、媒体、部署等核心功能仍可用。
2. Web 与 Desktop 插件状态和配置体验一致。
3. 插件启停不破坏路由守卫、登录态和仓库配置流程。

---

## 9. 指标

首版发布后追踪:

1. 插件启用成功率。
2. 插件激活失败次数。
3. 插件运行时错误次数。
4. 插件贡献区域渲染耗时。
5. 因插件导致的核心页面错误数。
6. 内置插件启用率。

---

## 10. 版本规划

### 10.1 v0.1 插件 MVP

状态: 已落地。

1. 内置插件 manifest。
2. PluginManager。
3. ExtensionRegistry。
4. Settings 插件管理页。
5. Dashboard widget 扩展点。
6. 权限拦截。
7. Attachments Helper 可用。
8. Web/Desktop 根布局接入插件 Provider。
9. 插件启停影响对应核心页面边界，禁用插件不保留插件 UI。

### 10.2 v0.2 可信插件扩展

状态: 部分落地，继续迭代；日志面板、页面事件派发、Storage 平台持久化、Secret Store core 和 network.fetch core 已完成，下一步推进平台级 Secret/网络适配。

已落地:

1. Settings panel schema renderer。
2. 插件配置持久化基础能力。
3. Comments Overview 内置插件可用。
4. Dashboard widget 可读取插件配置。
5. 插件级 ErrorBoundary 覆盖 Dashboard widget 和 Settings schema renderer。
6. renderer 错误写入 `record.lastError`，Settings 插件卡片展示最近错误。
7. 插件日志面板展示命令执行、运行时错误和插件 logger 写入的最近日志。
8. 日志内容按 `pluginId` 隔离，并脱敏 token、cookie、API Key 和本地路径。
9. 核心页面事件派发已覆盖文章、页面、媒体和部署操作。
10. 插件 Storage API 已从 renderer localStorage 迁移到 Web SQLite/API route 与 Desktop userData IPC。
11. Secret Store core 只允许 `has/set/delete`，不向插件返回明文。
12. network.fetch core 限制 HTTPS、allowedHosts、超时和 cookie。

待补齐:

1. Secret Store Web/Desktop 平台持久化。
2. 受控 network.fetch Web/Desktop 平台代理、响应大小限制和审计日志。
3. Web SQLite / Desktop userData 的平台级状态、配置和日志存储。

下一轮迭代建议:

1. 将 Secret Store 接到 Web 服务端加密存储和 Desktop keytar。
2. 将 network.fetch 接到 Web/API route 与 Desktop main process 代理，并补响应大小限制。

### 10.3 v0.3 沙箱验证

1. Secret Store。
2. 受控 network.fetch 代理。
3. iframe 或 Worker 沙箱原型。
4. 跨平台消息协议。
5. 本地开发插件加载。

### 10.4 v1.0 生态准备

1. 私有插件源。
2. 插件签名与完整性校验。
3. 插件市场方案评审通过。

---

## 11. 已确认决策

1. 首个内置插件选择 Attachments Helper，Analytics Dashboard 延后到 secret store 与 network permission 稳定后实现。
2. 第三方 API Key 必须进入系统密钥存储；普通插件配置不得保存明文 secret。
3. Desktop 私有插件首版不得任意读取本地文件；未来如开放，需要显式 `filesystem.read` 权限、路径白名单和宿主代理。
4. Web 首版不支持用户上传本地插件包；后续仅考虑签名插件源或受信 marketplace。
5. 第二个内置插件选择 Comments Overview，先推进不依赖 secret 的插件配置和 dashboard 扩展能力。
6. 下一批内置插件优先探索不依赖 Secret Store 的 SEO Inspector 与 Draft Coach，等 network.fetch 代理稳定后再做 Link Checker 和 Analytics Dashboard。
7. 当前配置和日志持久化先使用 renderer localStorage 验证产品体验，平台级持久化再分别落到 Web SQLite 与 Desktop userData。
8. 插件 Storage API 优先完成平台持久化，为 Draft Coach、Link Checker 等事件驱动插件保留状态。

---

## 12. 决策记录

1. 首版只支持可信内置插件。
2. 首版不开放任意第三方代码执行。
3. 首版不支持插件直接渲染宿主 React 组件。
4. 插件 API 默认只读，写操作必须逐项开放。
5. 插件市场延期到插件运行时稳定之后。
6. 首个插件以 Attachments Helper 验证低风险插件链路。
7. 需要 API Key 的插件必须等系统密钥存储能力落地后再发布。
