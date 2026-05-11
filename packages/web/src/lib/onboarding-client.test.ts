import { afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    getSession: authMocks.getSession,
    signIn: { social: authMocks.signInSocial },
    signOut: authMocks.signOut,
  }),
}));

import { webOnboardingClient } from "./onboarding-client";

describe("webOnboardingClient", () => {
  afterEach(() => {
    vi.resetAllMocks();
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

    await expect(webOnboardingClient.listRepositories({ query: "kebai/blog" })).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/repositories?q=kebai%2Fblog");
  });

  it("returns validation payloads from failed repository validation responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        error: "NOT_HEXO_REPO",
        validation: {
          ok: false,
          checks: [{ id: "hexo", status: "error", message: "未检测到 Hexo 配置" }],
          error: "NOT_HEXO_REPO",
        },
      }), { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(webOnboardingClient.validateRepository({
      owner: "kebai",
      repo: "blog",
      branch: "main",
    })).resolves.toMatchObject({
      ok: false,
      error: "NOT_HEXO_REPO",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/validate", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: "kebai", repo: "blog", branch: "main" }),
    }));
  });

  it("maps validation error responses without validation payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "REAUTH_REQUIRED" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(webOnboardingClient.validateRepository({
      owner: "kebai",
      repo: "blog",
    })).resolves.toEqual({
      ok: false,
      checks: [],
      error: "REAUTH_REQUIRED",
    });
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
      body: JSON.stringify({
        owner: "kebai",
        repo: "blog",
        branch: "main",
        postsDir: "source/_posts",
        mediaDir: "source/images",
        workflowFile: ".github/workflows/deploy.yml",
        autoDeploy: true,
        deployNotifications: true,
      }),
    }));
  });
});
