import type { DataProvider, HexoPost, GitHubConfig } from "@hexo-cms/core";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 60_000;

type CacheKey = string;

export function withCache(provider: DataProvider, ttl: number = CACHE_TTL): DataProvider {
  const cache = new Map<CacheKey, CacheEntry<unknown>>();

  function getCached<T>(key: CacheKey, fetcher: () => Promise<T>): Promise<T> {
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
      return Promise.resolve(cached.data);
    }
    return fetcher().then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    });
  }

  function invalidate(...keys: CacheKey[]): void {
    if (keys.length === 0) {
      cache.clear();
    } else {
      keys.forEach((k) => cache.delete(k));
    }
  }

  return {
    getConfig: (): Promise<GitHubConfig | null> =>
      getCached("config", () => provider.getConfig()),

    saveConfig: (config: GitHubConfig): Promise<void> => {
      invalidate("config");
      return provider.saveConfig(config);
    },

    getToken: (): Promise<string | null> =>
      provider.getToken(),

    saveToken: (token: string): Promise<void> =>
      provider.saveToken(token),

    deleteToken: (): Promise<void> => {
      invalidate("config");
      return provider.deleteToken();
    },

    getPosts: (): Promise<HexoPost[]> =>
      getCached("posts", () => provider.getPosts()),

    getPost: (path: string): Promise<HexoPost> =>
      getCached(`post:${path}`, () => provider.getPost(path)),

    savePost: (post: HexoPost): Promise<void> => {
      invalidate("posts", `post:${post.path}`);
      return provider.savePost(post);
    },

    deletePost: (path: string): Promise<void> => {
      invalidate("posts", `post:${path}`);
      return provider.deletePost(path);
    },

    getPages: (): Promise<HexoPost[]> =>
      getCached("pages", () => provider.getPages()),

    getPage: (path: string): Promise<HexoPost> =>
      getCached(`page:${path}`, () => provider.getPage(path)),

    savePage: (post: HexoPost): Promise<void> => {
      invalidate("pages", `page:${post.path}`);
      return provider.savePage(post);
    },

    deletePage: (path: string): Promise<void> => {
      invalidate("pages", `page:${path}`);
      return provider.deletePage(path);
    },

    getTags: (): Promise<{
      tags: Array<{ id: string; name: string; slug: string; count: number }>;
      categories: Array<{ id: string; name: string; slug: string; count: number }>;
      total: number;
    }> => getCached("tags", () => provider.getTags()),

    renameTag: (type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }> => {
      invalidate("tags");
      return provider.renameTag(type, oldName, newName);
    },

    deleteTag: (type: "tag" | "category", name: string): Promise<{ updatedCount: number }> => {
      invalidate("tags");
      return provider.deleteTag(type, name);
    },

    getMediaFiles: (): Promise<Array<{ name: string; path: string; size: number; url: string; sha: string }>> =>
      getCached("media", () => provider.getMediaFiles()),

    uploadMedia: (file: File, path: string): Promise<{ url: string }> => {
      invalidate("media");
      return provider.uploadMedia(file, path);
    },

    deleteMedia: (path: string): Promise<void> => {
      invalidate("media");
      return provider.deleteMedia(path);
    },

    getStats: (): Promise<{
      totalPosts: number;
      publishedPosts: number;
      draftPosts: number;
      totalViews: number;
    }> => getCached("stats", () => provider.getStats()),

    getThemes: (): Promise<{ currentTheme: string; installedThemes: Array<{ name: string; path: string }> }> =>
      getCached("themes", () => provider.getThemes()),

    switchTheme: (themeName: string): Promise<void> => {
      invalidate("themes");
      return provider.switchTheme(themeName);
    },

    getDeployments: (): Promise<Array<{
      id: string; status: string; createdAt: string; duration: number; conclusion: string;
    }>> => getCached("deployments", () => provider.getDeployments()),

    triggerDeploy: (workflowFile: string): Promise<void> => {
      invalidate("deployments");
      return provider.triggerDeploy(workflowFile);
    },

    readConfigFile: (path: string): Promise<string> =>
      getCached(`config-file:${path}`, () => provider.readConfigFile(path)),

    writeConfigFile: (path: string, content: string): Promise<void> => {
      invalidate(`config-file:${path}`);
      return provider.writeConfigFile(path, content);
    },
  };
}
