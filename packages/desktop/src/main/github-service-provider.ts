import { GitHubService } from "@hexo-cms/core";
import type { GitHubConfig } from "@hexo-cms/core";

export interface GitHubServiceProvider<TService = GitHubService> {
  getGitHubService(): Promise<TService | null>;
  invalidate(): void;
}

export interface GitHubServiceProviderOptions<TService = GitHubService> {
  loadConfig(): GitHubConfig | null;
  getAccessToken(): Promise<string | null>;
  createService?: (token: string, config: GitHubConfig) => TService;
}

export function createGitHubServiceProvider<TService = GitHubService>({
  loadConfig,
  getAccessToken,
  createService = ((token, config) => new GitHubService(token, config) as TService),
}: GitHubServiceProviderOptions<TService>): GitHubServiceProvider<TService> {
  let cachedService: TService | null = null;
  let cachedToken: string | null = null;
  let cachedConfig: GitHubConfig | null = null;

  return {
    async getGitHubService(): Promise<TService | null> {
      const config = loadConfig();
      if (!config) {
        cachedService = null;
        return null;
      }

      const token = await getAccessToken();
      if (!token) {
        cachedService = null;
        return null;
      }

      if (cachedService && cachedToken === token && isSameServiceConfig(cachedConfig, config)) {
        return cachedService;
      }

      cachedToken = token;
      cachedConfig = config;
      cachedService = createService(token, config);
      return cachedService;
    },
    invalidate(): void {
      cachedService = null;
      cachedToken = null;
      cachedConfig = null;
    },
  };
}

function isSameServiceConfig(left: GitHubConfig | null, right: GitHubConfig): boolean {
  return (
    left?.owner === right.owner &&
    left?.repo === right.repo &&
    left?.branch === right.branch &&
    left?.postsDir === right.postsDir &&
    left?.mediaDir === right.mediaDir
  );
}
