import { describe, expect, it, vi } from "vitest";
import { listWritableRepositories, validateHexoRepository } from "./onboarding-github";

type MockOctokit = Parameters<typeof listWritableRepositories>[0];

function createOctokit(overrides: Partial<{
  request: ReturnType<typeof vi.fn>;
  getBranch: ReturnType<typeof vi.fn>;
  getContent: ReturnType<typeof vi.fn>;
}> = {}): MockOctokit {
  return {
    request: overrides.request ?? vi.fn(),
    rest: {
      repos: {
        getBranch: overrides.getBranch ?? vi.fn(),
        getContent: overrides.getContent ?? vi.fn(),
      },
    },
  } as MockOctokit;
}

function githubError(status: number) {
  return Object.assign(new Error(`GitHub ${status}`), { status });
}

describe("listWritableRepositories", () => {
  it("maps writable GitHub repositories and filters by case-insensitive query", async () => {
    const request = vi.fn().mockResolvedValue({
      data: [
        {
          id: 101,
          owner: { login: "octo" },
          name: "Blog",
          full_name: "octo/Blog",
          private: false,
          default_branch: "main",
          pushed_at: "2026-05-01T12:00:00Z",
          permissions: { push: true },
        },
        {
          id: 102,
          owner: { login: "octo" },
          name: "docs",
          full_name: "octo/docs",
          private: true,
          default_branch: "main",
          pushed_at: null,
          permissions: { push: false },
        },
        {
          id: 103,
          owner: { login: "team" },
          name: "Hexo-Site",
          full_name: "team/Hexo-Site",
          private: true,
          default_branch: "source",
          pushed_at: "2026-05-02T12:00:00Z",
          permissions: { push: true },
        },
      ],
    });

    const repositories = await listWritableRepositories(createOctokit({ request }), {
      query: "hexo",
    });

    expect(request).toHaveBeenCalledWith("GET /user/repos", {
      affiliation: "owner,collaborator,organization_member",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });
    expect(repositories).toEqual([
      {
        id: "103",
        owner: "team",
        name: "Hexo-Site",
        fullName: "team/Hexo-Site",
        private: true,
        defaultBranch: "source",
        pushedAt: "2026-05-02T12:00:00Z",
        permissions: { push: true },
      },
    ]);
  });
});

describe("validateHexoRepository", () => {
  it("succeeds for writable repository with branch and Hexo structure", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 101,
        owner: { login: "octo" },
        name: "blog",
        full_name: "octo/blog",
        private: false,
        default_branch: "main",
        pushed_at: "2026-05-01T12:00:00Z",
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockResolvedValue({ data: { name: "main" } });
    const getContent = vi.fn().mockImplementation((_input) => {
      if (_input.path === "_config.yml") return Promise.resolve({ data: { type: "file" } });
      return Promise.reject(githubError(404));
    });

    const validation = await validateHexoRepository(createOctokit({ request, getBranch, getContent }), {
      owner: "octo",
      repo: "blog",
      branch: "main",
    });

    expect(validation).toEqual({
      ok: true,
      repository: {
        id: "101",
        owner: "octo",
        name: "blog",
        fullName: "octo/blog",
        private: false,
        defaultBranch: "main",
        pushedAt: "2026-05-01T12:00:00Z",
        permissions: { push: true },
      },
      defaultConfig: {
        owner: "octo",
        repo: "blog",
        branch: "main",
        postsDir: "source/_posts",
        mediaDir: "source/images",
        workflowFile: ".github/workflows/deploy.yml",
        autoDeploy: true,
        deployNotifications: true,
      },
      checks: [
        { id: "access", status: "success", message: "仓库访问正常" },
        { id: "permission", status: "success", message: "仓库读写权限正常" },
        { id: "branch", status: "success", message: "目标分支存在" },
        { id: "hexo", status: "success", message: "已检测到 Hexo 博客结构" },
      ],
    });
  });

  it("uses the repository default branch when selection omits branch", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 101,
        owner: { login: "octo" },
        name: "blog",
        full_name: "octo/blog",
        private: false,
        default_branch: "source",
        pushed_at: "2026-05-01T12:00:00Z",
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockResolvedValue({ data: { name: "source" } });
    const getContent = vi.fn().mockResolvedValue({ data: { type: "dir" } });

    const validation = await validateHexoRepository(createOctokit({ request, getBranch, getContent }), {
      owner: "octo",
      repo: "blog",
    });

    expect(getBranch).toHaveBeenCalledWith({
      owner: "octo",
      repo: "blog",
      branch: "source",
    });
    expect(getContent).toHaveBeenCalledWith({
      owner: "octo",
      repo: "blog",
      path: "_config.yml",
      ref: "source",
    });
    expect(validation).toMatchObject({
      ok: true,
      defaultConfig: {
        branch: "source",
      },
    });
  });

  it("rejects repositories without Hexo config or posts directory", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 101,
        owner: { login: "octo" },
        name: "blog",
        full_name: "octo/blog",
        private: false,
        default_branch: "main",
        pushed_at: null,
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockResolvedValue({ data: { name: "main" } });
    const getContent = vi.fn().mockRejectedValue(githubError(404));

    await expect(validateHexoRepository(createOctokit({ request, getBranch, getContent }), {
      owner: "octo",
      repo: "blog",
    })).resolves.toMatchObject({
      ok: false,
      error: "NOT_HEXO_REPO",
    });
  });

  it("rejects missing branches", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 101,
        owner: { login: "octo" },
        name: "blog",
        full_name: "octo/blog",
        private: false,
        default_branch: "main",
        pushed_at: null,
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockRejectedValue(githubError(404));

    await expect(validateHexoRepository(createOctokit({ request, getBranch }), {
      owner: "octo",
      repo: "blog",
      branch: "drafts",
    })).resolves.toMatchObject({
      ok: false,
      error: "BRANCH_NOT_FOUND",
    });
  });

  it("rejects repositories without push permission", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 101,
        owner: { login: "octo" },
        name: "blog",
        full_name: "octo/blog",
        private: false,
        default_branch: "main",
        pushed_at: null,
        permissions: { push: false },
      },
    });

    await expect(validateHexoRepository(createOctokit({ request }), {
      owner: "octo",
      repo: "blog",
    })).resolves.toMatchObject({
      ok: false,
      error: "PERMISSION_REQUIRED",
    });
  });
});
