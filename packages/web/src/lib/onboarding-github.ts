import type {
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
} from "@hexo-cms/ui";

type GitHubRepo = {
  id: string | number;
  owner?: { login?: string | null } | null;
  name?: string | null;
  full_name?: string | null;
  private?: boolean | null;
  default_branch?: string | null;
  pushed_at?: string | null;
  permissions?: { push?: boolean | null } | null;
};

type OctokitLike = {
  request: (route: string, options: Record<string, unknown>) => Promise<{ data: unknown }>;
  rest: {
    repos: {
      getBranch: (options: Record<string, unknown>) => Promise<unknown>;
      getContent: (options: Record<string, unknown>) => Promise<unknown>;
    };
  };
};

const CHECK_MESSAGES = {
  accessSuccess: "仓库访问正常",
  accessError: "未找到这个仓库，请确认已授权访问",
  permissionSuccess: "仓库读写权限正常",
  permissionError: "当前授权缺少仓库读写权限，请重新授权",
  branchSuccess: "目标分支存在",
  branchError: "未找到目标分支",
  hexoSuccess: "已检测到 Hexo 博客结构",
  hexoError: "未检测到 Hexo 配置，请选择已有 Hexo 博客仓库",
  networkError: "验证失败，请重试",
};

function isGitHubNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    && Number((error as { status?: unknown }).status) === 404;
}

function mapRepository(repo: GitHubRepo): RepositoryOption {
  const owner = repo.owner?.login ?? "";
  const name = repo.name ?? "";
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

export async function listWritableRepositories(
  octokit: OctokitLike,
  input: { query?: string } = {},
): Promise<RepositoryOption[]> {
  const { data } = await octokit.request("GET /user/repos", {
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  });

  const query = input.query?.trim().toLowerCase() ?? "";
  return (Array.isArray(data) ? data : [])
    .map((repo) => mapRepository(repo as GitHubRepo))
    .filter((repo) => repo.permissions.push)
    .filter((repo) => !query || repo.fullName.toLowerCase().includes(query));
}

async function hasHexoStructure(octokit: OctokitLike, selection: Required<RepositorySelection>) {
  const targets = ["_config.yml", "source/_posts"];

  for (const path of targets) {
    try {
      await octokit.rest.repos.getContent({
        owner: selection.owner,
        repo: selection.repo,
        path,
        ref: selection.branch,
      });
      return true;
    } catch (error) {
      if (!isGitHubNotFound(error)) throw error;
    }
  }

  return false;
}

export async function validateHexoRepository(
  octokit: OctokitLike,
  selection: RepositorySelection,
): Promise<RepositoryValidation> {
  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: selection.owner,
      repo: selection.repo,
    });
    const repository = mapRepository(data as GitHubRepo);
    const branch = selection.branch || repository.defaultBranch;
    const normalizedSelection = { ...selection, branch };
    const checks: RepositoryValidation["checks"] = [
      { id: "access", status: "success", message: CHECK_MESSAGES.accessSuccess },
    ];

    if (!repository.permissions.push) {
      return {
        ok: false,
        repository,
        checks: [
          ...checks,
          { id: "permission", status: "error", message: CHECK_MESSAGES.permissionError },
        ],
        error: "PERMISSION_REQUIRED",
      };
    }

    checks.push({ id: "permission", status: "success", message: CHECK_MESSAGES.permissionSuccess });

    try {
      await octokit.rest.repos.getBranch({
        owner: selection.owner,
        repo: selection.repo,
        branch,
      });
    } catch (error) {
      if (!isGitHubNotFound(error)) throw error;
      return {
        ok: false,
        repository,
        checks: [
          ...checks,
          { id: "branch", status: "error", message: CHECK_MESSAGES.branchError },
        ],
        error: "BRANCH_NOT_FOUND",
      };
    }

    checks.push({ id: "branch", status: "success", message: CHECK_MESSAGES.branchSuccess });

    if (!await hasHexoStructure(octokit, normalizedSelection)) {
      return {
        ok: false,
        repository,
        checks: [
          ...checks,
          { id: "hexo", status: "error", message: CHECK_MESSAGES.hexoError },
        ],
        error: "NOT_HEXO_REPO",
      };
    }

    checks.push({ id: "hexo", status: "success", message: CHECK_MESSAGES.hexoSuccess });

    return {
      ok: true,
      repository,
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
      checks,
    };
  } catch (error) {
    if (isGitHubNotFound(error)) {
      return {
        ok: false,
        checks: [
          { id: "access", status: "error", message: CHECK_MESSAGES.accessError },
        ],
        error: "REPO_NOT_FOUND",
      };
    }

    return {
      ok: false,
      checks: [
        { id: "access", status: "error", message: CHECK_MESSAGES.networkError },
      ],
      error: "NETWORK_ERROR",
    };
  }
}
