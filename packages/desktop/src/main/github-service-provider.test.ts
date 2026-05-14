import { describe, expect, it, vi } from "vitest";
import type { GitHubConfig } from "@hexo-cms/core";
import { createGitHubServiceProvider } from "./github-service-provider";

interface FakeGitHubService {
  token: string;
  config: GitHubConfig;
}

function createProvider(initialConfig: GitHubConfig | null, initialToken: string | null) {
  let config = initialConfig;
  let token = initialToken;
  const createService = vi.fn((serviceToken: string, serviceConfig: GitHubConfig): FakeGitHubService => ({
    token: serviceToken,
    config: serviceConfig,
  }));
  const provider = createGitHubServiceProvider<FakeGitHubService>({
    loadConfig: () => config,
    getAccessToken: async () => token,
    createService,
  });

  return {
    provider,
    createService,
    setConfig: (nextConfig: GitHubConfig | null) => {
      config = nextConfig;
    },
    setToken: (nextToken: string | null) => {
      token = nextToken;
    },
  };
}

describe("desktop GitHub service provider", () => {
  it("returns null without config or token", async () => {
    const { provider, createService, setConfig } = createProvider(null, "token-1");

    await expect(provider.getGitHubService()).resolves.toBeNull();

    setConfig({ owner: "hexo", repo: "blog" });
    const providerWithoutToken = createProvider({ owner: "hexo", repo: "blog" }, null);
    await expect(providerWithoutToken.provider.getGitHubService()).resolves.toBeNull();
    expect(createService).not.toHaveBeenCalled();
    expect(providerWithoutToken.createService).not.toHaveBeenCalled();
  });

  it("reuses the cached service while token and service config stay the same", async () => {
    const { provider, createService } = createProvider(
      { owner: "hexo", repo: "blog", branch: "main", postsDir: "source/_posts", mediaDir: "source/images" },
      "token-1",
    );

    const first = await provider.getGitHubService();
    const second = await provider.getGitHubService();

    expect(second).toBe(first);
    expect(createService).toHaveBeenCalledTimes(1);
  });

  it("creates a new service when token or service config changes", async () => {
    const { provider, createService, setConfig, setToken } = createProvider(
      { owner: "hexo", repo: "blog", branch: "main" },
      "token-1",
    );

    const first = await provider.getGitHubService();
    setToken("token-2");
    const second = await provider.getGitHubService();
    setConfig({ owner: "hexo", repo: "blog", branch: "next" });
    const third = await provider.getGitHubService();

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(createService).toHaveBeenCalledTimes(3);
  });

  it("clears the cached service when invalidated", async () => {
    const { provider, createService } = createProvider({ owner: "hexo", repo: "blog" }, "token-1");

    const first = await provider.getGitHubService();
    provider.invalidate();
    const second = await provider.getGitHubService();

    expect(second).not.toBe(first);
    expect(createService).toHaveBeenCalledTimes(2);
  });
});
