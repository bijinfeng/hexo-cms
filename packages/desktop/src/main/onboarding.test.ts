import { describe, expect, it, vi } from "vitest";
import { listWritableRepositories, validateHexoRepository } from "./onboarding";

type MockOctokit = Parameters<typeof listWritableRepositories>[0];

function githubError(status: number) {
  return Object.assign(new Error(`GitHub ${status}`), { status });
}

function createOctokit(overrides: Partial<{
  request: ReturnType<typeof vi.fn>;
  paginate: ReturnType<typeof vi.fn>;
  getBranch: ReturnType<typeof vi.fn>;
  getContent: ReturnType<typeof vi.fn>;
}> = {}): MockOctokit {
  return {
    request: overrides.request ?? vi.fn(),
    paginate: overrides.paginate,
    rest: {
      repos: {
        getBranch: overrides.getBranch ?? vi.fn(),
        getContent: overrides.getContent ?? vi.fn(),
      },
    },
  } as MockOctokit;
}

describe("desktop onboarding", () => {
  it("filters repositories to writable options", async () => {
    const request = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          owner: { login: "kebai" },
          name: "blog",
          full_name: "kebai/blog",
          default_branch: "main",
          permissions: { push: true },
        },
        {
          id: 2,
          owner: { login: "kebai" },
          name: "read",
          full_name: "kebai/read",
          default_branch: "main",
          permissions: { push: false },
        },
      ],
    });

    await expect(listWritableRepositories(createOctokit({ request }), { query: "" })).resolves.toEqual([
      expect.objectContaining({ fullName: "kebai/blog", permissions: { push: true } }),
    ]);
  });

  it("uses Octokit pagination when available", async () => {
    const request = vi.fn();
    const paginate = vi.fn().mockResolvedValue([
      {
        id: 1,
        owner: { login: "kebai" },
        name: "blog",
        full_name: "kebai/blog",
        default_branch: "main",
        permissions: { push: true },
      },
    ]);

    await expect(listWritableRepositories(createOctokit({ request, paginate }), { query: "blog" })).resolves.toHaveLength(1);
    expect(paginate).toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("validates Hexo structure before returning default config", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        owner: { login: "kebai" },
        name: "blog",
        full_name: "kebai/blog",
        default_branch: "main",
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockResolvedValue({ data: { name: "main" } });
    const getContent = vi.fn().mockResolvedValue({ data: { type: "file" } });

    await expect(validateHexoRepository(createOctokit({ request, getBranch, getContent }), {
      owner: "kebai",
      repo: "blog",
      branch: "main",
    })).resolves.toMatchObject({
      ok: true,
      defaultConfig: { owner: "kebai", repo: "blog", branch: "main" },
    });
  });

  it("accepts source posts directory when root config is missing", async () => {
    const request = vi.fn().mockResolvedValue({
      data: {
        id: 1,
        owner: { login: "kebai" },
        name: "blog",
        full_name: "kebai/blog",
        default_branch: "main",
        permissions: { push: true },
      },
    });
    const getBranch = vi.fn().mockResolvedValue({ data: { name: "main" } });
    const getContent = vi.fn().mockImplementation((input) => {
      if (input.path === "_config.yml") return Promise.reject(githubError(404));
      return Promise.resolve({ data: { type: "dir" } });
    });

    await expect(validateHexoRepository(createOctokit({ request, getBranch, getContent }), {
      owner: "kebai",
      repo: "blog",
    })).resolves.toMatchObject({
      ok: true,
      defaultConfig: { branch: "main" },
    });
  });

  it("maps GitHub authorization failures to reauthorization validation errors", async () => {
    const request = vi.fn().mockRejectedValue(githubError(401));

    await expect(validateHexoRepository(createOctokit({ request }), {
      owner: "kebai",
      repo: "blog",
    })).resolves.toMatchObject({
      ok: false,
      error: "REAUTH_REQUIRED",
    });
  });
});
