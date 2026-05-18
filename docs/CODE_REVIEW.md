# Hexo CMS 代码审查报告 v2（全面分析）

> **优化进度：** 22 项已完成 / 35 项总计  
> **最近更新：** 2026-05-19

## 已完成的优化（✅）

| # | 类别 | 问题 | 提交 |
|---|------|------|------|
| 1 | CRITICAL | Desktop `getPages()` 调用错误方法 | `f02bc32` |
| 2 | CRITICAL | `DesktopPluginSecretStore.save()` 批量丢数据 | `f02bc32` |
| 3 | HIGH | `getErrorMessage()` 5 处重复 → 1 个共享函数 | `f02bc32` |
| 4 | HIGH | `cloneValue<T>()` 3 处重复 → 1 个共享函数 | `f02bc32` |
| 5 | HIGH | `assertNonEmptyString` 3 处重复 → 1 个共享函数 | `f02bc32` |
| 6 | HIGH | `stringifyPost` 转义 YAML 特殊字符 | `f579877` |
| 7 | HIGH | `deleteMedia` 错误处理与 `deletePost` 统一 | `38d85e1` |
| 8 | HIGH | 编辑器图像上传静默失败 → `onUploadError` 回调 | `38d1cf7` |
| 9 | HIGH | 自动保存 `localStorage` 满时提示用户 | `38d1cf7` |
| 10 | HIGH | Platform Sync Store 网络错误不再吞掉 | `38d1cf7` |
| 11 | HIGH | `getPosts` N+1 API 调用 → `Promise.all` 并行 | `38d1cf7` |
| 12 | HIGH | `with-cache` 无界增长 → LRU 淘汰 + 并发去重 | `291d19b` |
| 13 | HIGH | `PluginProvider` 缺 `useCallback` → 全部 useCallback | `291d19b` |
| 14 | MEDIUM | `SidebarSection` 组件 4 次重复 → 1 个共享组件 | `f02bc32` |
| 15 | MEDIUM | `Browser*Store` 5 组重复 → 1 个 `BrowserJsonStore<T>` | `6636d7c` |
| 16 | MEDIUM | 分类计数双计 (tags.ts) | `291d19b` |
| 17 | MEDIUM | `window.location.reload()` → `loadDiscussions()` | `291d19b` |
| 18 | MEDIUM | `toBoolean` 不处理字符串 | `291d19b` |
| 19 | MEDIUM | `isSameServiceConfig` 缺字段 | `291d19b` |
| 20 | MEDIUM | 暗色模式色彩硬编码 → CSS 变量 (14 处) | `46011c5` |
| 21 | MEDIUM | `onboarding` 去重 (~470 行重复) | `976a20c` |
| 22 | MEDIUM | `taxonomy` 去重 (~150 行重复) | `0e5ce10` |
| 23 | MEDIUM | `posts.tsx` 829→200 行拆分 (2 hooks + 1 组件) | `b7f6216` |
| 24 | MEDIUM | `desktop/index.ts` 606→102 行拆分 (ipc-handlers) | `e572955` |
| 25 | MEDIUM | `settings.tsx` 784→105 行拆分 (7 个子组件) | `499a4d1` |
| 26 | LOW | `GITHUB_API_VERSION` 7 处硬编码 → 1 个常量 | `f02bc32` |
| 27 | LOW | YAML 工具函数提取到 core | `f02bc32` |
| 28 | LOW | desktop media handler 添加错误日志 | `38d85e1` |
| 29 | LOW | `navigator.clipboard` 错误处理 | 待提交 |
| 30 | LOW | `parseFrontmatter` 多行 YAML 数组支持 | 待提交 |

## 待优化（🔜）

| 优先级 | 问题 | 工作量 |
|--------|------|--------|
| HIGH | `onboarding` 两个旧文件可删除（已改为从 core 重新导出） | 小 |
| MEDIUM | `Memory*Store` 5 组 → 1 个泛型 `MemoryStore<T>` | 小 |
| MEDIUM | 15+ 路由文件 Web/Desktop 重复（每份仅 3 行） | 高 |
| MEDIUM | DataProvider 双重实现无共享逻辑 | 高 |
| MEDIUM | Plugin 系统对 4 个内置插件过度设计 (~3000 行) | 很高 |
| MEDIUM | `pluginSecrets` Blob 模式 → 拆分为独立行 | 中 |
| LOW | 无 a11y (aria-label) / 无 i18n / 测试覆盖不足 | 高 |

---

## 0. CRITICAL — 必须立即修复

### 0.1 Desktop `pages` 管理完全失效

`packages/desktop/src/main/index.ts:375-383` — `github:get-pages` IPC handler 调用的是 `github.getPosts()` 而非 `github.getPages()`。Desktop 端页面管理展示的其实是文章内容，编辑页面实际上在编辑文章。`GitHubService` 根本没有 `getPages` 方法。

| 问题 | 影响 |
|------|------|
| 调用错误的方法 | Desktop 页面管理完全不可用 |
| 缺少 `getPages` 方法 | Web 端同样受影响 |

---

### 0.2 `DesktopPluginSecretStore.save()` 静默丢弃数据

`packages/ui/src/plugin/platform-plugin-secret.ts:16-25` — 批量保存多于 1 个插件或 1 个键值对时函数静默返回，数据直接丢失。

```typescript
async save(value: PluginSecretStoreValue): Promise<void> {
  const plugins = Object.entries(value);
  if (plugins.length !== 1) return; // 丢弃数据
  const [pluginId, namespace] = plugins[0];
  const entries = Object.entries(namespace);
  if (entries.length !== 1) return; // 丢弃数据
}
```

---

## 1. 代码重复

### 1.1 入驻逻辑完全重复（~230 行 × 2）

| 文件 | 行数 |
|------|------|
| `packages/web/src/lib/onboarding-github.ts` | 255 |
| `packages/desktop/src/main/onboarding.ts` | 239 |

完全相同的内容：`OctokitLike`/`GitHubRepo` 类型、`CHECK_MESSAGES` 常量、4 个辅助函数、`mapRepository`、`listWritableRepositories`、`hasHexoStructure`、`validateHexoRepository`（200+ 行）。**建议提取到 `@hexo-cms/core`。**

---

### 1.2 分类法操作逻辑重复（~200 行 × 2）

| 文件 | 
|------|
| `packages/web/src/routes/api/github/tags.ts` |
| `packages/desktop/src/main/taxonomy-operations.ts` |

相同的 rename/delete/merge 逻辑分布在两个文件中。Desktop 版本更干净，**应作为标准实现提取到 `@hexo-cms/core` 供 Web 路由复用。**

---

### 1.3 `getErrorMessage()` 重复 5 次

```typescript
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
```

出现位置：`posts.ts`, `pages.ts`, `tags.ts`, `media.ts`, `deploy.ts`。**提取到 `@hexo-cms/core/src/errors.ts`。**

---

### 1.4 Header sanitization 重复 3 次

| 文件 | 函数名 |
|------|--------|
| `packages/core/src/plugin/plugin-http.ts` | `sanitizeHeaders` |
| `packages/web/src/routes/api/plugin/fetch.ts` | `sanitizeRequestHeaders` |
| `packages/desktop/src/main/plugin-http-proxy.ts` | `sanitizePluginFetchHeaders` |

完全相同的 cookie/set-cookie 过滤逻辑。**统一使用 core 中的实现。**

---

### 1.5 MemoryStore / BrowserStore 模式重复 5 组

| 类型 | Memory 实现 | Browser 实现 |
|------|------------|-------------|
| State | `plugin-manager.ts:54-64` | `plugin-manager.ts:66-83` |
| Config | `plugin-manager.ts:85-95` | `plugin-manager.ts:97-114` |
| Storage | `plugin-storage.ts:13-23` | `plugin-storage.ts:25-42` |
| Log | `plugin-logger.ts:9-19` | `plugin-logger.ts:21-38` |
| Secret | `plugin-secret.ts:11-21` | — |
| Audit | — | `audit-log.ts:55-115` |

每一对模式相同（`load` 读取 + 深拷贝, `save` 深拷贝 + 写入）。**一个 `MemoryStore<T>` / `BrowserJsonStore<T>` 泛型类可替代 10 个类。**

---

### 1.6 `cloneValue` 模式重复 3 次

`plugin-storage.ts`, `plugin-secret.ts`, `plugin-logger.ts` 中各有完全一致的 `JSON.parse(JSON.stringify(...))` 深拷贝函数。**提取 `cloneValue<T>(value: T): T` 通用工具函数。**

---

### 1.7 `assertKey` 模式重复 3 次

`plugin-storage.ts`, `plugin-secret.ts`, `event-bus.ts` 中非空字符串校验模式相同。**提取 `assertNonEmptyString(value: string, name: string)` 通用函数。**

---

### 1.8 `createPlatformXxxStore` 工厂模式重复 6 次

`platform-plugin-state.ts`, `config.ts`, `log.ts`, `storage.ts`, `secret.ts`, `http.ts` 中每个都有相同的平台检测逻辑（Electron API / fetch / localStorage 判断）。**提取 `createPlatformStore<T>(opts)` 通用工厂函数。**

---

### 1.9 `getSearchValue` 完全重复（Web/Desktop）

`packages/web/src/routes/settings.tsx:20-29` 和 `packages/desktop/src/renderer/src/routes/settings.tsx:140-149` 完全一致。**移至 `@hexo-cms/ui/lib/`。**

---

### 1.10 `SidebarSection` 组件重复 4 次

`posts.new.tsx:318-338`, `posts.$slug.tsx:442-462`, `pages.new.tsx:205-224`, `pages.$slug.tsx:273-292` 中定义了相同的私有组件。**提取为共享组件。**

---

### 1.11 `defaultFetch` 重复 2 次

`packages/core/src/plugin/plugin-http.ts:117-122` 和 `packages/desktop/src/main/plugin-http-proxy.ts:173-178` 中相同的 fetch 运行时检查逻辑。

---

### 1.12 15+ 路由文件 Web/Desktop 完全重复

`posts.tsx`, `pages.tsx`, `tags.tsx`, `media.tsx`, `comments.tsx`, `themes.tsx`, `deploy.tsx`, `menus.tsx` 及对应的 `.new.tsx` / `.$slug.tsx` 在 web 和 desktop 包中完全相同，仅客户端实例不同。

---

### 1.13 GitHub API 版本号重复 6 处

`"X-GitHub-Api-Version": "2022-11-28"` 出现在 `github.ts`, `server-utils.ts`, `onboarding/repositories.ts`, `desktop/main/index.ts` (3处), `desktop/auth.ts`。**定义为 `@hexo-cms/core` 共享常量。**

---

## 2. 过长文件 / 职责过重

| 文件 | 行数 | 问题 |
|------|------|------|
| `ui/src/pages/posts.tsx` | 829 | 列表/搜索/过滤/批量操作/4 种对话框/表格渲染混在一个组件 |
| `ui/src/pages/settings.tsx` | 784 | 7 个子设置区段 + 导航/Shell 全在一个文件 |
| `ui/src/pages/onboarding.tsx` | 647 | 仓库搜索/列表/手动输入/验证/重授权全部耦合 |
| `desktop/src/main/index.ts` | 608 | ~40 个 IPC handler + 窗口/托盘/更新/YAML 工具 |
| `ui/src/pages/menus.tsx` | 583 | 拖拽排序 + YAML 解析 + 3 个子组件 |
| `ui/src/pages/comments.tsx` | 503 | GraphQL + 类型定义 + UI + 审核逻辑 |
| `core/src/plugin/plugin-manager.ts` | 464 | 管理器 + 4 个 Store 实现类 + 配置类型 |
| `ui/src/pages/media.tsx` | 439 | 过滤/批量操作/网格视图/列表视图/文件类型检测 |
| `core/src/plugin/types.ts` | 425 | 所有插件类型（清单/API/命令/诊断/快照）+ `createContentReadAPI` 工厂函数 |
| `core/src/github.ts` | 414 | 文章/页面/媒体/原始文件/配置 CRUD + frontmatter 解析 |

**建议拆分方案：**

- `posts.tsx` → `posts/hooks/usePosts.ts` + `posts/hooks/useBatchOperations.ts` + `posts/components/PostFilters.tsx` + `posts/components/BatchToolbar.tsx` + `posts/components/PostTable.tsx`
- `settings.tsx` → `settings/components/SiteSettings.tsx`, `GitHubSettings.tsx`, `EditorPreferencesSettings.tsx` 等 7 个文件 + `settings/components/FormField.tsx` 作为共享组件
- `desktop/main/index.ts` → `main/ipc/posts.ts`, `pages.ts`, `media.ts`, `taxonomy.ts`, `themes.ts`, `deploy.ts`, `auth.ts`, `config.ts`, `onboarding.ts`, `stats.ts` + `main/yaml-utils.ts`
- `types.ts` → `plugin/types/manifest.ts`, `apis.ts`, `commands.ts`, `diagnostics.ts`, `snapshots.ts` + `plugin/content-read-api.ts`

---

## 3. 硬编码值

| 位置 | 硬编码值 | 建议 |
|------|---------|------|
| `web/src/lib/db.ts` | `"./hexo-cms.db"` | 环境变量 `DATABASE_PATH` |
| `web/src/lib/auth.ts` | `["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]` | `TRUSTED_ORIGINS` 环境变量 |
| `ui/src/with-cache.ts` | `CACHE_TTL = 60_000` | 可配置 |
| `core/plugin/plugin-manager.ts` | `errorThreshold = 3` | 调用方传入 |
| 多处 | `MAX_PLUGIN_LOG_ENTRIES_PER_PLUGIN = 50` | 统一常量 |
| 多处 | `MAX_AUDIT_ENTRIES_PER_USER = 200` | 统一常量 |
| `core/plugin/plugin-http.ts` | `DEFAULT_TIMEOUT_MS = 10000` | 可配置 |
| 多处 | `MAX_RESPONSE_SIZE = 10 * 1024 * 1024` | 共享常量 |
| `ui/src/components/error-boundary.tsx` | "出错了", "页面遇到了一个意外错误" 等 | i18n 键 |

---

## 4. 错误处理不足

### 4.1 编辑器图像上传静默失败 — HIGH

`packages/editor/src/Editor.tsx:93-95` — catch 块为空，`onUploadMedia` 失败后用户完全不知情。且 `MarkdownEditor.tsx:21-24` 中传入的回调也无任何错误处理。

`packages/editor/src/extensions/image-upload.ts:44-49, 67-74` — `uploadFn(file).then(...)` 的 promise 没有 `.catch()`，上传失败被完全丢弃。

---

### 4.2 自动保存静默失败 — HIGH

`packages/ui/src/hooks/use-autosave.ts:22-29` — `localStorage.setItem` 因 `QuotaExceededError` 失败时静默丢弃。用户看到"已保存"提示但数据实际未保存。

---

### 4.3 Platform Sync Store 静默吞错误 — HIGH

`packages/ui/src/plugin/platform-sync-store.ts:38-47, 51-55, 88-96` — `fetch`, `fetchFromServer`, `persistToServer` 中所有网络/解析错误被 `.catch(() => {})` 吞掉。插件状态可能客户端和服务端不一致。

---

### 4.4 `listDirectory` 静默返回空数组 — HIGH

`packages/core/src/github.ts:312-327` — 权限错误（401）时返回 `[]` 而非抛出异常，使 Media 库显示为"没有文件"而非认证错误。

Desktop `index.ts:449-468` — 外层又加了一层 `catch { return [] }`，双重隐藏错误原因。

---

### 4.5 自动更新检测失败静默 — MEDIUM

`packages/desktop/src/main/auto-updater.ts:80-83` — `autoUpdater.checkForUpdates().catch(() => {})` 空 catch。

---

### 4.6 `deleteMedia` 错误处理不一致 — MEDIUM

`github.ts:407` 中 404 静默返回，但 `deletePost` 会重新抛出。

---

### 4.7 `tryParseJsonColumn` 无错误日志 — LOW

`packages/web/src/lib/json-db.ts` — JSON 解析失败静默返回 `{ ok: false }`，损坏数据无任何诊断痕迹。

---

### 4.8 Media 批量上传部分失败处理 — MEDIUM

`packages/ui/src/pages/media.tsx:101-124` — 多文件上传中任一文件失败则全部中断，用户得到的错误信息不包含失败文件详情。

---

## 5. 潜在 Bug

### 5.1 `stringifyPost` 不转义 frontmatter 特殊字符 — HIGH

`packages/core/src/github.ts:247-256` — 若 frontmatter 值包含冒号、换行或 `---`，生成的 YAML 格式错误。例如 `description: "New feature: improved editor"` 会生成歧义 YAML。

---

### 5.2 并发保存 SHA 竞争 — HIGH

`packages/core/src/github.ts:143-169` — `getContent` 获取 SHA 和 `createOrUpdateFileContents` 之间存在时间窗口。批量发布/分类操作中同一文件的多发保存会导致 409 冲突。

---

### 5.3 分类法操作部分更新风险 — HIGH

`packages/web/src/routes/api/github/tags.ts:77-118` — 分类 rename/delete/merge 中遍历所有文章逐一保存，中途失败导致分类处于半更新状态。

---

### 5.4 `getPosts` 产生 N+1 API 调用 — HIGH (性能)

`packages/core/src/github.ts:61-97` — 100 篇文章产生 101 次 GitHub API 调用。目录列表响应的 `content` 字段本已包含文件内容却未被使用。

---

### 5.5 Tags 分类计数双计 — MEDIUM

`packages/web/src/routes/api/github/tags.ts:135-136` — 同时累加 `category` 和 `categories` 可能导致同一分类计数两次。Desktop 使用 `||` 只取一个，行为不一致。

---

### 5.6 `toBoolean` 不处理字符串 — LOW

`packages/web/src/routes/api/github/config.ts:7-11` — 字符串 `"true"/"false"` 落到 fallback 而非正确转换。

---

### 5.7 `isSameServiceConfig` 不检查 workflowFile — LOW

`packages/desktop/src/main/github-service-provider.ts:55-62` — 缺少 `workflowFile`, `autoDeploy`, `deployNotifications` 字段比较。

---

### 5.8 `parseFrontmatter` 无法处理多行 YAML — LOW

`packages/core/src/github.ts:208-213` — 使用简单正则，不支持 `tags:\n  - tag1\n  - tag2` 等标准 YAML 多行列表。

---

### 5.9 `with-cache.ts` 无界的 Map 增长 — MEDIUM

`packages/ui/src/with-cache.ts:12-13` — 缓存 Map 无限增长，无 LRU 淘汰，100+ 文章每篇累积缓存条目。

---

## 6. 不一致模式

### 6.1 错误处理三种不统一风格

| 层级 | 模式 | 问题 |
|------|------|------|
| UI 页面 | `catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }` | 重复 30+ 次，无共享 hook |
| API 路由 | `return json({ error: getErrorMessage(error) }, 500)` | `getErrorMessage` 在多个文件中各定义一次 |
| GitHubService | `throw new DataProviderError(...)` | IPC handler catch 中有的返回 `[]`，有的 `throw error`，有的返回空对象 |

---

### 6.2 API 响应形状不一致

| 端点 | 响应形状 |
|------|---------|
| `GET /api/github/posts` | `{ posts: [...] }` |
| `GET /api/github/pages` | `{ pages: [...] }` |
| `GET /api/github/stats` | `{ stats: { ... } }` |
| `POST /api/github/posts` | `{ success: true }` |
| `POST /api/github/config` | `{ success: true }` |
| `GET /api/auth/token` | `{ authenticated: true }` |

无统一 envelope。`web-data-provider.ts` 中读取 `data.posts`, `data.pages`, `data.files` 等不同 key。

---

### 6.3 camelCase / snake_case 双轨制

`GitHubConfig` 类型同时包含 `autoDeploy`/`auto_deploy`, `postsDir`/`posts_dir` 等。规范化代码散落在 4 个文件中（`github.ts`, `server-utils.ts`, `config.ts`, `settings.tsx`）。

---

### 6.4 日志风格不一致

Desktop 主进程使用 `console.error(JSON.stringify({ level: "error", message: "..." }))`，UI 页面使用 `console.error("Failed to load posts:", err)`，`@hexo-cms/core` 的 `Logger` 类几乎未在 UI 中使用。

---

### 6.5 对话框状态管理模式三种

- `posts.tsx` — 每个对话框独立 boolean state
- `tags.tsx` — 单个 `dialog` state 对象 + type 区分
- `themes.tsx`, `deploy.tsx` — 字符串型 `notification` 模式

---

### 6.6 `FormField` vs `ToggleField` API 不一致

同一概念（带标签的表单控件）用完全不同的 props 签名。`FormField` 用 children，`ToggleField` 用 checked/onChange。

---

## 7. 类型问题

### 7.1 Stub Provider 返回 `{} as HexoPost`

`packages/ui/src/context/data-provider-context.tsx:13-14` — 缺少所有必填字段的空对象。外部调用 `getPost` 会运行时崩溃。

---

### 7.2 API 路由零运行时验证

所有 API 路由使用 `(await request.json()) as SomeType` 纯类型断言，无 Zod/Valibot 校验。恶意/损坏的请求体可能引起未预期行为或崩溃。

---

### 7.3 `File` 类型泄露到抽象层

`DataProvider` 接口定义 `uploadMedia(file: File, path: string)` — `File` 是浏览器 Web API 类型，Desktop 需要额外 `ArrayBuffer` 转换。

---

### 7.4 Plugin 命令参数无类型安全

`args: unknown[]` — 调用方和处理器无类型保障。

---

### 7.5 `as any` 使用多处

`pages.new.tsx:78`, `pages.$slug.tsx:108` — 构建 page 对象时用 `as any` 绕过类型检查。`media.tsx:176` — `copyPath(item: any)` 缺少类型。

---

## 8. 架构设计问题

### 8.1 DataProvider 双重实现无共享逻辑

`WebDataProvider` (275行) 和 `DesktopDataProvider` (156行) 没有任何公共逻辑。新增方法需三处改动（接口 + Web + Desktop）。

---

### 8.2 Plugin Store 架构 4 层过深

每种插件存储类型通过 4 层渠道：Core 接口 → 平台适配器（Web API / Desktop IPC）→ Platform Sync Store → UI。~30 个文件做本质上的 CRUD。

---

### 8.3 Plugin 系统对 4 个内置插件来说过度设计

~15 个文件、~3000 行代码实现：权限系统、事件总线、密钥存储、网络审计、诊断框架、日志标记/编辑。当前只有 4 个内置插件，无第三方插件，无动态加载。

---

### 8.4 `PluginProvider` 使用 monkey-patching

`packages/ui/src/plugin/plugin-provider.tsx:110-121` — 替换 `manager.snapshot` 方法添加副作用。不是惯用 React 模式。

---

### 8.5 `pluginSecrets` 表使用 Blob 模式

`packages/web/src/lib/schema.ts:72-76` — 一个用户的所有插件的所有密钥存储在单个 JSON blob 列中（与用户 id 为主键）。加载/保存任何密钥需要读写全部密钥。

---

### 8.6 缺少共享数据获取 hook

每个页面都复制粘贴 `useState(loading/error/data)` + `useEffect` + `try/catch` + `finally` 模式（30+ 处）。应有 `useAsyncData(fetchFn)` 统一 hook。

---

### 8.7 缺少共享 API 响应 envelope

Web data provider 中 `data.posts`, `data.pages`, `data.files` 等不同的 key 读取方式需要一个统一的 `{ data, error }` envelope。

---

### 8.8 `window.location.reload()` 用于刷新

`comments.tsx:341` — 强制全页重载而非重新获取数据，破坏所有 React 状态。

---

## 9. UI / 前端质量问题

### 9.1 缺失 React 性能优化

- `plugin-provider.tsx` — context 值函数（`enablePlugin`, `disablePlugin` 等）未用 `useCallback`，每次 render 创建新对象，导致所有消费者重新渲染
- `DashboardExtensionOutlet` — 作为普通函数调用而非 JSX 组件渲染，无法独立 memoize
- `save-indicator.tsx` — `saveConfig`/`deployConfig` 查找对象每次 render 重建

---

### 9.2 缺少 `useMemo`/`useCallback`

`posts.tsx` — `allCategories`, `filtered`, `selectedPostsData` 未 memoize
`media.tsx` — `filtered`, `totalSize` 未 memoize
`tags.tsx` — `filteredTags`, `filteredCategories` 未 memoize
`MarkdownEditor.tsx` — `handleUploadMedia` 未 `useCallback`，导致 Editor 每次重新初始化

---

### 9.3 无可访问性

- 无 skip-to-content 链接
- 大多数交互元素缺少 `aria-label`：Topbar 按钮、WindowControls、分页、复制按钮、拖拽排序
- `posts.tsx` 中表格使用 CSS grid `div` 实现，非语义化 `<table>`，屏幕阅读器无法识别
- 部分按钮未设置 `type="button"`，默认 `type="submit"`
- 新标签/上传等虚线按钮无法通过键盘聚焦

---

### 9.4 暗色模式下色彩不一致

`comments.tsx`, `diagnostics-panel.tsx`, `audit-log-panel.tsx`, `draft-coach/widget.tsx` 中使用原始 Tailwind 颜色类（如 `text-red-500`）而非项目 CSS 自定义属性（`var(--status-error)`），暗色模式下可读性差。

---

### 9.5 测试覆盖严重不足

现有 ~12 个测试文件。以下 ~30+ 模块完全无测试：

- 8 个页面组件：`tags`, `onboarding`, `themes`, `deploy`, `menus`, `comments`, `login`, `media`
- 3 个布局组件：`CMSLayout`, `Sidebar`, `ListPage`
- 7 个通用组件：`DashboardWidgetGrid`, `CommandPalette`, `ErrorBoundary`, `SaveIndicator`, `MarkdownEditor`, `Skeleton`, `UserMenu`
- 4 个 hooks/lib：`useAutoSave`, `useEditorPreferences`, `text-stats`, `withCache`
- 10+ 个 Plugin 组件：`PluginProvider`, `PluginSettingsPanel`, `AuditLogPanel`, `DiagnosticsPanel`, DraftCoach, SEO Inspector, Widget Renderers, Platform Stores

---

## 10. 包依赖问题

### 10.1 不必要或错位的依赖

- `octokit` 和 `react`/`react-dom` 在 root `package.json` 中，但仅特定子包使用
- `core/package.json` 声明 `@octokit/rest` 但实际未使用
- `@hexo-cms/ui` 包含 Electron 特定代码（`electron-api.ts`, `WindowControls.tsx`, `types/electron-api.ts`），破坏了 UI 包的平台无关性承诺
- `@hexo-cms/ui` 包含 Web 特定的 Auth 类型（`types/auth.ts`）

---

### 10.2 模块组织问题

- Plugin 系统代码散落在 `core/src/plugin/`（核心）、`ui/src/plugin/`（UI渲染 + 内置插件实现 + 平台适配器）、`web/src/lib/plugin-*.db.ts`（DB 存储）三个包
- `ui/src/plugin/` 混杂基础设施（provider, error boundary）和内置插件实现（draft-coach, seo-inspector）
- `ui/src/components/` 混合设计系统原语（shadcn 组件）和应用功能组件

---

## 11. 安全

### 11.1 GitHub Token 明文存储

`packages/web/src/lib/server-utils.ts:45-55` — OAuth access token 明文存储在 SQLite 中，无静态加密。

---

### 11.2 Desktop `save-post` IPC 无输入校验

`packages/desktop/src/main/index.ts:352-361` — post 参数未校验，受感染的渲染进程可传任意路径数据。

---

### 11.3 Slug 路径穿越风险（低）

`packages/web/src/routes/api/github/posts.ts:9-13` — `slug` 未做路径遍历字符清理（`/`, `..`）。GitHub API 层会阻止但不应依赖外部防御。

---

## 12. 优化优先级汇总表

| 优先级 | 问题 | 工作量 | 影响 |
|--------|------|--------|------|
| **CRITICAL** | Desktop `getPages()` 调用错误方法，页面管理完全失效 | 小 | 功能缺失 |
| **CRITICAL** | `DesktopPluginSecretStore.save()` 批量静默丢数据 | 小 | 数据丢失 |
| **HIGH** | `stringifyPost` 不转义 frontmatter 特殊字符 | 小 | 数据损坏 |
| **HIGH** | 编辑器图像上传完全无错误反馈 | 小 | 用户体验 |
| **HIGH** | 自动保存 localStorage 满时静默丢弃 | 小 | 数据丢失 |
| **HIGH** | Platform Sync Store 网络错误静默吞掉 | 小 | 数据不一致 |
| **HIGH** | `getPosts` N+1 API 调用 | 中 | 性能 + 速率限制 |
| **HIGH** | `onboarding-github.ts`/`onboarding.ts` 200+ 行重复 | 中 | 维护负担 |
| **HIGH** | taxonomy 逻辑 web/desktop 重复 | 中 | BUG 隔离不一致 |
| **HIGH** | `desktop/main/index.ts` 608 行需拆分 | 高 | 可维护性 |
| **HIGH** | `posts.tsx` 829 行 / `settings.tsx` 784 行需拆分 | 高 | 可维护性 |
| **HIGH** | `PluginProvider` 无 `useCallback`/monkey-patching | 中 | 性能 + 代码健壮性 |
| **MEDIUM** | MemoryStore/BrowserStore 模式 5 组重复 | 中 | 维护效率 |
| **MEDIUM** | `createPlatformXxxStore` 6 次重复 | 小 | DRY |
| **MEDIUM** | `getErrorMessage` 5 次复制 | 小 | DRY |
| **MEDIUM** | Header sanitization 3 处重复 | 小 | DRY |
| **MEDIUM** | `assertKey` / `cloneValue` 模式各 3 次重复 | 小 | DRY |
| **MEDIUM** | `SidebarSection` 组件 4 次重复 | 小 | DRY |
| **MEDIUM** | 15+ 路由文件 Web/Desktop 重复 | 高 | 维护负担 |
| **MEDIUM** | 并发保存 SHA 竞争 | 中 | 批量操作稳定性 |
| **MEDIUM** | 分类操作部分更新风险 | 中 | 数据完整性 |
| **MEDIUM** | 分类计数双计 | 小 | 数据准确性 |
| **MEDIUM** | API 响应格式不一致 | 中 | API 消费方复杂性 |
| **MEDIUM** | Plugin Store 架构 4 层冗余 | 高 | 新人理解成本 |
| **MEDIUM** | Plugin 系统对 4 内置插件过度设计 | 高 | 代码臃肿 |
| **MEDIUM** | 缺少共享数据获取 hook | 中 | 消除 200+ 行样板 |
| **MEDIUM** | 暗色模式下色彩不一致 | 小 | 用户体验 |
| **MEDIUM** | `pluginSecrets` Blob 模式 | 中 | 性能 |
| **LOW** | `toBoolean` 不处理字符串 | 小 | 边界情况 |
| **LOW** | `isSameServiceConfig` 缺字段 | 小 | 缓存失效 |
| **LOW** | `with-cache` 无界增长 | 小 | 内存 |
| **LOW** | `window.location.reload()` 重载 | 小 | 用户体验 |
| **LOW** | `parseFrontmatter` 无多行 YAML | 中 | 兼容性 |
| **LOW** | 无 i18n / 无 a11y | 高 | 国际化/无障碍 |
| **INFO** | GitHub API 版本号提取为常量 | 小 | 一致性 |
| **INFO** | 测试覆盖严重不足 | 高 | 质量保障 |
