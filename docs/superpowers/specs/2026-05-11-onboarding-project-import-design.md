# Onboarding Project Import Design

> Date: 2026-05-11  
> Status: Draft for review  
> Scope: Web + Desktop onboarding after GitHub OAuth

## Background

The OAuth PRD defines the first-use path as:

1. Complete GitHub OAuth.
2. If no repository configuration exists, enter onboarding.
3. Configure the repository.
4. Enter the dashboard.

The current onboarding page already removed PAT entry and only saves repository fields, but it still behaves like a manual form. It does not automatically guide users from OAuth success to repository setup, does not list authorized repositories, and marks configuration as successful before verifying that the selected repository is a valid Hexo blog.

The new design turns onboarding into a Vercel/Netlify-style project import flow.

## Goals

1. Make the primary path repository selection, not manual owner/repo input.
2. Keep Web and Desktop behavior consistent.
3. Verify the repository before saving configuration.
4. Keep tokens out of renderer and shared UI.
5. Preserve a recoverable path for missing permissions, missing repositories, and network failures.

## Non-Goals

1. Do not initialize a new Hexo repository in this phase.
2. Do not add multi-account switching.
3. Do not support non-GitHub providers.
4. Do not expose PAT input as a product or development path.

## Product Flow

1. User completes GitHub OAuth.
2. Root guard checks auth state and repository config.
3. If authenticated but no config exists, route to `/onboarding`.
4. Onboarding loads writable repositories available to the current GitHub OAuth identity.
5. User searches and selects a repository.
6. App validates the selected repository.
7. If validation passes, user confirms default configuration.
8. App saves config and routes to `/`.

If the user returns later with config already present, `/onboarding` remains accessible but is not forced.

## Page Structure

### Header

The page title is `导入 Hexo 仓库`.

The supporting copy explains that HexoCMS will validate the selected GitHub repository before enabling content management.

The current GitHub account is shown as a compact identity surface with avatar, login/name, and a `重新授权` action.

### Repository Picker

The repository picker is the default focus of the page.

It includes:

1. Search input for repository name and owner.
2. Repository list containing writable repositories only.
3. Each row shows:
   - `owner/repo`
   - public/private visibility
   - default branch
   - last updated time
   - write access indicator
4. Empty state for no writable repositories.
5. Retry action for load failures.

Read-only repositories are not shown in the primary list. A later enhancement can add a secondary toggle such as `显示不可写仓库`, but it is out of scope for the first implementation.

### Validation Panel

Selecting a repository opens a validation panel. Validation runs automatically and shows a checklist:

1. Repository is accessible.
2. Current token has push permission.
3. Default branch exists.
4. Hexo structure is detected.

Hexo detection passes when either `_config.yml` exists at the repository root or `source/_posts` exists.

### Configuration Confirmation

After validation passes, the page shows a small confirmation form:

1. Branch defaults to the repository default branch.
2. Posts directory defaults to `source/_posts`.
3. Media directory defaults to `source/images`.
4. Workflow file defaults to `.github/workflows/deploy.yml` and lives in an advanced section.

The primary action is `开始管理`.

On success, save config and navigate to `/`.

### Advanced Manual Entry

Manual owner/repo input is a fallback, not the default flow.

It is available behind an advanced affordance such as `找不到仓库？手动输入`.

Manual input still runs the same strict validation before saving.

## Validation Rules

Validation is strict.

The selected repository must satisfy all of the following:

1. The repository can be fetched by the current OAuth credential.
2. The current OAuth credential has push permission.
3. The selected/default branch exists.
4. Hexo structure is detected via `_config.yml` or `source/_posts`.

Validation failure does not save config.

## Error Model

User-facing errors should be actionable and hide internal API details.

| Case | User Message | Recovery |
| --- | --- | --- |
| Repository not found | `未找到这个仓库，请确认已授权访问` | Search again or reauthorize |
| No writable repositories | `未找到可写仓库，请检查 GitHub 授权权限` | Reauthorize |
| Missing push permission | `当前授权缺少仓库读写权限，请重新授权` | Reauthorize |
| Branch missing | `未找到目标分支` | Choose another branch |
| Not a Hexo repo | `未检测到 Hexo 配置，请选择已有 Hexo 博客仓库` | Choose another repository |
| Network failure | `验证失败，请重试` | Retry validation |

## Architecture

### Shared UI

`OnboardingPage` becomes a shared Project Import UI.

It should receive an explicit onboarding client instead of using content-oriented `DataProvider` directly.

```ts
interface OnboardingClient {
  getCurrentUser(): Promise<OnboardingUser>;
  listRepositories(input: RepositoryListInput): Promise<RepositoryOption[]>;
  validateRepository(input: RepositorySelection): Promise<RepositoryValidation>;
  saveRepositoryConfig(input: RepositoryConfigInput): Promise<void>;
}
```

The shared UI does not know whether it is running on Web or Desktop and never handles access tokens.

### Web Adapter

Web provides `webOnboardingClient`.

Server endpoints:

1. `GET /api/onboarding/repositories?q=`
2. `POST /api/onboarding/validate`
3. `POST /api/github/config` for final config save

The server uses Better Auth session plus the linked GitHub OAuth access token. If no GitHub access token is available, return `REAUTH_REQUIRED`.

### Desktop Adapter

Desktop provides `desktopOnboardingClient`.

IPC channels:

1. `onboarding:listRepositories`
2. `onboarding:validateRepository`
3. Existing `config:save` for final config save

The main process uses the local OAuth session in keytar and never returns token material to the renderer.

## Data Contracts

```ts
interface OnboardingUser {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
}

interface RepositoryListInput {
  query?: string;
}

interface RepositoryOption {
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

interface RepositorySelection {
  owner: string;
  repo: string;
  branch?: string;
}

interface RepositoryValidation {
  ok: boolean;
  repository?: RepositoryOption;
  defaultConfig?: RepositoryConfigInput;
  checks: Array<{
    id: "access" | "permission" | "branch" | "hexo";
    status: "success" | "error";
    message: string;
  }>;
  error?: "REPO_NOT_FOUND" | "PERMISSION_REQUIRED" | "BRANCH_NOT_FOUND" | "NOT_HEXO_REPO" | "NETWORK_ERROR";
}

interface RepositoryConfigInput {
  owner: string;
  repo: string;
  branch: string;
  postsDir: string;
  mediaDir: string;
  workflowFile: string;
  autoDeploy: boolean;
  deployNotifications: boolean;
}
```

## Route Guard Rules

Root guard should evaluate both auth and repository config.

1. Anonymous user on protected route -> `/login`.
2. Authenticated user with no config on protected route -> `/onboarding`.
3. Authenticated user with config on `/login` -> `/`.
4. Authenticated user without config on `/login` -> `/onboarding`.
5. Authenticated user on `/onboarding` -> stay.
6. Anonymous user on `/onboarding` -> `/login`.

Web and Desktop should share the route decision helper. They may fetch session and config through platform-specific clients.

## Testing Plan

### Shared UI Tests

1. Shows repository search as the primary onboarding path.
2. Does not render PAT/token inputs.
3. Lists writable repositories.
4. Selecting a repository starts validation.
5. Validation success reveals config confirmation and `开始管理`.
6. Validation failure shows actionable copy and does not save.
7. Manual entry is hidden behind advanced fallback and still validates before save.

### Route Guard Tests

1. Authenticated user without config is routed to `/onboarding`.
2. Authenticated user with config can enter dashboard.
3. Anonymous user cannot enter `/onboarding`.
4. Authenticated user without config leaving `/login` goes to `/onboarding`.

### Web Tests

1. Repository list endpoint uses GitHub OAuth token and returns only writable repositories.
2. Missing GitHub token returns `REAUTH_REQUIRED`.
3. Validation fails for missing branch.
4. Validation fails for non-Hexo repository.
5. Config save accepts camelCase and snake_case inputs.

### Desktop Tests

1. IPC repository list uses stored OAuth access token.
2. IPC validation does not expose token data.
3. Config save remains compatible with `GitHubConfig`.

## Documentation Updates

After implementation, update:

1. `docs/auth/PRD_GITHUB_OAUTH.md` to describe Project Import onboarding.
2. `docs/auth/TECHNICAL_DESIGN_GITHUB_OAUTH.md` to add onboarding adapter and route guard config checks.

## Confirmed Decisions

All product decisions required for first implementation are closed:

1. Primary flow is repository selection.
2. Only writable repositories are shown by default.
3. Strict Hexo validation is required before config save.
4. Manual entry is fallback only.
