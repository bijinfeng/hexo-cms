# 贡献指南

感谢你对 Hexo CMS 的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复或新功能

在开始贡献之前，请花几分钟阅读本指南。

---

## 📋 目录

1. [开发环境设置](#开发环境设置)
2. [代码规范](#代码规范)
3. [提交规范](#提交规范)
4. [Pull Request 流程](#pull-request-流程)
5. [项目架构](#项目架构)
6. [测试指南](#测试指南)

---

## 🛠️ 开发环境设置

### 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Git**: >= 2.0.0

### 安装步骤

1. **Fork 并克隆仓库**
   ```bash
   # Fork 仓库到你的 GitHub 账号
   # 然后克隆你的 fork
   git clone https://github.com/YOUR_USERNAME/hexo-cms.git
   cd hexo-cms
   ```

2. **添加上游仓库**
   ```bash
   git remote add upstream https://github.com/bijinfeng/hexo-cms.git
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **配置环境变量**
   ```bash
   cp .env.example packages/web/.env
   # 编辑 packages/web/.env，填写 GitHub OAuth 凭证
   ```

5. **启动开发服务器**
   ```bash
   # Web 端
   pnpm dev
   
   # 桌面端
   pnpm dev:desktop
   ```

---

## 📐 代码规范

### 命名约定

- **文件名**：使用 kebab-case（小写 + 连字符）
  - 组件文件：`button.tsx`, `card-header.tsx`
  - 工具文件：`format-date.ts`, `api-client.ts`
  
- **组件名**：使用 PascalCase
  ```tsx
  export function PostCard() { ... }
  export function MediaUploader() { ... }
  ```

- **函数/变量名**：使用 camelCase
  ```ts
  const userName = "John";
  function getUserPosts() { ... }
  ```

- **常量**：使用 UPPER_SNAKE_CASE
  ```ts
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const API_BASE_URL = "https://api.github.com";
  ```

### 文件组织

```
packages/ui/src/
├── pages/              # 页面组件（一个文件一个页面）
│   ├── posts.tsx
│   └── posts.new.tsx
├── components/         # 可复用组件
│   ├── layout/         # 布局组件
│   └── ui/             # UI 基础组件
├── context/            # React Context
├── hooks/              # 自定义 Hooks
└── utils.ts            # 工具函数
```

### TypeScript 规范

- **优先使用类型推断**，避免不必要的类型注解
  ```ts
  // ✅ Good
  const count = 0;
  
  // ❌ Bad
  const count: number = 0;
  ```

- **为函数参数和返回值添加类型**
  ```ts
  // ✅ Good
  function formatDate(date: Date): string {
    return date.toISOString();
  }
  
  // ❌ Bad
  function formatDate(date) {
    return date.toISOString();
  }
  ```

- **使用接口定义对象类型**
  ```ts
  interface Post {
    title: string;
    content: string;
    date: Date;
  }
  ```

### React 规范

- **使用函数组件和 Hooks**
  ```tsx
  // ✅ Good
  export function PostCard({ post }: { post: Post }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return <div>...</div>;
  }
  ```

- **Props 解构**
  ```tsx
  // ✅ Good
  function Button({ children, onClick, variant = "primary" }) {
    return <button onClick={onClick}>{children}</button>;
  }
  ```

- **使用 useDataProvider 访问数据**
  ```tsx
  // ✅ Good - 平台无关
  const dataProvider = useDataProvider();
  const posts = await dataProvider.getPosts();
  
  // ❌ Bad - 直接调用 fetch（仅限 Web）
  const res = await fetch("/api/posts");
  ```

### CSS/Tailwind 规范

- **使用 Tailwind 工具类**，避免自定义 CSS
- **使用 CSS 变量**定义颜色，不写死 hex 值
  ```tsx
  // ✅ Good
  <div className="bg-[var(--brand-primary)]">
  
  // ❌ Bad
  <div className="bg-[#f97316]">
  ```

- **响应式设计**：优先考虑移动端
  ```tsx
  <div className="flex flex-col md:flex-row gap-4">
  ```

---

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交类型

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整（不影响功能）
- `refactor:` 代码重构（不新增功能，不修复 Bug）
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具链相关
- `ci:` CI/CD 配置

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例**：

```
feat(posts): add batch delete functionality

Implement batch selection and deletion for posts page.
Users can now select multiple posts and delete them at once.

Closes #123
```

### 提交注意事项

- 标题不超过 72 个字符
- 使用祈使句（"add" 而不是 "added" 或 "adds"）
- 正文说明"为什么"而不是"做了什么"
- 如果关闭 Issue，在 footer 添加 `Closes #issue_number`

---

## 🔄 Pull Request 流程

### 1. 创建分支

从 `main` 分支创建新分支：

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

分支命名规范：
- `feat/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构

### 2. 开发和测试

- 编写代码
- 添加/更新测试
- 确保所有测试通过：`pnpm test`
- 确保类型检查通过：`pnpm type-check`

### 3. 提交改动

```bash
git add .
git commit -m "feat: your commit message"
```

### 4. 推送到 GitHub

```bash
git push origin feat/your-feature-name
```

### 5. 创建 Pull Request

1. 访问你的 fork 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 标题和描述：
   - 标题：简洁描述改动（< 70 字符）
   - 描述：详细说明改动内容、原因、测试方法

**PR 描述模板**：

```markdown
## 改动内容

- 添加了 XXX 功能
- 修复了 XXX Bug
- 重构了 XXX 模块

## 测试方法

- [ ] 手动测试了 XXX 场景
- [ ] 添加了单元测试
- [ ] 所有测试通过

## 截图（如果适用）

[添加截图]

## 相关 Issue

Closes #123
```

### 6. 代码审查

- 维护者会审查你的代码
- 根据反馈进行修改
- 修改后推送到同一分支，PR 会自动更新

### 7. 合并

- PR 通过审查后，维护者会合并到 `main` 分支
- 你的贡献会出现在下一个版本的 CHANGELOG 中

---

## 🏗️ 项目架构

### Monorepo 结构

Hexo CMS 使用 pnpm workspace 管理 monorepo：

```
packages/
├── core/       # 核心逻辑（无 UI 依赖）
├── ui/         # 共享 UI 组件（平台无关）
├── web/        # Web 应用
└── desktop/    # 桌面应用
```

### DataProvider 模式

所有 UI 组件通过 `useDataProvider()` 访问数据，实现 Web 和 Desktop 端代码共享：

```tsx
// ✅ 正确：使用 DataProvider
const dataProvider = useDataProvider();
const posts = await dataProvider.getPosts();

// ❌ 错误：直接调用平台特定 API
const res = await fetch("/api/posts");  // 仅限 Web
window.electronAPI.invoke("get-posts"); // 仅限 Desktop
```

详细架构说明请参考 [CLAUDE.md](CLAUDE.md)。

---

## 🧪 测试指南

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @hexo-cms/web test

# 监听模式
pnpm --filter @hexo-cms/web test --watch
```

### 编写测试

我们使用 Vitest 和 Testing Library：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

---

## ❓ 常见问题

**Q: 我应该在哪个包中添加代码？**

- 纯逻辑（无 UI）→ `packages/core`
- UI 组件（Web + Desktop 共享）→ `packages/ui`
- Web 特定功能（API 路由、认证）→ `packages/web`
- Desktop 特定功能（IPC、主进程）→ `packages/desktop`

**Q: 如何调试 Electron 应用？**

- 主进程：查看终端输出
- 渲染进程：打开 DevTools（View → Toggle Developer Tools）

**Q: 提交前需要做什么？**

1. 运行 `pnpm test` 确保测试通过
2. 运行 `pnpm type-check` 确保类型正确
3. 确保代码符合规范
4. 编写清晰的提交信息

---

## 📞 获取帮助

- 💬 [GitHub Discussions](https://github.com/bijinfeng/hexo-cms/discussions) - 提问和讨论
- 🐛 [GitHub Issues](https://github.com/bijinfeng/hexo-cms/issues) - 报告 Bug
- 📧 Email: [your-email@example.com](mailto:your-email@example.com)

---

## 🙏 感谢

感谢你的贡献！每一个 PR、Issue、建议都让 Hexo CMS 变得更好。

---

<div align="center">

**[⬆ 回到顶部](#贡献指南)**

Made with ❤️ by the Hexo CMS community

</div>
