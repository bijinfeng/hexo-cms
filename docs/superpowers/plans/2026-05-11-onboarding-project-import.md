# Onboarding Project Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual onboarding repository form with a Web/Desktop-consistent GitHub Project Import flow that lists writable repositories, validates Hexo structure, saves config, and routes first-time users into onboarding.

**Architecture:** Add a shared onboarding client contract in `@hexo-cms/ui`, then inject platform adapters from Web and Desktop routes. Web implements repository listing and validation through server endpoints backed by Better Auth GitHub access tokens. Desktop implements the same contract through Electron IPC backed by the local OAuth session.

**Tech Stack:** React 19, TanStack Router/Start, Electron IPC, Octokit, Better Auth, Drizzle SQLite, Vitest, Testing Library.

---

## File Structure

### Shared UI and Types

- Create `packages/ui/src/types/onboarding.ts`
  - Defines `OnboardingClient`, repository option, validation result, and config input types.
- Create `packages/ui/src/lib/repository-config.ts`
  - Converts onboarding config input into `GitHubConfig`.
- Modify `packages/ui/src/pages/onboarding.tsx`
  - Replaces manual form with Project Import UI.
- Modify `packages/ui/src/lib/auth-route-guard.ts`
  - Adds repository config awareness to route decisions.
- Modify `packages/ui/src/index.ts`
  - Exports onboarding types and helpers.
- Modify `packages/ui/src/__tests__/auth-ui.test.tsx`
  - Updates onboarding UI tests for repository import.
- Modify `packages/ui/src/__tests__/auth-route-guard.test.ts`
  - Adds config-aware guard tests.

### Web

- Create `packages/web/src/lib/onboarding-github.ts`
  - Shared server-side GitHub onboarding functions using an injected Octokit-like client.
- Create `packages/web/src/lib/onboarding-client.ts`
  - Browser adapter implementing `OnboardingClient`.
- Create `packages/web/src/lib/web-data-provider-instance.ts`
  - Exports the shared cached `WebDataProvider` instance used by both root guard and onboarding config save.
- Create `packages/web/src/lib/onboarding-github.test.ts`
  - Unit tests for repository filtering and validation.
- Create `packages/web/src/lib/onboarding-client.test.ts`
  - Unit tests for browser adapter mapping.
- Create `packages/web/src/routes/api/onboarding/repositories.ts`
  - Lists writable repositories.
- Create `packages/web/src/routes/api/onboarding/validate.ts`
  - Validates selected repository.
- Modify `packages/web/src/routes/api/github/config.ts`
  - Accepts camelCase and snake_case config keys.
- Modify `packages/web/src/routes/onboarding.tsx`
  - Injects `webOnboardingClient`.
- Modify `packages/web/src/routes/__root.tsx`
  - Routes authenticated users with no config to `/onboarding`.

### Desktop

- Create `packages/desktop/src/main/onboarding.ts`
  - Shared main-process repository list and validation functions using an injected Octokit-like client.
- Create `packages/desktop/src/main/onboarding.test.ts`
  - Unit tests for repository filtering and validation.
- Create `packages/desktop/src/renderer/src/lib/desktop-onboarding-client.ts`
  - Renderer adapter implementing `OnboardingClient`.
- Create `packages/desktop/src/renderer/src/lib/desktop-data-provider-instance.ts`
  - Exports the shared cached `DesktopDataProvider` instance used by both root guard and onboarding config save.
- Modify `packages/desktop/src/main/index.ts`
  - Adds onboarding IPC channels.
- Modify `packages/desktop/src/preload/index.ts`
  - Exposes onboarding methods and whitelists IPC channels.
- Modify `packages/ui/src/types/electron-api.ts`
  - Adds onboarding methods to `ElectronAPI`.
- Modify `packages/desktop/src/renderer/src/routes/onboarding.tsx`
  - Injects `desktopOnboardingClient`.
- Modify `packages/desktop/src/renderer/src/routes/__root.tsx`
  - Routes authenticated users with no config to `/onboarding`.

### Docs

- Modify `docs/auth/PRD_GITHUB_OAUTH.md`
  - Describes Project Import onboarding.
- Modify `docs/auth/TECHNICAL_DESIGN_GITHUB_OAUTH.md`
  - Adds onboarding adapter and config-aware route guard.

---

## Task 1: Shared Onboarding Types and Route Guard Contract

**Files:**
- Create: `packages/ui/src/types/onboarding.ts`
- Create: `packages/ui/src/lib/repository-config.ts`
- Modify: `packages/ui/src/lib/auth-route-guard.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/src/__tests__/auth-route-guard.test.ts`

- [ ] **Step 1: Write failing route guard tests**

Add these tests to `packages/ui/src/__tests__/auth-route-guard.test.ts`:

```ts
it("routes an authenticated user without repository config to onboarding", () => {
  const session: AuthSession = { state: "authenticated" };

  expect(getAuthRedirect({
    pathname: "/",
    session,
    hasConfig: false,
    isPending: false,
  })).toBe("/onboarding");
});

it("allows an authenticated user with repository config into protected routes", () => {
  const session: AuthSession = { state: "authenticated" };

  expect(getAuthRedirect({
    pathname: "/posts",
    session,
    hasConfig: true,
    isPending: false,
  })).toBeNull();
});

it("routes an authenticated user without config from login to onboarding", () => {
  const session: AuthSession = { state: "authenticated" };

  expect(getAuthRedirect({
    pathname: "/login",
    session,
    hasConfig: false,
    isPending: false,
  })).toBe("/onboarding");
});

it("keeps authenticated users on onboarding even before config exists", () => {
  const session: AuthSession = { state: "authenticated" };

  expect(getAuthRedirect({
    pathname: "/onboarding",
    session,
    hasConfig: false,
    isPending: false,
  })).toBeNull();
});
```

- [ ] **Step 2: Run route guard test to verify failure**

Run:

```bash
pnpm --filter @hexo-cms/ui exec vitest run src/__tests__/auth-route-guard.test.ts
```

Expected: FAIL because `getAuthRedirect` does not accept `hasConfig` and does not route to `/onboarding`.

- [ ] **Step 3: Add shared onboarding types**

Create `packages/ui/src/types/onboarding.ts`:

```ts
export interface OnboardingUser {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface RepositoryListInput {
  query?: string;
}

export interface RepositoryOption {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  pushedAt?: string | null;
  permissions: {
    push: boolean;
  };
}

export interface RepositorySelection {
  owner: string;
  repo: string;
  branch?: string;
}

export type RepositoryValidationCheckId = "access" | "permission" | "branch" | "hexo";

export type RepositoryValidationError =
  | "REPO_NOT_FOUND"
  | "PERMISSION_REQUIRED"
  | "BRANCH_NOT_FOUND"
  | "NOT_HEXO_REPO"
  | "NETWORK_ERROR"
  | "REAUTH_REQUIRED";

export interface RepositoryValidationCheck {
  id: RepositoryValidationCheckId;
  status: "success" | "error";
  message: string;
}

export interface RepositoryConfigInput {
  owner: string;
  repo: string;
  branch: string;
  postsDir: string;
  mediaDir: string;
  workflowFile: string;
  autoDeploy: boolean;
  deployNotifications: boolean;
}

export interface RepositoryValidation {
  ok: boolean;
  repository?: RepositoryOption;
  defaultConfig?: RepositoryConfigInput;
  checks: RepositoryValidationCheck[];
  error?: RepositoryValidationError;
}

export interface OnboardingClient {
  getCurrentUser: () => Promise<OnboardingUser>;
  reauthorize: () => Promise<void>;
  listRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  saveRepositoryConfig: (input: RepositoryConfigInput) => Promise<void>;
}
```

- [ ] **Step 4: Add repository config mapper**

Create `packages/ui/src/lib/repository-config.ts`:

```ts
import type { GitHubConfig } from "@hexo-cms/core";
import type { RepositoryConfigInput } from "../types/onboarding";

export function toGitHubConfig(input: RepositoryConfigInput): GitHubConfig {
  return {
    owner: input.owner,
    repo: input.repo,
    branch: input.branch,
    postsDir: input.postsDir,
    mediaDir: input.mediaDir,
    workflowFile: input.workflowFile,
    autoDeploy: input.autoDeploy,
    deployNotifications: input.deployNotifications,
  };
}
```

- [ ] **Step 5: Implement config-aware route guard**

Replace `packages/ui/src/lib/auth-route-guard.ts` with:

```ts
import type { AuthSession } from "../types/auth";

const PUBLIC_ROUTES = new Set(["/login"]);
const ONBOARDING_ROUTE = "/onboarding";

export function getAuthRedirect({
  pathname,
  session,
  hasConfig,
  isPending,
}: {
  pathname: string;
  session: AuthSession | null;
  hasConfig?: boolean | null;
  isPending: boolean;
}): "/" | "/login" | "/onboarding" | null {
  if (isPending) return null;

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isOnboardingRoute = pathname === ONBOARDING_ROUTE;
  const isAuthenticated = session?.state === "authenticated";

  if (!isAuthenticated) {
    if (isPublicRoute) return null;
    return "/login";
  }

  if (isOnboardingRoute) return null;

  if (hasConfig === false) {
    return "/onboarding";
  }

  if (isPublicRoute) return "/";

  return null;
}

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}
```

- [ ] **Step 6: Export new shared APIs**

Modify `packages/ui/src/index.ts` to export:

```ts
export { getAuthRedirect, isOnboardingRoute, isPublicAuthRoute } from "./lib/auth-route-guard";
export { toGitHubConfig } from "./lib/repository-config";
export type {
  AuthClient,
  AuthSession,
  AuthState,
  AuthUser,
  DeviceFlowInfo,
  OnboardingClient,
  OnboardingUser,
  RepositoryConfigInput,
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
  RepositoryValidationCheck,
  RepositoryValidationCheckId,
  RepositoryValidationError,
} from "./types/onboarding";
export type { ElectronAPI } from "./types/electron-api";
```

Keep the existing auth exports in the same file.

- [ ] **Step 7: Run tests**

Run:

```bash
pnpm --filter @hexo-cms/ui exec vitest run src/__tests__/auth-route-guard.test.ts
pnpm -r exec tsc --noEmit --pretty false
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/types/onboarding.ts packages/ui/src/lib/repository-config.ts packages/ui/src/lib/auth-route-guard.ts packages/ui/src/index.ts packages/ui/src/__tests__/auth-route-guard.test.ts
git commit -m "feat(onboarding): add project import contracts"
```

---

## Task 2: Shared Project Import UI

**Files:**
- Modify: `packages/ui/src/pages/onboarding.tsx`
- Modify: `packages/ui/src/__tests__/auth-ui.test.tsx`

- [ ] **Step 1: Replace onboarding tests with Project Import tests**

In `packages/ui/src/__tests__/auth-ui.test.tsx`, update the onboarding test area to use an `OnboardingClient`.

Add this helper near the existing test helpers:

```ts
import type {
  OnboardingClient,
  RepositoryConfigInput,
  RepositoryOption,
  RepositoryValidation,
} from "../types/onboarding";

function createOnboardingClient(overrides: Partial<OnboardingClient> = {}): OnboardingClient {
  const repository: RepositoryOption = {
    id: "repo-1",
    owner: "kebai",
    name: "blog",
    fullName: "kebai/blog",
    private: false,
    defaultBranch: "main",
    pushedAt: "2026-05-11T08:00:00.000Z",
    permissions: { push: true },
  };
  const defaultConfig: RepositoryConfigInput = {
    owner: "kebai",
    repo: "blog",
    branch: "main",
    postsDir: "source/_posts",
    mediaDir: "source/images",
    workflowFile: ".github/workflows/deploy.yml",
    autoDeploy: true,
    deployNotifications: true,
  };
  const validation: RepositoryValidation = {
    ok: true,
    repository,
    defaultConfig,
    checks: [
      { id: "access", status: "success", message: "仓库可访问" },
      { id: "permission", status: "success", message: "具备写权限" },
      { id: "branch", status: "success", message: "默认分支存在" },
      { id: "hexo", status: "success", message: "检测到 Hexo 结构" },
    ],
  };

  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      login: "kebai",
      name: "Kebai",
      avatarUrl: "https://example.com/avatar.png",
    }),
    reauthorize: vi.fn().mockResolvedValue(undefined),
    listRepositories: vi.fn().mockResolvedValue([repository]),
    validateRepository: vi.fn().mockResolvedValue(validation),
    saveRepositoryConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

Replace the old onboarding test with:

```ts
it("shows repository import as the onboarding primary path", async () => {
  const onboardingClient = createOnboardingClient();

  render(<OnboardingPage onboardingClient={onboardingClient} />);

  expect(await screen.findByText("导入 Hexo 仓库")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("搜索仓库")).toBeInTheDocument();
  expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
  expect(screen.queryByLabelText("GitHub Token")).not.toBeInTheDocument();
  expect(screen.queryByText(/Personal Access Token/i)).not.toBeInTheDocument();
});

it("validates a selected repository before saving onboarding config", async () => {
  const user = userEvent.setup();
  const onboardingClient = createOnboardingClient();

  render(<OnboardingPage onboardingClient={onboardingClient} />);

  await user.click(await screen.findByText("kebai/blog"));
  expect(await screen.findByText("检测到 Hexo 结构")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "开始管理" }));

  expect(onboardingClient.validateRepository).toHaveBeenCalledWith({
    owner: "kebai",
    repo: "blog",
    branch: "main",
  });
  expect(onboardingClient.saveRepositoryConfig).toHaveBeenCalledWith({
    owner: "kebai",
    repo: "blog",
    branch: "main",
    postsDir: "source/_posts",
    mediaDir: "source/images",
    workflowFile: ".github/workflows/deploy.yml",
    autoDeploy: true,
    deployNotifications: true,
  });
});

it("does not save onboarding config when Hexo validation fails", async () => {
  const user = userEvent.setup();
  const onboardingClient = createOnboardingClient({
    validateRepository: vi.fn().mockResolvedValue({
      ok: false,
      checks: [
        { id: "access", status: "success", message: "仓库可访问" },
        { id: "permission", status: "success", message: "具备写权限" },
        { id: "branch", status: "success", message: "默认分支存在" },
        { id: "hexo", status: "error", message: "未检测到 Hexo 配置" },
      ],
      error: "NOT_HEXO_REPO",
    }),
  });

  render(<OnboardingPage onboardingClient={onboardingClient} />);

  await user.click(await screen.findByText("kebai/blog"));

  expect(await screen.findByText("未检测到 Hexo 配置，请选择已有 Hexo 博客仓库")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "开始管理" })).not.toBeInTheDocument();
  expect(onboardingClient.saveRepositoryConfig).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run UI tests to verify failure**

Run:

```bash
pnpm --filter @hexo-cms/ui exec vitest run src/__tests__/auth-ui.test.tsx
```

Expected: FAIL because `OnboardingPage` does not accept `onboardingClient` and still renders the manual form.

- [ ] **Step 3: Implement Project Import OnboardingPage**

Replace `packages/ui/src/pages/onboarding.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { CheckCircle2, Loader2, RefreshCw, Search, Settings2, AlertCircle } from "lucide-react";
import { GithubIcon } from "../components/ui/github-icon";
import type {
  OnboardingClient,
  OnboardingUser,
  RepositoryConfigInput,
  RepositoryOption,
  RepositoryValidation,
  RepositoryValidationError,
} from "../types/onboarding";

const errorMessages: Record<RepositoryValidationError, string> = {
  REPO_NOT_FOUND: "未找到这个仓库，请确认已授权访问",
  PERMISSION_REQUIRED: "当前授权缺少仓库读写权限，请重新授权",
  BRANCH_NOT_FOUND: "未找到目标分支",
  NOT_HEXO_REPO: "未检测到 Hexo 配置，请选择已有 Hexo 博客仓库",
  NETWORK_ERROR: "验证失败，请重试",
  REAUTH_REQUIRED: "当前授权缺少仓库读写权限，请重新授权",
};

function formatPushedAt(pushedAt?: string | null): string {
  if (!pushedAt) return "最近更新未知";
  return `更新于 ${new Date(pushedAt).toLocaleDateString("zh-CN")}`;
}

export function OnboardingPage({ onboardingClient }: { onboardingClient: OnboardingClient }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<OnboardingUser | null>(null);
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRepository, setSelectedRepository] = useState<RepositoryOption | null>(null);
  const [validation, setValidation] = useState<RepositoryValidation | null>(null);
  const [config, setConfig] = useState<RepositoryConfigInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reauthorizing, setReauthorizing] = useState(false);
  const [error, setError] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualOwner, setManualOwner] = useState("");
  const [manualRepo, setManualRepo] = useState("");

  async function loadRepositories(nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const [nextUser, nextRepositories] = await Promise.all([
        onboardingClient.getCurrentUser(),
        onboardingClient.listRepositories({ query: nextQuery }),
      ]);
      setUser(nextUser);
      setRepositories(nextRepositories);
    } catch {
      setError("仓库列表加载失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRepositories("");
  }, []);

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repositories;
    return repositories.filter((repository) =>
      repository.fullName.toLowerCase().includes(normalizedQuery)
    );
  }, [query, repositories]);

  async function validateSelection(repository: RepositoryOption) {
    setSelectedRepository(repository);
    setValidation(null);
    setConfig(null);
    setValidating(true);
    setError("");
    try {
      const result = await onboardingClient.validateRepository({
        owner: repository.owner,
        repo: repository.name,
        branch: repository.defaultBranch,
      });
      setValidation(result);
      setConfig(result.defaultConfig ?? null);
      if (!result.ok && result.error) setError(errorMessages[result.error]);
    } catch {
      setError("验证失败，请重试");
    } finally {
      setValidating(false);
    }
  }

  async function validateManualSelection() {
    if (!manualOwner.trim() || !manualRepo.trim()) return;
    const repository: RepositoryOption = {
      id: `${manualOwner}/${manualRepo}`,
      owner: manualOwner.trim(),
      name: manualRepo.trim(),
      fullName: `${manualOwner.trim()}/${manualRepo.trim()}`,
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    await validateSelection(repository);
  }

  async function reauthorize() {
    setReauthorizing(true);
    setError("");
    try {
      await onboardingClient.reauthorize();
      await loadRepositories("");
    } catch {
      setError("重新授权失败，请重试");
    } finally {
      setReauthorizing(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      await onboardingClient.saveRepositoryConfig(config);
      navigate({ to: "/" });
    } catch {
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--border-default)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">导入 Hexo 仓库</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              选择一个已授权且可写的 GitHub 仓库，HexoCMS 会验证它是否是可管理的 Hexo 博客。
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
                  <GithubIcon size={18} />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{user?.name ?? user?.login ?? "GitHub"}</div>
                <div className="truncate text-xs text-[var(--text-secondary)]">{user?.login ?? "已授权账号"}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={reauthorize} disabled={reauthorizing}>
              {reauthorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw size={16} />}
              重新授权
            </Button>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="border-b border-[var(--border-default)] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索仓库"
                  className="form-input w-full pl-9"
                />
              </div>
            </div>

            <div className="min-h-[360px] p-2">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-[var(--text-secondary)]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在加载仓库...
                </div>
              ) : filteredRepositories.length > 0 ? (
                <div className="space-y-1">
                  {filteredRepositories.map((repository) => (
                    <button
                      key={repository.id}
                      onClick={() => validateSelection(repository)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedRepository?.id === repository.id
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary-subtle)]"
                          : "border-transparent hover:bg-[var(--bg-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--text-primary)]">{repository.fullName}</div>
                          <div className="mt-1 text-xs text-[var(--text-secondary)]">
                            默认分支 {repository.defaultBranch} · {formatPushedAt(repository.pushedAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={repository.private ? "default" : "green"}>{repository.private ? "Private" : "Public"}</Badge>
                          <Badge variant="success">可写</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">未找到可写仓库，请检查 GitHub 授权权限</p>
                  <Button variant="outline" onClick={() => loadRepositories(query)}>
                    <RefreshCw size={16} />
                    重试
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-default)] p-4">
              <button
                type="button"
                className="text-sm font-medium text-[var(--brand-primary)] hover:underline"
                onClick={() => setShowManualEntry((value) => !value)}
              >
                找不到仓库？手动输入
              </button>
              {showManualEntry && (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input className="form-input" value={manualOwner} onChange={(event) => setManualOwner(event.target.value)} placeholder="owner" />
                  <input className="form-input" value={manualRepo} onChange={(event) => setManualRepo(event.target.value)} placeholder="repo" />
                  <Button onClick={validateManualSelection} disabled={!manualOwner.trim() || !manualRepo.trim() || validating}>
                    验证
                  </Button>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">验证结果</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">选择仓库后会自动验证 Hexo 结构和写权限。</p>

            <div className="mt-5 space-y-3">
              {validating && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在验证仓库...
                </div>
              )}
              {!validating && validation?.checks.map((check) => (
                <div key={check.id} className="flex items-center gap-2 text-sm">
                  {check.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[var(--status-error)]" />
                  )}
                  <span className={check.status === "success" ? "text-[var(--text-primary)]" : "text-[var(--status-error)]"}>
                    {check.message}
                  </span>
                </div>
              ))}
            </div>

            {config && validation?.ok && (
              <div className="mt-6 space-y-4 border-t border-[var(--border-default)] pt-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">分支</label>
                  <input className="form-input w-full" value={config.branch} onChange={(event) => setConfig({ ...config, branch: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">文章目录</label>
                  <input className="form-input w-full" value={config.postsDir} onChange={(event) => setConfig({ ...config, postsDir: event.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">媒体目录</label>
                  <input className="form-input w-full" value={config.mediaDir} onChange={(event) => setConfig({ ...config, mediaDir: event.target.value })} />
                </div>
                <details>
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <Settings2 size={14} />
                    高级配置
                  </summary>
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Workflow 文件</label>
                    <input className="form-input w-full" value={config.workflowFile} onChange={(event) => setConfig({ ...config, workflowFile: event.target.value })} />
                  </div>
                </details>
                <Button onClick={saveConfig} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  开始管理
                </Button>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run UI tests**

Run:

```bash
pnpm --filter @hexo-cms/ui exec vitest run src/__tests__/auth-ui.test.tsx
pnpm -r exec tsc --noEmit --pretty false
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/pages/onboarding.tsx packages/ui/src/__tests__/auth-ui.test.tsx
git commit -m "feat(onboarding): add project import UI"
```

---

## Task 3: Web Onboarding GitHub Service and API Routes

**Files:**
- Create: `packages/web/src/lib/onboarding-github.ts`
- Create: `packages/web/src/lib/onboarding-github.test.ts`
- Create: `packages/web/src/routes/api/onboarding/repositories.ts`
- Create: `packages/web/src/routes/api/onboarding/validate.ts`
- Modify: `packages/web/src/routes/api/github/config.ts`

- [ ] **Step 1: Write Web service tests**

Create `packages/web/src/lib/onboarding-github.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { listWritableRepositories, validateHexoRepository } from "./onboarding-github";

function createOctokit(overrides: Record<string, unknown> = {}) {
  return {
    request: vi.fn(),
    rest: {
      repos: {
        getBranch: vi.fn(),
        getContent: vi.fn(),
      },
    },
    ...overrides,
  };
}

describe("onboarding-github", () => {
  it("returns only writable repositories from the authenticated user", async () => {
    const octokit = createOctokit();
    octokit.request.mockResolvedValue({
      data: [
        {
          id: 1,
          owner: { login: "kebai" },
          name: "blog",
          full_name: "kebai/blog",
          private: false,
          default_branch: "main",
          pushed_at: "2026-05-11T08:00:00Z",
          permissions: { push: true },
        },
        {
          id: 2,
          owner: { login: "org" },
          name: "readonly",
          full_name: "org/readonly",
          private: true,
          default_branch: "main",
          permissions: { push: false },
        },
      ],
    });

    await expect(listWritableRepositories(octokit as any, { query: "blog" })).resolves.toEqual([
      {
        id: "1",
        owner: "kebai",
        name: "blog",
        fullName: "kebai/blog",
        private: false,
        defaultBranch: "main",
        pushedAt: "2026-05-11T08:00:00Z",
        permissions: { push: true },
      },
    ]);
  });

  it("validates a writable Hexo repository", async () => {
    const octokit = createOctokit();
    octokit.request.mockResolvedValue({
      data: {
        id: 1,
        owner: { login: "kebai" },
        name: "blog",
        full_name: "kebai/blog",
        private: false,
        default_branch: "main",
        permissions: { push: true },
      },
    });
    octokit.rest.repos.getBranch.mockResolvedValue({ data: { name: "main" } });
    octokit.rest.repos.getContent.mockResolvedValueOnce({ data: { type: "file" } });

    const result = await validateHexoRepository(octokit as any, {
      owner: "kebai",
      repo: "blog",
      branch: "main",
    });

    expect(result.ok).toBe(true);
    expect(result.defaultConfig).toEqual({
      owner: "kebai",
      repo: "blog",
      branch: "main",
      postsDir: "source/_posts",
      mediaDir: "source/images",
      workflowFile: ".github/workflows/deploy.yml",
      autoDeploy: true,
      deployNotifications: true,
    });
  });

  it("rejects repositories without Hexo structure", async () => {
    const octokit = createOctokit();
    octokit.request.mockResolvedValue({
      data: {
        id: 1,
        owner: { login: "kebai" },
        name: "not-hexo",
        full_name: "kebai/not-hexo",
        private: false,
        default_branch: "main",
        permissions: { push: true },
      },
    });
    octokit.rest.repos.getBranch.mockResolvedValue({ data: { name: "main" } });
    octokit.rest.repos.getContent
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 }));

    await expect(validateHexoRepository(octokit as any, {
      owner: "kebai",
      repo: "not-hexo",
      branch: "main",
    })).resolves.toMatchObject({
      ok: false,
      error: "NOT_HEXO_REPO",
    });
  });
});
```

- [ ] **Step 2: Run Web service tests to verify failure**

Run:

```bash
pnpm --filter @hexo-cms/web exec vitest run src/lib/onboarding-github.test.ts
```

Expected: FAIL because `onboarding-github.ts` does not exist.

- [ ] **Step 3: Implement Web onboarding GitHub helpers**

Create `packages/web/src/lib/onboarding-github.ts`:

```ts
import type { RepositoryOption, RepositorySelection, RepositoryValidation } from "@hexo-cms/ui";

type GitHubRepoPayload = {
  id: number | string;
  owner?: { login?: string };
  name?: string;
  full_name?: string;
  private?: boolean;
  default_branch?: string;
  pushed_at?: string | null;
  permissions?: { push?: boolean };
};

type OctokitLike = {
  request: (route: string, parameters?: Record<string, unknown>) => Promise<{ data: unknown }>;
  rest: {
    repos: {
      getBranch: (parameters: { owner: string; repo: string; branch: string }) => Promise<unknown>;
      getContent: (parameters: { owner: string; repo: string; path: string; ref?: string }) => Promise<unknown>;
    };
  };
};

function toRepositoryOption(repo: GitHubRepoPayload): RepositoryOption {
  const [fallbackOwner = "", fallbackName = ""] = (repo.full_name ?? "").split("/");
  const owner = repo.owner?.login ?? fallbackOwner;
  const name = repo.name ?? fallbackName;
  return {
    id: String(repo.id),
    owner,
    name,
    fullName: repo.full_name ?? `${owner}/${name}`,
    private: repo.private ?? false,
    defaultBranch: repo.default_branch ?? "main",
    pushedAt: repo.pushed_at ?? null,
    permissions: {
      push: repo.permissions?.push === true,
    },
  };
}

function successCheck(id: "access" | "permission" | "branch" | "hexo", message: string) {
  return { id, status: "success" as const, message };
}

function errorCheck(id: "access" | "permission" | "branch" | "hexo", message: string) {
  return { id, status: "error" as const, message };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: unknown }).status === 404;
}

async function hasPath(octokit: OctokitLike, selection: RepositorySelection, path: string): Promise<boolean> {
  try {
    await octokit.rest.repos.getContent({
      owner: selection.owner,
      repo: selection.repo,
      path,
      ref: selection.branch,
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function listWritableRepositories(
  octokit: OctokitLike,
  input: { query?: string },
): Promise<RepositoryOption[]> {
  const response = await octokit.request("GET /user/repos", {
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });
  const repos = Array.isArray(response.data) ? response.data as GitHubRepoPayload[] : [];
  const query = input.query?.trim().toLowerCase() ?? "";
  return repos
    .map(toRepositoryOption)
    .filter((repo) => repo.permissions.push)
    .filter((repo) => !query || repo.fullName.toLowerCase().includes(query));
}

export async function validateHexoRepository(
  octokit: OctokitLike,
  selection: RepositorySelection,
): Promise<RepositoryValidation> {
  const checks: RepositoryValidation["checks"] = [];

  try {
    const repoResponse = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: selection.owner,
      repo: selection.repo,
    });
    const repository = toRepositoryOption(repoResponse.data as GitHubRepoPayload);
    checks.push(successCheck("access", "仓库可访问"));

    if (!repository.permissions.push) {
      checks.push(errorCheck("permission", "当前授权缺少仓库读写权限"));
      return { ok: false, repository, checks, error: "PERMISSION_REQUIRED" };
    }
    checks.push(successCheck("permission", "具备写权限"));

    const branch = selection.branch || repository.defaultBranch;
    try {
      await octokit.rest.repos.getBranch({
        owner: selection.owner,
        repo: selection.repo,
        branch,
      });
      checks.push(successCheck("branch", "默认分支存在"));
    } catch (error) {
      if (isNotFound(error)) {
        checks.push(errorCheck("branch", "未找到目标分支"));
        return { ok: false, repository, checks, error: "BRANCH_NOT_FOUND" };
      }
      throw error;
    }

    const hasHexoConfig = await hasPath(octokit, { ...selection, branch }, "_config.yml");
    const hasPostsDir = hasHexoConfig ? true : await hasPath(octokit, { ...selection, branch }, "source/_posts");
    if (!hasHexoConfig && !hasPostsDir) {
      checks.push(errorCheck("hexo", "未检测到 Hexo 配置"));
      return { ok: false, repository, checks, error: "NOT_HEXO_REPO" };
    }

    checks.push(successCheck("hexo", "检测到 Hexo 结构"));
    return {
      ok: true,
      repository,
      checks,
      defaultConfig: {
        owner: selection.owner,
        repo: selection.repo,
        branch,
        postsDir: "source/_posts",
        mediaDir: "source/images",
        workflowFile: ".github/workflows/deploy.yml",
        autoDeploy: true,
        deployNotifications: true,
      },
    };
  } catch (error) {
    if (isNotFound(error)) {
      return {
        ok: false,
        checks: [errorCheck("access", "未找到这个仓库，请确认已授权访问")],
        error: "REPO_NOT_FOUND",
      };
    }
    return {
      ok: false,
      checks: [errorCheck("access", "验证失败，请重试")],
      error: "NETWORK_ERROR",
    };
  }
}
```

- [ ] **Step 4: Add Web API routes**

Create `packages/web/src/routes/api/onboarding/repositories.ts`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";
import { listWritableRepositories } from "../../../lib/onboarding-github";

export const Route = createFileRoute("/api/onboarding/repositories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "UNAUTHORIZED" }, 401);
        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) return json({ error: "REAUTH_REQUIRED" }, 401);
        const { Octokit } = await import("octokit");
        const url = new URL(request.url);
        const repositories = await listWritableRepositories(new Octokit({ auth: accessToken }) as any, {
          query: url.searchParams.get("q") ?? undefined,
        });
        return json({ repositories });
      },
    },
  },
});
```

Create `packages/web/src/routes/api/onboarding/validate.ts`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { getAuth, getGitHubAccessTokenFromAuth, json } from "../../../lib/server-utils";
import { validateHexoRepository } from "../../../lib/onboarding-github";

export const Route = createFileRoute("/api/onboarding/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "UNAUTHORIZED" }, 401);
        const { auth } = await import("../../../lib/auth");
        const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
        if (!accessToken) return json({ error: "REAUTH_REQUIRED" }, 401);
        const selection = await request.json();
        const { Octokit } = await import("octokit");
        const validation = await validateHexoRepository(new Octokit({ auth: accessToken }) as any, selection);
        return json({ validation }, validation.ok ? 200 : 400);
      },
    },
  },
});
```

- [ ] **Step 5: Make config API accept camelCase and snake_case**

Modify the `values` object in `packages/web/src/routes/api/github/config.ts`:

```ts
const values = {
  owner: body.owner,
  repo: body.repo,
  branch: body.branch || "main",
  postsDir: body.postsDir || body.posts_dir || "source/_posts",
  mediaDir: body.mediaDir || body.media_dir || "source/images",
  workflowFile: body.workflowFile || body.workflow_file || ".github/workflows/deploy.yml",
  autoDeploy: body.autoDeploy ?? (body.auto_deploy !== false),
  deployNotifications: body.deployNotifications ?? (body.deploy_notifications !== false),
  updatedAt: new Date().toISOString(),
};
```

- [ ] **Step 6: Run Web tests**

Run:

```bash
pnpm --filter @hexo-cms/web exec vitest run src/lib/onboarding-github.test.ts src/lib/server-utils.test.ts src/lib/web-data-provider.test.ts
pnpm -r exec tsc --noEmit --pretty false
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/lib/onboarding-github.ts packages/web/src/lib/onboarding-github.test.ts packages/web/src/routes/api/onboarding/repositories.ts packages/web/src/routes/api/onboarding/validate.ts packages/web/src/routes/api/github/config.ts
git commit -m "feat(web): add onboarding repository validation APIs"
```

---

## Task 4: Web Onboarding Client and Config-Aware Root Guard

**Files:**
- Create: `packages/web/src/lib/onboarding-client.ts`
- Create: `packages/web/src/lib/web-data-provider-instance.ts`
- Create: `packages/web/src/lib/onboarding-client.test.ts`
- Modify: `packages/web/src/routes/onboarding.tsx`
- Modify: `packages/web/src/routes/__root.tsx`

- [ ] **Step 1: Write Web onboarding client tests**

Create `packages/web/src/lib/onboarding-client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { webOnboardingClient } from "./onboarding-client";

describe("webOnboardingClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads repositories from the onboarding endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        repositories: [{
          id: "1",
          owner: "kebai",
          name: "blog",
          fullName: "kebai/blog",
          private: false,
          defaultBranch: "main",
          permissions: { push: true },
        }],
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(webOnboardingClient.listRepositories({ query: "blog" })).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/repositories?q=blog");
  });

  it("saves repository config through the existing config API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await webOnboardingClient.saveRepositoryConfig({
      owner: "kebai",
      repo: "blog",
      branch: "main",
      postsDir: "source/_posts",
      mediaDir: "source/images",
      workflowFile: ".github/workflows/deploy.yml",
      autoDeploy: true,
      deployNotifications: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/github/config", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
  });
});
```

- [ ] **Step 2: Run Web client test to verify failure**

Run:

```bash
pnpm --filter @hexo-cms/web exec vitest run src/lib/onboarding-client.test.ts
```

Expected: FAIL because `onboarding-client.ts` does not exist.

- [ ] **Step 3: Add shared Web data provider instance**

Create `packages/web/src/lib/web-data-provider-instance.ts`:

```ts
import { withCache } from "@hexo-cms/ui";
import { WebDataProvider } from "./web-data-provider";

export const webDataProvider = withCache(new WebDataProvider());
```

- [ ] **Step 4: Implement Web onboarding client**

Create `packages/web/src/lib/onboarding-client.ts`:

```ts
import { authClient, webAuthClient } from "./auth-client";
import { toGitHubConfig, type OnboardingClient, type OnboardingUser, type RepositoryConfigInput, type RepositoryValidation } from "@hexo-cms/ui";
import { webDataProvider } from "./web-data-provider-instance";

async function assertOk(response: Response, operation: string): Promise<Response> {
  if (response.ok) return response;
  throw new Error(`${operation} failed`);
}

export const webOnboardingClient: OnboardingClient = {
  async getCurrentUser(): Promise<OnboardingUser> {
    const session = await authClient.getSession();
    const user = session.data?.user;
    return {
      login: user?.email ?? user?.name ?? "github",
      name: user?.name,
      avatarUrl: user?.image,
    };
  },
  async reauthorize() {
    await webAuthClient.reauthorize();
  },
  async listRepositories(input) {
    const query = input.query ? `?q=${encodeURIComponent(input.query)}` : "";
    const response = await assertOk(await fetch(`/api/onboarding/repositories${query}`), "list repositories");
    const data = await response.json() as { repositories?: Awaited<ReturnType<OnboardingClient["listRepositories"]>> };
    return data.repositories ?? [];
  },
  async validateRepository(input) {
    const response = await fetch("/api/onboarding/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json() as { validation?: RepositoryValidation };
    if (data.validation) return data.validation;
    throw new Error("validate repository failed");
  },
  async saveRepositoryConfig(input: RepositoryConfigInput) {
    await webDataProvider.saveConfig(toGitHubConfig(input));
  },
};
```

- [ ] **Step 5: Inject Web onboarding client into route**

Modify `packages/web/src/routes/onboarding.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@hexo-cms/ui";
import { webOnboardingClient } from "../lib/onboarding-client";

function WebOnboardingPage() {
  return <OnboardingPage onboardingClient={webOnboardingClient} />;
}

export const Route = createFileRoute("/onboarding")({ component: WebOnboardingPage });
```

- [ ] **Step 6: Make Web root guard check config**

Replace `packages/web/src/routes/__root.tsx` with:

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  PluginProvider,
  getAuthRedirect,
  isOnboardingRoute,
  isPublicAuthRoute,
  type AuthSession,
} from "@hexo-cms/ui";
import { webAuthClient } from "../lib/auth-client";
import { webDataProvider } from "../lib/web-data-provider-instance";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`;

function NotFound() {
  return <div className="flex h-full items-center justify-center text-sm">404 — 页面不存在</div>;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hexo CMS" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = isOnboardingRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      setIsPending(true);
      setHasConfig(null);
      try {
        const nextSession = await webAuthClient.getSession();
        if (!active) return;
        setSession(nextSession);
        if (nextSession.state === "authenticated") {
          const config = await webDataProvider.getConfig();
          if (active) setHasConfig(Boolean(config));
        } else if (active) {
          setHasConfig(null);
        }
      } catch {
        if (active) {
          setSession({ state: "anonymous" });
          setHasConfig(null);
        }
      } finally {
        if (active) setIsPending(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  const guardPending = isPending || (session?.state === "authenticated" && hasConfig === null && !isSetupRoute);

  useEffect(() => {
    const redirect = getAuthRedirect({
      pathname,
      session,
      hasConfig,
      isPending: guardPending,
    });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, hasConfig, guardPending, pathname, navigate]);

  if (guardPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  if (isPublicRoute || isSetupRoute) {
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  }

  return (
    <DataProviderProvider provider={webDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          <CMSLayout>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </CMSLayout>
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}
```

- [ ] **Step 7: Run Web checks**

Run:

```bash
pnpm --filter @hexo-cms/web exec vitest run src/lib/onboarding-client.test.ts src/lib/auth-client.test.ts
pnpm -r exec tsc --noEmit --pretty false
pnpm --filter @hexo-cms/web build
```

Expected: PASS. Web build may show existing chunk size warnings.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/lib/onboarding-client.ts packages/web/src/lib/web-data-provider-instance.ts packages/web/src/lib/onboarding-client.test.ts packages/web/src/routes/onboarding.tsx packages/web/src/routes/__root.tsx
git commit -m "feat(web): wire project import onboarding"
```

---

## Task 5: Desktop Onboarding IPC and Client

**Files:**
- Create: `packages/desktop/src/main/onboarding.ts`
- Create: `packages/desktop/src/main/onboarding.test.ts`
- Create: `packages/desktop/src/renderer/src/lib/desktop-onboarding-client.ts`
- Create: `packages/desktop/src/renderer/src/lib/desktop-data-provider-instance.ts`
- Modify: `packages/desktop/src/main/index.ts`
- Modify: `packages/desktop/src/preload/index.ts`
- Modify: `packages/ui/src/types/electron-api.ts`
- Modify: `packages/desktop/src/renderer/src/routes/onboarding.tsx`

- [ ] **Step 1: Write Desktop onboarding main tests**

Create `packages/desktop/src/main/onboarding.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { listWritableRepositories, validateHexoRepository } from "./onboarding";

describe("desktop onboarding", () => {
  it("filters repositories to writable options", async () => {
    const octokit = {
      request: vi.fn().mockResolvedValue({
        data: [
          { id: 1, owner: { login: "kebai" }, name: "blog", full_name: "kebai/blog", default_branch: "main", permissions: { push: true } },
          { id: 2, owner: { login: "kebai" }, name: "read", full_name: "kebai/read", default_branch: "main", permissions: { push: false } },
        ],
      }),
    };

    await expect(listWritableRepositories(octokit as any, { query: "" })).resolves.toEqual([
      expect.objectContaining({ fullName: "kebai/blog", permissions: { push: true } }),
    ]);
  });

  it("validates Hexo structure before returning default config", async () => {
    const octokit = {
      request: vi.fn().mockResolvedValue({
        data: { id: 1, owner: { login: "kebai" }, name: "blog", full_name: "kebai/blog", default_branch: "main", permissions: { push: true } },
      }),
      rest: {
        repos: {
          getBranch: vi.fn().mockResolvedValue({ data: { name: "main" } }),
          getContent: vi.fn().mockResolvedValue({ data: { type: "file" } }),
        },
      },
    };

    await expect(validateHexoRepository(octokit as any, { owner: "kebai", repo: "blog", branch: "main" })).resolves.toMatchObject({
      ok: true,
      defaultConfig: { owner: "kebai", repo: "blog", branch: "main" },
    });
  });
});
```

- [ ] **Step 2: Run Desktop test to verify failure**

Run:

```bash
pnpm --filter @hexo-cms/desktop exec vitest run src/main/onboarding.test.ts
```

Expected: FAIL because `onboarding.ts` does not exist.

- [ ] **Step 3: Implement Desktop onboarding helper**

Create `packages/desktop/src/main/onboarding.ts`:

```ts
import type { RepositoryOption, RepositorySelection, RepositoryValidation } from "@hexo-cms/ui";

type GitHubRepoPayload = {
  id: number | string;
  owner?: { login?: string };
  name?: string;
  full_name?: string;
  private?: boolean;
  default_branch?: string;
  pushed_at?: string | null;
  permissions?: { push?: boolean };
};

type OctokitLike = {
  request: (route: string, parameters?: Record<string, unknown>) => Promise<{ data: unknown }>;
  rest: {
    repos: {
      getBranch: (parameters: { owner: string; repo: string; branch: string }) => Promise<unknown>;
      getContent: (parameters: { owner: string; repo: string; path: string; ref?: string }) => Promise<unknown>;
    };
  };
};

function toRepositoryOption(repo: GitHubRepoPayload): RepositoryOption {
  const [fallbackOwner = "", fallbackName = ""] = (repo.full_name ?? "").split("/");
  const owner = repo.owner?.login ?? fallbackOwner;
  const name = repo.name ?? fallbackName;
  return {
    id: String(repo.id),
    owner,
    name,
    fullName: repo.full_name ?? `${owner}/${name}`,
    private: repo.private ?? false,
    defaultBranch: repo.default_branch ?? "main",
    pushedAt: repo.pushed_at ?? null,
    permissions: {
      push: repo.permissions?.push === true,
    },
  };
}

function successCheck(id: "access" | "permission" | "branch" | "hexo", message: string) {
  return { id, status: "success" as const, message };
}

function errorCheck(id: "access" | "permission" | "branch" | "hexo", message: string) {
  return { id, status: "error" as const, message };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: unknown }).status === 404;
}

async function hasPath(octokit: OctokitLike, selection: RepositorySelection, path: string): Promise<boolean> {
  try {
    await octokit.rest.repos.getContent({
      owner: selection.owner,
      repo: selection.repo,
      path,
      ref: selection.branch,
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function listWritableRepositories(
  octokit: OctokitLike,
  input: { query?: string },
): Promise<RepositoryOption[]> {
  const response = await octokit.request("GET /user/repos", {
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });
  const repos = Array.isArray(response.data) ? response.data as GitHubRepoPayload[] : [];
  const query = input.query?.trim().toLowerCase() ?? "";
  return repos
    .map(toRepositoryOption)
    .filter((repo) => repo.permissions.push)
    .filter((repo) => !query || repo.fullName.toLowerCase().includes(query));
}

export async function validateHexoRepository(
  octokit: OctokitLike,
  selection: RepositorySelection,
): Promise<RepositoryValidation> {
  const checks: RepositoryValidation["checks"] = [];

  try {
    const repoResponse = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: selection.owner,
      repo: selection.repo,
    });
    const repository = toRepositoryOption(repoResponse.data as GitHubRepoPayload);
    checks.push(successCheck("access", "仓库可访问"));

    if (!repository.permissions.push) {
      checks.push(errorCheck("permission", "当前授权缺少仓库读写权限"));
      return { ok: false, repository, checks, error: "PERMISSION_REQUIRED" };
    }
    checks.push(successCheck("permission", "具备写权限"));

    const branch = selection.branch || repository.defaultBranch;
    try {
      await octokit.rest.repos.getBranch({
        owner: selection.owner,
        repo: selection.repo,
        branch,
      });
      checks.push(successCheck("branch", "默认分支存在"));
    } catch (error) {
      if (isNotFound(error)) {
        checks.push(errorCheck("branch", "未找到目标分支"));
        return { ok: false, repository, checks, error: "BRANCH_NOT_FOUND" };
      }
      throw error;
    }

    const hasHexoConfig = await hasPath(octokit, { ...selection, branch }, "_config.yml");
    const hasPostsDir = hasHexoConfig ? true : await hasPath(octokit, { ...selection, branch }, "source/_posts");
    if (!hasHexoConfig && !hasPostsDir) {
      checks.push(errorCheck("hexo", "未检测到 Hexo 配置"));
      return { ok: false, repository, checks, error: "NOT_HEXO_REPO" };
    }

    checks.push(successCheck("hexo", "检测到 Hexo 结构"));
    return {
      ok: true,
      repository,
      checks,
      defaultConfig: {
        owner: selection.owner,
        repo: selection.repo,
        branch,
        postsDir: "source/_posts",
        mediaDir: "source/images",
        workflowFile: ".github/workflows/deploy.yml",
        autoDeploy: true,
        deployNotifications: true,
      },
    };
  } catch (error) {
    if (isNotFound(error)) {
      return {
        ok: false,
        checks: [errorCheck("access", "未找到这个仓库，请确认已授权访问")],
        error: "REPO_NOT_FOUND",
      };
    }
    return {
      ok: false,
      checks: [errorCheck("access", "验证失败，请重试")],
      error: "NETWORK_ERROR",
    };
  }
}
```

- [ ] **Step 4: Add Electron API types**

Modify `packages/ui/src/types/electron-api.ts`:

```ts
import type { AuthSession } from "./auth";
import type { RepositoryListInput, RepositoryOption, RepositorySelection, RepositoryValidation } from "./onboarding";

export interface ElectronAPI {
  getSession: () => Promise<AuthSession>;
  startDeviceFlow: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
  listOnboardingRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateOnboardingRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}
```

- [ ] **Step 5: Add preload methods and whitelist channels**

Modify `packages/desktop/src/preload/index.ts`:

1. Add to `ALLOWED_CHANNELS`:

```ts
"onboarding:listRepositories",
"onboarding:validateRepository",
```

2. Add to `electronAPI`:

```ts
listOnboardingRepositories: (input) => ipcRenderer.invoke("onboarding:listRepositories", input),
validateOnboardingRepository: (input) => ipcRenderer.invoke("onboarding:validateRepository", input),
```

- [ ] **Step 6: Add main-process IPC handlers**

Modify imports in `packages/desktop/src/main/index.ts`:

```ts
import { listWritableRepositories, validateHexoRepository } from "./onboarding";
```

Add handlers after config IPC handlers:

```ts
ipcMain.handle("onboarding:listRepositories", async (_event, input: { query?: string }) => {
  const token = await getGitHubAccessToken();
  if (!token) return [];
  const { Octokit } = await import("octokit");
  return listWritableRepositories(new Octokit({ auth: token }) as any, input ?? {});
});

ipcMain.handle("onboarding:validateRepository", async (_event, input: { owner: string; repo: string; branch?: string }) => {
  const token = await getGitHubAccessToken();
  if (!token) {
    return {
      ok: false,
      checks: [{ id: "access", status: "error", message: "当前授权缺少仓库读写权限" }],
      error: "REAUTH_REQUIRED",
    };
  }
  const { Octokit } = await import("octokit");
  return validateHexoRepository(new Octokit({ auth: token }) as any, input);
});
```

- [ ] **Step 7: Add shared Desktop data provider instance**

Create `packages/desktop/src/renderer/src/lib/desktop-data-provider-instance.ts`:

```ts
import { withCache } from "@hexo-cms/ui";
import { DesktopDataProvider } from "./desktop-data-provider";

export const desktopDataProvider = withCache(new DesktopDataProvider());
```

- [ ] **Step 8: Add Desktop onboarding client**

Create `packages/desktop/src/renderer/src/lib/desktop-onboarding-client.ts`:

```ts
import { requireElectronAPI, type OnboardingClient } from "@hexo-cms/ui";
import { desktopAuthClient } from "./desktop-auth-client";
import { desktopDataProvider } from "./desktop-data-provider-instance";

export const desktopOnboardingClient: OnboardingClient = {
  async getCurrentUser() {
    const session = await requireElectronAPI().getSession();
    return {
      login: session.user?.login ?? session.user?.email ?? "github",
      name: session.user?.name,
      avatarUrl: session.user?.avatarUrl,
    };
  },
  async reauthorize() {
    await desktopAuthClient.reauthorize();
  },
  listRepositories(input) {
    return requireElectronAPI().listOnboardingRepositories(input);
  },
  validateRepository(input) {
    return requireElectronAPI().validateOnboardingRepository(input);
  },
  async saveRepositoryConfig(input) {
    await desktopDataProvider.saveConfig({
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      postsDir: input.postsDir,
      mediaDir: input.mediaDir,
      workflowFile: input.workflowFile,
      autoDeploy: input.autoDeploy,
      deployNotifications: input.deployNotifications,
    });
  },
};
```

- [ ] **Step 9: Inject Desktop onboarding client into route**

Modify `packages/desktop/src/renderer/src/routes/onboarding.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@hexo-cms/ui";
import { desktopOnboardingClient } from "../lib/desktop-onboarding-client";

function DesktopOnboardingPage() {
  return <OnboardingPage onboardingClient={desktopOnboardingClient} />;
}

export const Route = createFileRoute("/onboarding")({ component: DesktopOnboardingPage });
```

- [ ] **Step 10: Run Desktop checks**

Run:

```bash
pnpm --filter @hexo-cms/desktop exec vitest run src/main/auth.test.ts src/main/onboarding.test.ts
pnpm -r exec tsc --noEmit --pretty false
pnpm --filter @hexo-cms/desktop exec electron-vite build
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add packages/desktop/src/main/onboarding.ts packages/desktop/src/main/onboarding.test.ts packages/desktop/src/renderer/src/lib/desktop-data-provider-instance.ts packages/desktop/src/renderer/src/lib/desktop-onboarding-client.ts packages/desktop/src/main/index.ts packages/desktop/src/preload/index.ts packages/ui/src/types/electron-api.ts packages/desktop/src/renderer/src/routes/onboarding.tsx
git commit -m "feat(desktop): add onboarding repository import IPC"
```

---

## Task 6: Desktop Config-Aware Root Guard

**Files:**
- Modify: `packages/desktop/src/renderer/src/routes/__root.tsx`

- [ ] **Step 1: Update Desktop root guard implementation**

Replace `packages/desktop/src/renderer/src/routes/__root.tsx` with:

```tsx
import { createRootRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CMSLayout,
  DataProviderProvider,
  ErrorBoundary,
  PluginProvider,
  getAuthRedirect,
  isOnboardingRoute,
  isPublicAuthRoute,
  type AuthSession,
} from "@hexo-cms/ui";
import { desktopAuthClient, subscribeToDesktopAuthChanges } from "../lib/desktop-auth-client";
import { desktopDataProvider } from "../lib/desktop-data-provider-instance";

function RootComponent() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = isOnboardingRoute(pathname);
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let active = true;

    const refreshSession = () => {
      setIsPending(true);
      setHasConfig(null);
      desktopAuthClient
        .getSession()
        .then(async (nextSession) => {
          if (!active) return;
          setSession(nextSession);
          if (nextSession.state === "authenticated") {
            const config = await desktopDataProvider.getConfig();
            if (active) setHasConfig(Boolean(config));
          } else if (active) {
            setHasConfig(null);
          }
        })
        .catch(() => {
          if (active) {
            setSession({ state: "anonymous" });
            setHasConfig(null);
          }
        })
        .finally(() => {
          if (active) setIsPending(false);
        });
    };

    refreshSession();
    const unsubscribe = subscribeToDesktopAuthChanges(refreshSession);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname]);

  const guardPending = isPending || (session?.state === "authenticated" && hasConfig === null && !isSetupRoute);

  useEffect(() => {
    const redirect = getAuthRedirect({ pathname, session, hasConfig, isPending: guardPending });
    if (redirect) navigate({ to: redirect, replace: true });
  }, [session, hasConfig, guardPending, pathname, navigate]);

  if (guardPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  if (session?.state !== "authenticated" && !isPublicRoute) return null;

  if (isPublicRoute || isSetupRoute) {
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  }

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          <CMSLayout isElectron>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </CMSLayout>
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
```

- [ ] **Step 2: Run Desktop build and typecheck**

Run:

```bash
pnpm -r exec tsc --noEmit --pretty false
pnpm --filter @hexo-cms/desktop exec electron-vite build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat(desktop): route missing config to onboarding"
```

---

## Task 7: Documentation Sync

**Files:**
- Modify: `docs/auth/PRD_GITHUB_OAUTH.md`
- Modify: `docs/auth/TECHNICAL_DESIGN_GITHUB_OAUTH.md`

- [ ] **Step 1: Update PRD onboarding sections**

Modify `docs/auth/PRD_GITHUB_OAUTH.md`:

1. In Web first login flow, replace the current repository configuration wording with:

```md
5. 若无仓库配置，进入 Project Import Onboarding。
6. Onboarding 默认列出当前 GitHub OAuth 用户可写仓库。
7. 用户选择仓库后，系统验证仓库访问、写权限、默认分支与 Hexo 结构。
8. 验证通过后保存配置并进入仪表板。
```

2. In Desktop first login flow, replace the config step with:

```md
6. 若无仓库配置，进入与 Web 一致的 Project Import Onboarding。
7. 用户选择可写 GitHub 仓库，系统验证 Hexo 结构后保存配置。
8. 完成后进入仪表板。
```

3. In `### 9.3 Onboarding`, replace the section with:

```md
1. Onboarding 聚焦 GitHub Hexo 仓库导入，不要求用户手动粘贴 token。
2. 若未登录，进入 Onboarding 前应先完成 OAuth。
3. 默认展示当前授权可写仓库，手动输入仅作为高级备用入口。
4. 保存配置前必须验证仓库访问、写权限、分支存在和 Hexo 结构。
```

- [ ] **Step 2: Update technical design onboarding sections**

Modify `docs/auth/TECHNICAL_DESIGN_GITHUB_OAUTH.md`:

1. Under `### 7.2 Onboarding/Settings`, replace onboarding bullets with:

```md
1. 删除 PAT 输入、保存、删除相关主交互。
2. Onboarding 采用 Project Import 模式，主路径为列出并选择当前 OAuth 用户可写仓库。
3. Onboarding 使用共享 `OnboardingClient` 接口，Web/desktop 分别提供 adapter。
4. 保存配置前必须执行严格验证: 仓库可访问、具备写权限、分支存在、检测到 `_config.yml` 或 `source/_posts`。
5. Settings 展示:
```

2. Under `### 7.3 Root Route 认证守卫`, replace bullets with:

```md
1. 现有“是否有 token”判断改为“AuthSession.state 是否 authenticated”。
2. Root guard 同时检查仓库配置，已认证但无配置时进入 `/onboarding`。
3. `reauthorization_required` 应跳转登录并展示原因。
```

3. Add a new subsection after `### 7.3`:

```md
### 7.4 Onboarding Adapter

共享 UI 依赖 `OnboardingClient`:

1. `getCurrentUser()`
2. `reauthorize()`
3. `listRepositories({ query })`
4. `validateRepository({ owner, repo, branch })`
5. `saveRepositoryConfig(config)`

Web adapter 通过服务端 API 调 GitHub；Desktop adapter 通过 Electron IPC 调主进程。Renderer 不接触 access token。
```

- [ ] **Step 3: Run doc sanity check**

Run:

```bash
rg -n "Onboarding|Project Import|OnboardingClient|/onboarding" docs/auth docs/superpowers/specs/2026-05-11-onboarding-project-import-design.md
```

Expected: Output shows the updated onboarding language in PRD, technical design, and spec.

- [ ] **Step 4: Commit**

```bash
git add docs/auth/PRD_GITHUB_OAUTH.md docs/auth/TECHNICAL_DESIGN_GITHUB_OAUTH.md
git commit -m "docs(auth): sync project import onboarding design"
```

---

## Task 8: Final Verification

**Files:**
- No code files should be modified in this task unless verification reveals a failure.

- [ ] **Step 1: Run full typecheck**

Run:

```bash
pnpm -r exec tsc --noEmit --pretty false
```

Expected: exit code 0 and no TypeScript errors.

- [ ] **Step 2: Run full tests**

Run:

```bash
pnpm -r test
```

Expected: all workspace tests pass.

- [ ] **Step 3: Build Web**

Run:

```bash
pnpm --filter @hexo-cms/web build
```

Expected: build exits 0. Existing chunk size warnings are acceptable.

- [ ] **Step 4: Build Desktop renderer/main/preload**

Run:

```bash
pnpm --filter @hexo-cms/desktop exec electron-vite build
```

Expected: build exits 0.

- [ ] **Step 5: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Commit any verification fixes**

If verification required code fixes in the onboarding implementation, commit the concrete files that changed. For example, if TypeScript reports a wrong import in the Web onboarding adapter, stage that file and commit it:

```bash
git add packages/web/src/lib/onboarding-client.ts
git commit -m "fix(onboarding): address verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: Tasks cover repository-first onboarding, writable repo filtering, strict validation, manual fallback, Web/Desktop adapters, token isolation, config-aware route guard, and PRD/technical design sync.
- Placeholder scan: No `TBD`, `TODO`, incomplete copy steps, missing implementation references, or non-existent `Badge` variants remain.
- Type consistency: `OnboardingClient`, `RepositoryConfigInput`, IPC methods, Web/Desktop adapters, and route guard `hasConfig` signatures use the same names across tasks.
