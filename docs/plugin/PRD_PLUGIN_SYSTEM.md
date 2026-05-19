# Hexo CMS 插件系统 PRD

> **版本**: 2.0.0
> **最后更新**: 2026-05-19
> **状态**: 插件架构重塑完成 — 官方插件已提取为 workspace 包，PluginCatalog/PluginHost 统一加载路径
> **关联技术方案**: [TECHNICAL_DESIGN_PLUGIN_SYSTEM.md](./TECHNICAL_DESIGN_PLUGIN_SYSTEM.md)
> **开发手册**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)

---

## 1. 背景

Hexo CMS 目前具备内容管理、媒体管理、主题管理、部署管理等核心能力。随着用户场景扩展，继续把评论、附件、SEO、草稿助手等能力直接放进核心应用，会带来三个问题：

1. 核心功能边界膨胀，发布风险增大。
2. 不同用户对第三方服务的偏好差异大，内置所有集成不现实。
3. 企业和高级用户需要自定义工作流，但核心仓库不应承载所有定制需求。

插件系统的目标是为 Hexo CMS 建立一个可渐进落地的扩展框架，在不牺牲安全性和核心稳定性的前提下支持扩展。

---

## 2. 产品目标

### 2.1 当前目标

1. 建立稳定的插件基础能力，让官方扩展可以脱离核心 UI 包独立迭代。
2. 首版支持官方插件 + 本地开发插件，所有来源使用同一套 manifest/权限/加载/UI 协议。
3. 通过声明式 manifest 注册 UI 入口、设置项和权限需求。
4. 插件可被启用、停用、配置和诊断，插件失败不影响核心内容管理流程。
5. 为后续第三方插件、私有插件和插件市场预留演进路径。

### 2.2 未来目标（Reach Goals）

1. 沙箱运行时（worker / iframe）隔离第三方代码。
2. 插件市场发现、安装、更新。
3. 插件间依赖声明和版本约束。
4. 远程插件源（URL / registry）解析。

---

## 3. 当前实现状态

### 3.1 核心平台（2026-05-19 架构重塑完成）

| 能力 | 状态 |
|------|------|
| PluginManifest 声明 + 校验（origin/runtime） | ✅ |
| PluginDefinition + definePlugin 类型辅助 | ✅ |
| PluginCatalog 发现/校验/索引 | ✅ |
| PluginHost 运行时编排（启用/停用/同步/清理） | ✅ |
| PluginManager 状态机 + 错误熔断 | ✅ |
| PermissionBroker 显式权限模型 | ✅ |
| ExtensionRegistry（含 uiFlags 快照） | ✅ |
| CommandRegistry（注册/执行/权限校验） | ✅ |
| DiagnosticsRegistry（post/page/site 诊断） | ✅ |
| EventBus（订阅/派发/隔离） | ✅ |
| PluginStorageAPI（插件级 KV 存储） | ✅ |
| PluginSecretAPI（写后不可读的密钥存储） | ✅ |
| PluginHttpAPI（HTTPS + 主机白名单） | ✅ |
| PluginLogger（插件级日志/自动脱敏） | ✅ |
| PluginSourceResolver + StaticPluginSourceResolver | ✅ |

### 3.2 官方插件

| 插件 | 贡献类型 | 状态 |
|------|---------|------|
| Attachments Helper | dashboard + settings + command + uiFlags + sidebar | ✅ |
| Comments Overview | dashboard + settings + command + sidebar + page | ✅ |
| SEO Inspector | diagnostics + settings + sidebar | ✅ |
| Draft Coach | dashboard + settings + events + sidebar | ✅ |

### 3.3 UI 层

| 能力 | 状态 |
|------|------|
| PluginProvider 注入 PluginHost | ✅ |
| Dashboard widget 通过 host-provided renderer 渲染 | ✅ |
| 插件设置面板（声明式 schema） | ✅ |
| uiFlags 驱动媒体页功能开关 | ✅ |
| 插件错误熔断 + ErrorBoundary | ✅ |
| 插件状态/日志/错误展示 | ✅ |

### 3.4 待实现

| 能力 | 状态 |
|------|------|
| 图片上传到 GitHub 命令（Attachments Helper） | 🔸 待补充 |
| 评论真实数据源（Comments Overview） | 🔸 当前使用静态 mock |
| 远程插件源解析器 | ❌ |
| Worker/iframe 沙箱运行时 | ❌ |
| 插件市场 | ❌ |
| 插件间依赖 | ❌ |

---

## 4. 用户故事

### 4.1 插件使用者

- 作为 Hexo CMS 用户，我可以在设置页面查看所有已安装插件及其权限。
- 我可以按需启用或停用任何插件，停用后相关 UI 入口和功能自动消失。
- 我可以在插件设置面板中配置每个插件的参数。
- 当某个插件的渲染器或命令连续失败时，插件会自动进入错误状态，不影响其他功能。

### 4.2 插件开发者

- 我可以通过编写 manifest + definePlugin 创建一个新插件。
- 我的插件可以贡献 dashboard 小部件、设置面板、诊断、命令、事件处理和 UI 标记。
- 我的插件可以通过 storage API 持久化数据，通过 http API 访问外部服务。
- 我的插件失败时，错误信息会被记录到日志并在设置中展示，方便调试。
- Web 和 Desktop 端共享完全相同的插件定义，无需分别适配。

---

## 5. 非目标（v2.0 范围外）

1. 不支持浏览器直接上传/安装 `.zip` 插件包。
2. 不支持插件运行时热加载（需刷新页面）。
3. 不支持插件卸载（用户只能停用）。
4. 暂不对 `iframe`/`worker` 运行时做完整实现。

---

## 6. 成功指标

1. 每个官方插件的 manifest 通过自动校验。
2. 插件启用/停用响应 < 50ms。
3. 插件错误 3 次以内不触发熔断；第 3 次进入 error 状态。
4. 所有插件测试通过（当前 100/100）。
5. 新增一个插件（含 manifest + renderer + 注册）的代码 ≤ 80 行。

---

## 7. 文档索引

| 文档 | 说明 |
|------|------|
| [TECHNICAL_DESIGN_PLUGIN_SYSTEM.md](./TECHNICAL_DESIGN_PLUGIN_SYSTEM.md) | 技术架构方案 |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | 插件开发手册（含完整示例和检查清单） |
