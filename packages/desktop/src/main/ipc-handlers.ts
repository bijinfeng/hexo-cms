import type {
  GitHubConfig,
  HexoPost,
  PluginConfigStoreValue,
  PluginLogStoreValue,
  PluginSecretStoreValue,
  PluginStateStoreValue,
  PluginStorageStoreValue,
} from "@hexo-cms/core";
import { GITHUB_API_VERSION, parseYamlScalar, setYamlScalar } from "@hexo-cms/core";
import { type OctokitLike, listWritableRepositories, validateHexoRepository } from "@hexo-cms/core";
import type { GitHubService } from "@hexo-cms/core";
import { ipcMain } from "electron";
import type { PluginSecretMutation } from "./desktop-persistence";
import type { PluginFetchRequest } from "./plugin-http-proxy";
import {
  type TaxonomyDeleteInput,
  type TaxonomyMergeInput,
  type TaxonomyMutation,
  deleteTaxonomy,
  getTaxonomySummary,
  mergeTaxonomy,
  renameTaxonomy,
} from "./taxonomy-operations";

interface Dependencies {
  githubServiceProvider: { getGitHubService(): Promise<GitHubService | null>; invalidate(): void };
  desktopPersistence: {
    loadConfig(): GitHubConfig | null;
    saveConfig(c: GitHubConfig): void;
    loadPluginState(): PluginStateStoreValue;
    savePluginState(v: PluginStateStoreValue): void;
    loadPluginConfig(): PluginConfigStoreValue;
    savePluginConfig(v: PluginConfigStoreValue): void;
    loadPluginStorage(): PluginStorageStoreValue;
    savePluginStorage(v: PluginStorageStoreValue): void;
    loadPluginLogs(): PluginLogStoreValue;
    savePluginLogs(v: PluginLogStoreValue): void;
    savePluginSecrets(v: PluginSecretStoreValue): Promise<void>;
    hasPluginSecret(id: string, key: string): Promise<boolean>;
    mutatePluginSecret(m: PluginSecretMutation): Promise<void>;
    listPluginNetworkAudit(limit?: number): unknown[];
    appendPluginNetworkAudit(e: unknown): void;
  };
  desktopAuth: {
    getSession(): unknown;
    startDeviceFlow(): unknown;
    signOut(): Promise<void>;
    reauthorize(): unknown;
    getAccessToken(): Promise<string | null>;
  };
  pluginHttpProxy: { fetch(req: PluginFetchRequest): Promise<unknown> };
}

export function registerIpcHandlers(deps: Dependencies) {
  const { githubServiceProvider, desktopPersistence, desktopAuth, pluginHttpProxy } = deps;

  const gh = async () => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) throw new Error("GitHub not configured");
    return github;
  };

  const logErr = (channel: string, ctx?: Record<string, unknown>) => (error: unknown) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: `IPC: ${channel} failed`,
        ...ctx,
        error: String(error),
      }),
    );
  };

  // Auth
  ipcMain.handle("auth:getSession", async () => desktopAuth.getSession());
  ipcMain.handle("auth:startDeviceFlow", async () => desktopAuth.startDeviceFlow());
  ipcMain.handle("auth:signOut", async () => {
    await desktopAuth.signOut();
  });
  ipcMain.handle("auth:reauthorize", async () => desktopAuth.reauthorize());

  // Config
  ipcMain.handle("config:get", () => desktopPersistence.loadConfig());
  ipcMain.handle("config:save", (_event, config: GitHubConfig) => {
    try {
      desktopPersistence.saveConfig(config);
      githubServiceProvider.invalidate();
      return true;
    } catch (error) {
      logErr("config:save")(error);
      throw error;
    }
  });

  ipcMain.handle("github:read-config-file", async (_event, configPath: string) => {
    try {
      const github = await gh();
      const configFile = await github.getRawFile(configPath);
      return configFile?.content ?? "";
    } catch (error) {
      logErr("github:read-config-file", { path: configPath })(error);
      throw error;
    }
  });

  ipcMain.handle(
    "github:write-config-file",
    async (_event, configPath: string, content: string) => {
      try {
        const github = await gh();
        await github.writeRawFile(configPath, content, `更新配置文件: ${configPath}`);
      } catch (error) {
        logErr("github:write-config-file", { path: configPath })(error);
        throw error;
      }
    },
  );

  // Plugin stores
  ipcMain.handle("plugin-storage:load", () => desktopPersistence.loadPluginStorage());
  ipcMain.handle("plugin-storage:save", (_event, value: PluginStorageStoreValue) =>
    desktopPersistence.savePluginStorage(value),
  );
  ipcMain.handle("plugin-secret:load", async () => ({}));
  ipcMain.handle("plugin-secret:save", async (_event, value: PluginSecretStoreValue) => {
    await desktopPersistence.savePluginSecrets(value);
  });
  ipcMain.handle(
    "plugin-secret:has",
    async (_event, { pluginId, key }: { pluginId: string; key: string }) =>
      desktopPersistence.hasPluginSecret(pluginId, key),
  );
  ipcMain.handle("plugin-secret:mutate", async (_event, mutation: PluginSecretMutation) => {
    await desktopPersistence.mutatePluginSecret(mutation);
  });
  ipcMain.handle("plugin-http:fetch", async (_event, req: PluginFetchRequest) =>
    pluginHttpProxy.fetch(req),
  );
  ipcMain.handle("plugin-network-audit:list", async (_event, limit?: number) =>
    desktopPersistence.listPluginNetworkAudit(limit),
  );
  ipcMain.handle("plugin-state:load", () => desktopPersistence.loadPluginState());
  ipcMain.handle("plugin-state:save", (_event, value: PluginStateStoreValue) =>
    desktopPersistence.savePluginState(value),
  );
  ipcMain.handle("plugin-config:load", () => desktopPersistence.loadPluginConfig());
  ipcMain.handle("plugin-config:save", (_event, value: PluginConfigStoreValue) =>
    desktopPersistence.savePluginConfig(value),
  );
  ipcMain.handle("plugin-logs:load", () => desktopPersistence.loadPluginLogs());
  ipcMain.handle("plugin-logs:save", (_event, value: PluginLogStoreValue) =>
    desktopPersistence.savePluginLogs(value),
  );

  // Onboarding
  ipcMain.handle("onboarding:listRepositories", async (_event, input: { query?: string } = {}) => {
    const token = await desktopAuth.getAccessToken();
    if (!token) return [];
    const { Octokit } = await import("octokit");
    return listWritableRepositories(
      new Octokit({
        auth: token,
        headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
      }) as OctokitLike,
      input,
    );
  });

  ipcMain.handle(
    "onboarding:validateRepository",
    async (_event, input: { owner: string; repo: string; branch?: string }) => {
      const token = await desktopAuth.getAccessToken();
      if (!token)
        return {
          ok: false,
          checks: [
            { id: "access", status: "error", message: "当前授权缺少仓库读写权限，请重新授权" },
          ],
          error: "REAUTH_REQUIRED",
        };
      const { Octokit } = await import("octokit");
      return validateHexoRepository(
        new Octokit({
          auth: token,
          headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
        }) as OctokitLike,
        input,
      );
    },
  );

  // Posts
  ipcMain.handle("github:get-posts", async () => {
    try {
      const github = await githubServiceProvider.getGitHubService();
      if (!github) return [];
      return await github.getPosts();
    } catch (error) {
      logErr("github:get-posts")(error);
      return [];
    }
  });

  ipcMain.handle("github:get-post", async (_event, path: string) => {
    try {
      return await (await gh()).getPost(path);
    } catch (error) {
      logErr("github:get-post", { path })(error);
      throw error;
    }
  });

  ipcMain.handle("github:save-post", async (_event, post: HexoPost) => {
    try {
      await (await gh()).savePost(post);
    } catch (error) {
      logErr("github:save-post", { path: post.path })(error);
      throw error;
    }
  });

  ipcMain.handle("github:delete-post", async (_event, path: string) => {
    try {
      await (await gh()).deletePost(path);
    } catch (error) {
      logErr("github:delete-post", { path })(error);
      throw error;
    }
  });

  // Pages
  ipcMain.handle("github:get-pages", async () => {
    try {
      const github = await githubServiceProvider.getGitHubService();
      if (!github) return [];
      const entries = await github.listDirectory("source");
      const pages = await Promise.all(
        entries
          .filter(
            (entry) =>
              entry.type === "dir" ||
              (entry.type === "file" && entry.name.endsWith(".md") && entry.name !== "index.md"),
          )
          .map(async (entry) => {
            const pagePath = entry.type === "dir" ? `${entry.path}/index.md` : entry.path;
            return github.getPost(pagePath);
          }),
      );
      return pages.filter((page): page is NonNullable<typeof page> => page !== null);
    } catch (error) {
      logErr("github:get-pages")(error);
      return [];
    }
  });

  ipcMain.handle("github:get-page", async (_event, path: string) => {
    try {
      return await (await gh()).getPost(path);
    } catch (error) {
      logErr("github:get-page", { path })(error);
      throw error;
    }
  });

  ipcMain.handle("github:save-page", async (_event, post: HexoPost) => {
    try {
      await (await gh()).savePost(post);
    } catch (error) {
      logErr("github:save-page", { path: post.path })(error);
      throw error;
    }
  });

  ipcMain.handle("github:delete-page", async (_event, path: string) => {
    try {
      await (await gh()).deletePost(path);
    } catch (error) {
      logErr("github:delete-page", { path })(error);
      throw error;
    }
  });

  // Taxonomy
  ipcMain.handle("github:get-tags", async () => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { tags: [], categories: [], total: 0 };
    return getTaxonomySummary(github);
  });

  ipcMain.handle("github:rename-tag", async (_event, mutation: TaxonomyMutation) => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { updatedCount: 0 };
    return renameTaxonomy(github, mutation);
  });

  ipcMain.handle("github:delete-tag", async (_event, input: TaxonomyDeleteInput) => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { updatedCount: 0 };
    return deleteTaxonomy(github, input);
  });

  ipcMain.handle("github:merge-tag", async (_event, input: TaxonomyMergeInput) => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { updatedCount: 0 };
    return mergeTaxonomy(github, input);
  });

  // Media
  ipcMain.handle("github:get-media", async () => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return [];
    const config = desktopPersistence.loadConfig();
    const mediaDir = config?.mediaDir || "source/images";
    try {
      const files = await github.listDirectory(mediaDir);
      return files.map((f) => ({
        name: f.name,
        path: f.path,
        size: 0,
        url: `https://github.com/${config?.owner}/${config?.repo}/blob/${config?.branch || "main"}/${f.path}`,
        sha: "",
      }));
    } catch (error) {
      logErr("github:get-media")(error);
      return [];
    }
  });

  ipcMain.handle(
    "github:upload-media",
    async (
      _event,
      { buffer, path, name }: { buffer: ArrayBuffer; path: string; name: string; type: string },
    ) => {
      try {
        const github = await gh();
        const bytes = new Uint8Array(buffer);
        return await github.uploadMedia(path, Buffer.from(bytes).toString("base64"), name);
      } catch (error) {
        logErr("github:upload-media", { path, name })(error);
        throw new Error("Failed to upload media", { cause: error });
      }
    },
  );

  ipcMain.handle("github:delete-media", async (_event, path: string) => {
    try {
      await (await gh()).deleteMedia(path);
    } catch (error) {
      logErr("github:delete-media", { path })(error);
      throw new Error("Failed to delete media", { cause: error });
    }
  });

  // Stats
  ipcMain.handle("github:get-stats", async () => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 };
    const posts = await github.getPosts();
    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter((p) => !p.frontmatter.draft).length,
      draftPosts: posts.filter((p) => p.frontmatter.draft).length,
      totalViews: 0,
    };
  });

  // Themes
  ipcMain.handle("github:get-themes", async () => {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return { currentTheme: "", installedThemes: [] };
    try {
      const configFile = await github.getRawFile("_config.yml");
      const currentTheme = configFile ? parseYamlScalar(configFile.content, "theme") : null;
      const themeEntries = await github.listDirectory("themes");
      const installedThemes = themeEntries
        .filter((e) => e.type === "dir")
        .map((e) => ({ name: e.name, path: e.path }));
      return { currentTheme: currentTheme || "", installedThemes };
    } catch {
      return { currentTheme: "", installedThemes: [] };
    }
  });

  ipcMain.handle("github:switch-theme", async (_event, themeName: string) => {
    try {
      const github = await gh();
      const configFile = await github.getRawFile("_config.yml");
      if (!configFile) throw new Error("_config.yml not found");
      await github.writeRawFile(
        "_config.yml",
        setYamlScalar(configFile.content, "theme", themeName),
        `切换主题为: ${themeName}`,
      );
    } catch (error) {
      logErr("github:switch-theme", { themeName })(error);
      throw error;
    }
  });

  // Deploy
  ipcMain.handle("github:get-deployments", async () => {
    const config = desktopPersistence.loadConfig();
    if (!config) return [];
    const token = await desktopAuth.getAccessToken();
    if (!token) return [];
    try {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({
        auth: token,
        headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
      });
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner: config.owner,
        repo: config.repo,
        per_page: 20,
      });
      return data.workflow_runs.map((run) => ({
        id: String(run.id),
        status:
          run.status === "completed"
            ? run.conclusion === "success"
              ? "success"
              : "failed"
            : run.status === "in_progress"
              ? "running"
              : "pending",
        createdAt: run.created_at,
        duration:
          run.status === "completed"
            ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()
            : 0,
        conclusion: run.conclusion || "",
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle("github:trigger-deploy", async (_event, workflowFile: string) => {
    const config = desktopPersistence.loadConfig();
    if (!config) throw new Error("GitHub not configured");
    try {
      const token = await desktopAuth.getAccessToken();
      if (!token) throw new Error("No token found");
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({
        auth: token,
        headers: { "X-GitHub-Api-Version": GITHUB_API_VERSION },
      });
      await octokit.rest.actions.createWorkflowDispatch({
        owner: config.owner,
        repo: config.repo,
        workflow_id: workflowFile,
        ref: config.branch || "main",
      });
    } catch (error) {
      logErr("github:trigger-deploy", { workflowFile })(error);
      throw error;
    }
  });
}
