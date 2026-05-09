# Hexo CMS GitHub OAuth 统一认证技术方案

> 版本: v1.0  
> 状态: Draft  
> 日期: 2026-05-09  
> 关联文档: `docs/auth/PRD_GITHUB_OAUTH.md`

---

## 1. 目标与范围

本方案用于落实 PRD 中的认证决策:

1. Web 与 Desktop 均使用 GitHub OAuth 作为唯一登录路径。
2. Desktop 首版采用 GitHub Device Flow。
3. Web 与 Desktop 仅共享身份语义，不共享会话基础设施。
4. 不保留应用内 PAT 登录/开发后门入口。

本方案仅覆盖认证与会话相关架构，不展开业务功能实现细节。

---

## 2. 现状问题 (技术视角)

### 2.1 登录模型分裂

1. Web: Better Auth + OAuth。
2. Desktop: keytar + 手动 token/PAT。
3. UI 共享层出现平台耦合: 登录组件与 token 输入逻辑混用。

### 2.2 令牌语义混淆

Web 端存在把应用 session token 当 GitHub access token 使用的风险，导致:

1. Octokit 鉴权语义错误。
2. 401/403 问题难定位。
3. OAuth 成功但 GitHub API 仍失败。

### 2.3 认证边界不清

1. 谁负责发起 OAuth、谁负责存储 token、谁负责刷新/失效策略未统一。
2. DataProvider 既承担业务访问，又承担认证判断，职责过重。

---

## 3. 决策摘要

1. **Web 会话**: 继续由 Better Auth 管理 (服务端会话)。
2. **Desktop 会话**: 主进程实现 Device Flow，维护本地会话 (系统钥匙串)。
3. **共享层**: 仅共享认证状态语义与 UI 行为，不共享底层会话机制。
4. **API 口径**:
   - Web 侧 GitHub 访问一律使用 Better Auth 账户关联的 GitHub access token。
   - Desktop 侧 GitHub 访问一律使用本地 OAuth access token。
5. **禁用 PAT 主路径**: 移除 UI 与 IPC 的 PAT 保存/删除主交互。

---

## 4. 总体架构

### 4.1 分层

1. `Auth UI Layer` (共享 UI)
   - 登录按钮、登录状态、重授权入口、退出入口。
2. `Platform Auth Adapter`
   - WebAuthAdapter: 调用 Better Auth 客户端能力。
   - DesktopAuthAdapter: 调用 Electron IPC 的 `auth:*` 接口。
3. `Session Store`
   - Web: Better Auth 数据库表。
   - Desktop: keytar + 内存缓存。
4. `GitHub Access Layer`
   - Web: 服务端从 Better Auth account/access token 构造 Octokit。
   - Desktop: 主进程从本地会话读取 access token 构造 Octokit。

### 4.2 关键原则

1. Renderer 不直接接触密钥材料。
2. UI 不感知 PAT，不感知 token 字段细节。
3. 认证状态通过统一接口暴露: `anonymous/authenticating/authenticated/reauthorization_required/error`。

---

## 5. Web 方案设计

### 5.1 登录

1. 使用 Better Auth social provider (`github`) 进行 OAuth。
2. 登录态由 Better Auth session 管理。

### 5.2 GitHub token 读取

1. 服务端在处理 GitHub API 路由时:
   - 先拿 Better Auth session/user。
   - 再基于 user 读取 account 记录中的 GitHub access token。
2. 严禁将应用 session token 直接作为 GitHub token 传给 Octokit。

### 5.3 Web API 行为

1. 未登录: `401 Unauthorized`。
2. 已登录但缺 GitHub access token: `401` + 结构化错误码 `REAUTH_REQUIRED`。
3. token 无效/权限不足: `403` + 错误码 `REAUTH_REQUIRED`。

---

## 6. Desktop 方案设计 (Device Flow)

### 6.1 流程

1. Renderer 请求 `auth:startDeviceFlow`。
2. 主进程调用 GitHub Device Flow 起始接口，返回:
   - `device_code`
   - `user_code`
   - `verification_uri`
   - `expires_in`
   - `interval`
3. Renderer 展示 `user_code` 和授权入口，主进程可同时调用系统浏览器打开授权页。
4. 主进程按 `interval` 轮询 token 端点，直到:
   - 成功获得 access token
   - 授权被拒绝
   - 授权超时
5. 成功后主进程存储本地会话并通知 Renderer 状态变更。

约束:

1. GitHub OAuth App 必须在应用设置中启用 Device Flow。
2. Device Flow 使用 `client_id`，不使用 `client_secret`。
3. 请求 GitHub OAuth token 时必须使用 `grant_type=urn:ietf:params:oauth:grant-type:device_code`。
4. 请求应使用 `Accept: application/json`，避免解析 form-encoded 响应。
5. `device_code/user_code` 默认 15 分钟过期，过期后必须重新发起流程。
6. 轮询必须遵守 GitHub 返回的 `interval`，收到 `slow_down` 后增加等待时间。

### 6.2 本地会话存储

建议存储结构:

1. `access_token`
2. `token_type`
3. `scope`
4. `github_user_id` (若可获得)
5. `created_at`
6. `last_validated_at`

存储策略:

1. 持久化: keytar。
2. 运行态缓存: 主进程内存 (减少频繁 IO)。
3. 退出登录: 清理 keytar + 内存缓存。

### 6.3 IPC 契约 (建议)

1. `auth:startDeviceFlow` -> 返回设备授权上下文
2. `auth:pollStatus` -> 查询当前 flow 状态
3. `auth:getSession` -> 查询当前登录态摘要
4. `auth:signOut` -> 清理本地会话
5. `auth:reauthorize` -> 重新发起 Device Flow

说明: 首版也可用事件推送替代高频轮询，以降低 renderer 复杂度。

---

## 7. 共享 UI 与应用层改造

### 7.1 登录页

1. `LoginPage` 不再直接依赖 Better Auth 的 `signIn` 结构。
2. 改为依赖统一 `AuthClient` 接口，例如:
   - `startLogin()`
   - `getSession()`
   - `signOut()`
   - `reauthorize()`

### 7.2 Onboarding/Settings

1. 删除 PAT 输入、保存、删除相关主交互。
2. Onboarding 仅负责仓库配置。
3. Settings 展示:
   - 当前账号
   - 授权状态
   - 重新授权
   - 退出登录

### 7.3 Root Route 认证守卫

1. 现有“是否有 token”判断改为“AuthSession.state 是否 authenticated”。
2. `reauthorization_required` 应跳转登录并展示原因。

---

## 8. DataProvider 影响

### 8.1 接口语义

1. `getToken/saveToken/deleteToken` 由“用户操作能力”转为“内部兼容层能力”。
2. 目标是逐步让业务 UI 不再调用 token CRUD。

### 8.2 渐进迁移策略

1. 第 1 阶段: UI 停止调用 token CRUD。
2. 第 2 阶段: DataProvider 标记 token CRUD 为 deprecated。
3. 第 3 阶段: 清理废弃方法及相关实现。

---

## 9. 错误模型与可观测性

### 9.1 统一错误码

建议最小错误集:

1. `AUTH_NOT_CONFIGURED`
2. `AUTH_EXPIRED`
3. `AUTH_REJECTED`
4. `AUTH_TIMEOUT`
5. `AUTH_SCOPE_INSUFFICIENT`
6. `AUTH_NETWORK_ERROR`
7. `AUTH_SLOW_DOWN`
8. `AUTH_DEVICE_FLOW_DISABLED`

GitHub Device Flow 错误映射:

1. `authorization_pending` -> 继续等待，不展示为错误。
2. `slow_down` -> 更新轮询间隔，内部状态标记为 `AUTH_SLOW_DOWN`。
3. `expired_token` -> `AUTH_TIMEOUT`。
4. `access_denied` -> `AUTH_REJECTED`。
5. `device_flow_disabled` -> `AUTH_DEVICE_FLOW_DISABLED`。
6. `incorrect_client_credentials` / `incorrect_device_code` -> `AUTH_NOT_CONFIGURED`。

### 9.2 日志规范

1. 记录 flow 阶段与错误码，不记录 token 内容。
2. Web/Desktop 都记录:
   - 登录启动
   - 登录成功
   - 登录失败原因
   - 重授权触发

### 9.3 指标埋点

1. 登录成功率
2. Device Flow 超时率
3. 重授权触发率
4. 从登录到可编辑状态耗时

---

## 10. 安全设计要点

1. 不在 renderer 可读存储中持久化 access token。
2. 主进程 IPC 只暴露认证摘要，不返回完整敏感凭证给 UI。
3. 退出登录需强一致清理 (内存 + keytar)。
4. 认证日志脱敏。
5. GitHub scope 最小化且满足业务要求。

---

## 11. 迁移计划

### Phase A: 会话层打底

1. 定义统一 `AuthSession` 与 `AuthClient` 类型。
2. Web/desktop 分别实现 adapter。

### Phase B: 登录路径切换

1. 登录页接入统一 AuthClient。
2. Desktop 接 Device Flow，Web 保持 Better Auth。

### Phase C: 业务页去 PAT

1. Onboarding/Settings 移除 PAT 主交互。
2. Root 守卫改为 session-state 驱动。

### Phase D: 清理与稳态

1. 废弃 token CRUD 公开能力。
2. 文档统一回写 (README / 项目规划 / 架构文档)。

---

## 12. 验证与验收

### 12.1 功能验收

1. Web OAuth 登录后可完成全部 GitHub 内容操作。
2. Desktop Device Flow 登录后可完成全部 GitHub 内容操作。
3. 未登录无法访问受保护操作。
4. token 失效可进入重授权并恢复。

### 12.2 安全验收

1. 无 token 明文出现在 renderer 存储与日志中。
2. API/IPC 失败错误码可区分权限不足、过期、网络。

### 12.3 回归验收

1. 文章/页面/媒体/部署等主链路不受认证改造破坏。
2. Web 与 Desktop 认证文案一致，不再出现“认证服务未配置”误导文案。

---

## 13. 已知取舍

1. Device Flow 首次体验比浏览器回调多一步输入授权码。
2. Web 与 Desktop 不共享会话意味着“跨端自动登出”不是首版目标。
3. 多账号切换不在本期范围内。

---

## 14. 未决实现细节 (供后续任务拆解)

1. Desktop Device Flow 状态同步机制:
   - 事件推送
   - Renderer 轮询
2. Web 侧 account/access token 读取封装位置与缓存策略。
3. 认证失败后的统一路由跳转策略与提示载体。

---

## 15. 参考

1. [GitHub Docs - Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
2. [Better Auth - Basic Usage](https://better-auth.com/docs/basic-usage)
3. [Better Auth - Options / Account](https://better-auth.com/docs/reference/options)
4. PRD: `docs/auth/PRD_GITHUB_OAUTH.md`
