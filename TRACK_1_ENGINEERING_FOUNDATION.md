# 轨道 1：工程基础设施建设

> **版本**: 1.0.0  
> **最后更新**: 2026-04-30  
> **执行周期**: Week 1-4 (4 周)

---

## 目录

1. [轨道概览](#1-轨道概览)
2. [Week 1: 文档和工具链](#2-week-1-文档和工具链)
3. [Week 2: 依赖管理和规范](#3-week-2-依赖管理和规范)
4. [Week 3: 单元测试框架](#4-week-3-单元测试框架)
5. [Week 4: 组件测试](#5-week-4-组件测试)
6. [交付物和验收标准](#6-交付物和验收标准)

---

## 1. 轨道概览

### 1.1 目标

建立现代化的工程基础设施，保障代码质量，为后续开发提供坚实基础。

### 1.2 核心任务

| 周次 | 主题 | 关键产出 | 工期 |
|------|------|---------|------|
| Week 1 | 文档 + 工具链 | README.md, .env.example, ESLint, CI/CD | 5 天 |
| Week 2 | 依赖管理 + 规范 | Dependabot, commit-lint, husky, CONTRIBUTING.md | 3 天 |
| Week 3 | 单元测试 | Vitest 配置, DataProvider/GitHubService 测试 | 6 天 |
| Week 4 | 组件测试 | Testing Library, 关键页面和组件测试 | 5 天 |

**总工期**: 19 天 (约 4 周)

### 1.3 依赖关系

```
Week 1: 文档 + ESLint + CI/CD ──────────────────────────────────→
         │
Week 2: ├── Dependabot + husky ──→
         │
Week 3: ├── Vitest 测试框架 ──→ 单元测试 ──→
         │                                    │
Week 4: └────────────────────────────────────┴→ 组件测试 ──→
```

---

## 2. Week 1: 文档和工具链

### 2.1 目标

建立项目基础文档和自动化工具链，让新开发者能快速上手。

### 2.2 Day 1-2: 基础文档

#### 任务清单

**Day 1 上午 (4 小时)**：
- [ ] 创建 README.md
  - 项目简介（1 段话说明 Hexo CMS 是什么）
  - 功能特性列表（文章管理、媒体管理、部署管理等）
  - 技术栈说明（TanStack Start、Electron、Better Auth 等）
  - 快速开始指南（环境要求、安装步骤、运行命令）

**Day 1 下午 (4 小时)**：
- [ ] 完善 README.md
  - 开发指南（目录结构、开发流程、调试方法）
  - 部署说明（Web 端和桌面端的构建和部署）
  - 贡献指南链接
  - License 和致谢

**Day 2 上午 (2 小时)**：
- [ ] 创建 .env.example
  ```bash
  # GitHub OAuth 配置
  GITHUB_CLIENT_ID=your_github_client_id_here
  GITHUB_CLIENT_SECRET=your_github_client_secret_here
  
  # 数据库配置（可选，默认使用 SQLite）
  # DATABASE_URL=file:./hexo-cms.db
  
  # 日志级别（可选，默认 info）
  # LOG_LEVEL=debug
  ```
- [ ] 在 README.md 中添加环境变量配置说明

**Day 2 下午 (2 小时)**：
- [ ] 创建 CONTRIBUTING.md
  - 开发环境设置（Node.js 版本、pnpm 安装）
  - 代码规范（命名约定、文件组织）
  - 提交规范（Conventional Commits）
  - PR 流程（分支策略、代码审查）

#### 验收标准

- ✅ README.md 包含所有必要信息，新开发者可以根据文档在 30 分钟内启动项目
- ✅ .env.example 包含所有必需的环境变量，有清晰的注释
- ✅ CONTRIBUTING.md 清晰说明了贡献流程

#### 预计工时

12 小时 (1.5 天)

### 2.3 Day 3: ESLint 配置

#### 任务清单

**Day 3 上午 (4 小时)**：
- [ ] 安装 ESLint 依赖
  ```bash
  pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks
  ```
- [ ] 创建根目录 .eslintrc.js
  ```javascript
  module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react/react-in-jsx-scope': 'off',
    },
  };
  ```

**Day 3 下午 (4 小时)**：
- [ ] 为每个包配置 ESLint（继承根配置）
- [ ] 修复所有 ESLint 错误（预计 50-100 个错误）
- [ ] 在根 package.json 添加 lint 脚本
  ```json
  {
    "scripts": {
      "lint": "eslint . --ext .ts,.tsx",
      "lint:fix": "eslint . --ext .ts,.tsx --fix"
    }
  }
  ```

#### 验收标准

- ✅ `pnpm lint` 无错误
- ✅ 所有包遵循统一的代码规范
- ✅ TypeScript `any` 类型有警告提示

#### 预计工时

8 小时 (1 天)

### 2.4 Day 4: 锁定依赖版本

#### 任务清单

**Day 4 上午 (2 小时)**：
- [ ] 检查所有 package.json，列出使用 `latest` 的依赖
  ```bash
  # 预期发现的 latest 依赖
  @tanstack/react-router: latest
  @tanstack/react-start: latest
  @tanstack/react-devtools: latest
  ```

**Day 4 下午 (2 小时)**：
- [ ] 将 `latest` 替换为具体版本
  ```json
  // packages/web/package.json
  {
    "dependencies": {
      "@tanstack/react-router": "1.168.18",  // 替换 latest
      "@tanstack/react-start": "1.168.18",   // 替换 latest
      "@tanstack/react-devtools": "1.168.18" // 替换 latest
    }
  }
  ```
- [ ] 运行 `pnpm install` 更新 lockfile
- [ ] 测试所有包的构建
  ```bash
  pnpm --filter @hexo-cms/core build
  pnpm --filter @hexo-cms/ui build
  pnpm --filter @hexo-cms/web build
  pnpm --filter @hexo-cms/desktop build
  ```

#### 验收标准

- ✅ 所有依赖都有明确版本号
- ✅ 构建可复现
- ✅ 无 `latest` 版本

#### 预计工时

4 小时 (0.5 天)

### 2.5 Day 5: GitHub Actions CI

#### 任务清单

**Day 5 全天 (8 小时)**：
- [ ] 创建 .github/workflows/ci.yml
  ```yaml
  name: CI
  
  on:
    push:
      branches: [main, master, develop]
    pull_request:
      branches: [main, master, develop]
  
  jobs:
    quality:
      runs-on: ubuntu-latest
      
      steps:
        - name: Checkout code
          uses: actions/checkout@v4
        
        - name: Setup pnpm
          uses: pnpm/action-setup@v2
          with:
            version: 8
        
        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'pnpm'
        
        - name: Install dependencies
          run: pnpm install --frozen-lockfile
        
        - name: Lint
          run: pnpm lint
        
        - name: Type check
          run: pnpm type-check
        
        - name: Build
          run: pnpm build
  ```
- [ ] 添加 type-check 脚本到根 package.json
  ```json
  {
    "scripts": {
      "type-check": "pnpm --filter \"./packages/*\" run type-check"
    }
  }
  ```
- [ ] 为每个包添加 type-check 脚本
  ```json
  {
    "scripts": {
      "type-check": "tsc --noEmit"
    }
  }
  ```
- [ ] 测试 CI 流程（提交代码触发 CI）
- [ ] 添加 CI 状态徽章到 README
  ```markdown
  ![CI](https://github.com/yourusername/hexo-cms/workflows/CI/badge.svg)
  ```

#### 验收标准

- ✅ CI 在每次 push 和 PR 时运行
- ✅ 所有检查通过（lint + type-check + build）
- ✅ README 显示 CI 状态徽章

#### 预计工时

8 小时 (1 天)

### 2.6 Week 1 里程碑

**交付物**：
```
✅ README.md (完整的项目文档)
✅ .env.example (环境变量模板)
✅ CONTRIBUTING.md (贡献指南)
✅ .eslintrc.js (代码规范)
✅ package.json (依赖版本锁定)
✅ .github/workflows/ci.yml (CI 管道)
```

**验收标准**：
- ✅ 新开发者可以根据 README 在 30 分钟内启动项目
- ✅ CI 管道运行正常，所有检查通过
- ✅ 代码风格统一，无 ESLint 错误

---

## 3. Week 2: 依赖管理和规范

### 3.1 目标

建立自动化的依赖管理和代码提交规范，提升开发体验。

### 3.2 Day 1: Dependabot 和 PR/Issue 模板

#### 任务清单

**Day 1 上午 (4 小时)**：
- [ ] 创建 .github/dependabot.yml
  ```yaml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 10
      groups:
        tanstack:
          patterns:
            - "@tanstack/*"
        typescript:
          patterns:
            - "typescript"
            - "@types/*"
  ```
- [ ] 创建 .github/pull_request_template.md
  ```markdown
  ## 变更说明
  
  <!-- 简要描述这个 PR 的目的和变更内容 -->
  
  ## 变更类型
  
  - [ ] 新功能 (feat)
  - [ ] Bug 修复 (fix)
  - [ ] 文档更新 (docs)
  - [ ] 代码重构 (refactor)
  - [ ] 性能优化 (perf)
  - [ ] 测试相关 (test)
  - [ ] 构建/工具链 (chore)
  
  ## 测试
  
  - [ ] 本地测试通过
  - [ ] CI 测试通过
  - [ ] 手动测试通过
  
  ## 截图（如适用）
  
  <!-- 添加截图或 GIF -->
  
  ## 相关 Issue
  
  Closes #
  ```

**Day 1 下午 (4 小时)**：
- [ ] 创建 .github/ISSUE_TEMPLATE/bug_report.md
- [ ] 创建 .github/ISSUE_TEMPLATE/feature_request.md
- [ ] 测试模板是否正常工作

#### 验收标准

- ✅ Dependabot 每周自动创建依赖更新 PR
- ✅ PR 和 Issue 有统一格式

#### 预计工时

8 小时 (1 天)

### 3.3 Day 2: commit-lint 和 husky

#### 任务清单

**Day 2 全天 (8 小时)**：
- [ ] 安装依赖
  ```bash
  pnpm add -D @commitlint/cli @commitlint/config-conventional husky lint-staged
  ```
- [ ] 创建 commitlint.config.js
  ```javascript
  module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'type-enum': [
        2,
        'always',
        ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert'],
      ],
      'subject-case': [0],
    },
  };
  ```
- [ ] 初始化 husky
  ```bash
  pnpm exec husky init
  ```
- [ ] 配置 pre-commit hook
  ```bash
  # .husky/pre-commit
  pnpm lint-staged
  ```
- [ ] 配置 commit-msg hook
  ```bash
  # .husky/commit-msg
  pnpm commitlint --edit $1
  ```
- [ ] 配置 lint-staged
  ```json
  {
    "lint-staged": {
      "*.{ts,tsx}": ["eslint --fix", "git add"]
    }
  }
  ```
- [ ] 测试 hooks 是否正常工作

#### 验收标准

- ✅ 提交信息必须符合 Conventional Commits 规范
- ✅ 提交前自动运行 ESLint 修复

#### 预计工时

8 小时 (1 天)

### 3.4 Week 2 里程碑

**交付物**：
```
✅ .github/dependabot.yml
✅ .github/pull_request_template.md
✅ .github/ISSUE_TEMPLATE/
✅ commitlint.config.js
✅ .husky/ (pre-commit + commit-msg hooks)
```

**验收标准**：
- ✅ 依赖自动更新
- ✅ 提交规范强制执行
- ✅ PR/Issue 有统一格式

---

## 4. Week 3: 单元测试框架

### 4.1 目标

建立单元测试框架，为核心模块编写测试，达到 60% 覆盖率。

### 4.2 Day 1: Vitest 配置

#### 任务清单

**Day 1 全天 (8 小时)**：
- [ ] 安装 Vitest 依赖
  ```bash
  pnpm add -D vitest @vitest/ui @vitest/coverage-v8
  ```
- [ ] 为每个包创建 vitest.config.ts
  ```typescript
  // packages/core/vitest.config.ts
  import { defineConfig } from 'vitest/config';
  
  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
      },
    },
  });
  ```
- [ ] 添加测试脚本
  ```json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest --coverage"
    }
  }
  ```
- [ ] 在 CI 中添加测试步骤
  ```yaml
  - name: Test
    run: pnpm test --run
  
  - name: Upload coverage
    uses: codecov/codecov-action@v3
  ```

#### 验收标准

- ✅ Vitest 可以运行
- ✅ CI 中运行测试
- ✅ 覆盖率报告生成

#### 预计工时

8 小时 (1 天)

### 4.3 Day 2-3: DataProvider 测试

#### 任务清单

**Day 2-3 (16 小时)**：
- [ ] 创建 packages/core/src/__tests__/data-provider.test.ts
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { DataProvider } from '../data-provider';
  
  describe('DataProvider Interface', () => {
    it('should define all required methods', () => {
      // 测试接口定义
    });
  });
  ```
- [ ] 创建 packages/core/src/__tests__/github.test.ts
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { GitHubService } from '../github';
  
  describe('GitHubService', () => {
    let service: GitHubService;
    
    beforeEach(() => {
      service = new GitHubService('mock-token', {
        owner: 'test',
        repo: 'test-repo',
        branch: 'main',
      });
    });
    
    describe('getPosts', () => {
      it('should fetch posts from GitHub', async () => {
        // Mock Octokit
        // 测试 getPosts 方法
      });
    });
    
    describe('savePost', () => {
      it('should create a new post', async () => {
        // 测试创建文章
      });
      
      it('should update an existing post', async () => {
        // 测试更新文章
      });
    });
  });
  ```
- [ ] 编写 20+ 测试用例覆盖核心功能

#### 验收标准

- ✅ GitHubService 所有方法有测试
- ✅ 测试覆盖率 ≥80%

#### 预计工时

16 小时 (2 天)

### 4.4 Day 4-5: 工具函数测试

#### 任务清单

**Day 4-5 (16 小时)**：
- [ ] 创建 packages/ui/src/__tests__/utils.test.ts
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { cn } from '../utils';
  
  describe('cn utility', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });
    
    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar')).toBe('foo');
    });
  });
  ```
- [ ] 测试 frontmatter 解析逻辑
- [ ] 测试日期格式化函数
- [ ] 测试路径处理函数

#### 验收标准

- ✅ 所有工具函数有测试
- ✅ 边界情况覆盖

#### 预计工时

16 小时 (2 天)

### 4.5 Week 3 里程碑

**交付物**：
```
✅ vitest.config.ts (各包)
✅ packages/core/src/__tests__/
  ├── data-provider.test.ts
  ├── github.test.ts
  └── types.test.ts
✅ packages/ui/src/__tests__/
  └── utils.test.ts
✅ 测试覆盖率 ≥60%
```

**验收标准**：
- ✅ 核心模块测试覆盖率 ≥60%
- ✅ CI 中运行测试
- ✅ 测试报告上传到 Codecov

---

## 5. Week 4: 组件测试

### 5.1 目标

为关键 UI 组件编写测试，提升测试覆盖率到 70%。

### 5.2 Day 1: Testing Library 配置

#### 任务清单

**Day 1 全天 (8 小时)**：
- [ ] 安装依赖
  ```bash
  pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
- [ ] 更新 vitest.config.ts
  ```typescript
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
    },
  });
  ```
- [ ] 创建测试设置文件
  ```typescript
  // packages/ui/src/__tests__/setup.ts
  import '@testing-library/jest-dom';
  ```

#### 验收标准

- ✅ 可以测试 React 组件
- ✅ jsdom 环境正常工作

#### 预计工时

8 小时 (1 天)

### 5.3 Day 2-4: 关键页面测试

#### 任务清单

**Day 2-4 (24 小时)**：
- [ ] 测试 PostsPage
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, waitFor } from '@testing-library/react';
  import { PostsPage } from '../pages/posts';
  import { DataProviderProvider } from '../context/data-provider-context';
  
  describe('PostsPage', () => {
    it('should render posts list', async () => {
      const mockProvider = {
        getPosts: vi.fn().mockResolvedValue([
          { title: 'Test Post', slug: 'test-post', path: 'source/_posts/test-post.md' },
        ]),
      };
      
      render(
        <DataProviderProvider provider={mockProvider}>
          <PostsPage />
        </DataProviderProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
      });
    });
  });
  ```
- [ ] 测试 PagesPage
- [ ] 测试 MediaPage
- [ ] 测试 DashboardPage

#### 验收标准

- ✅ 关键页面渲染测试
- ✅ 用户交互测试

#### 预计工时

24 小时 (3 天)

### 5.4 Day 5: 组件测试

#### 任务清单

**Day 5 (8 小时)**：
- [ ] 测试 CMSLayout
- [ ] 测试 Sidebar
- [ ] 测试 Button/Card 等基础组件

#### 验收标准

- ✅ 基础组件有测试
- ✅ 布局组件有测试

#### 预计工时

8 小时 (1 天)

### 5.5 Week 4 里程碑

**交付物**：
```
✅ @testing-library/react 配置
✅ packages/ui/src/__tests__/pages/
  ├── posts.test.tsx
  ├── pages.test.tsx
  ├── media.test.tsx
  └── index.test.tsx
✅ packages/ui/src/__tests__/components/
  ├── layout.test.tsx
  └── ui/button.test.tsx
✅ 测试覆盖率 ≥70%
```

**验收标准**：
- ✅ 关键页面和组件有测试
- ✅ 测试覆盖率 ≥70%
- ✅ CI 中运行所有测试

---

## 6. 交付物和验收标准

### 6.1 Week 1-4 总交付物

```
hexo-cms/
├── README.md                          ✅ 完整的项目文档
├── .env.example                       ✅ 环境变量模板
├── CONTRIBUTING.md                    ✅ 贡献指南
├── .eslintrc.js                       ✅ ESLint 配置
├── commitlint.config.js               ✅ 提交规范
├── .github/
│   ├── workflows/
│   │   └── ci.yml                     ✅ CI 管道
│   ├── dependabot.yml                 ✅ 依赖自动更新
│   ├── pull_request_template.md      ✅ PR 模板
│   └── ISSUE_TEMPLATE/                ✅ Issue 模板
├── .husky/
│   ├── pre-commit                     ✅ 提交前检查
│   └── commit-msg                     ✅ 提交信息检查
└── packages/
    ├── core/
    │   ├── vitest.config.ts           ✅ 测试配置
    │   └── src/__tests__/             ✅ 单元测试
    └── ui/
        ├── vitest.config.ts           ✅ 测试配置
        └── src/__tests__/             ✅ 组件测试
```

### 6.2 最终验收标准

| 指标 | 目标 | 验收方式 |
|------|------|---------|
| **文档完整性** | README + CONTRIBUTING | 新开发者可在 30 分钟内启动项目 |
| **CI/CD** | 管道运行正常 | 每次 push/PR 自动运行 lint + test + build |
| **代码规范** | ESLint 0 错误 | `pnpm lint` 通过 |
| **提交规范** | Conventional Commits | husky hooks 强制执行 |
| **测试覆盖率** | ≥70% | Codecov 报告 |
| **依赖管理** | 无 latest 版本 | 所有依赖锁定版本 |

### 6.3 成功指标

- ✅ 工程实践评分从 3.65/5 提升到 4.2/5
- ✅ CI 通过率 ≥95%
- ✅ 新开发者上手时间从 2 小时缩短到 30 分钟
- ✅ 代码质量问题减少 80%

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-30  
**维护者**: Hexo CMS Team