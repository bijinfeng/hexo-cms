import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import type { GitHubConfig, PluginConfigStoreValue, PluginLogStoreValue, PluginSecretStoreValue, PluginStateStoreValue, PluginStorageStoreValue } from "@hexo-cms/core";
import { createDesktopAuthManager } from "./desktop-auth";
import { createDesktopPersistence, type PluginSecretMutation } from "./desktop-persistence";
import { createGitHubServiceProvider } from "./github-service-provider";
import { listWritableRepositories, validateHexoRepository, type OctokitLike } from "./onboarding";
import { createPluginHttpProxy, type PluginFetchRequest } from "./plugin-http-proxy";
import { deleteTaxonomy, getTaxonomySummary, renameTaxonomy, type TaxonomyDeleteInput, type TaxonomyMutation } from "./taxonomy-operations";
import { initUpdater, checkForUpdates as updaterCheckForUpdates, downloadUpdate, quitAndInstall, setChannel, getCurrentChannel } from "./auto-updater";

const KEYTAR_SERVICE = "hexo-cms";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const desktopPersistence = createDesktopPersistence({
  getUserDataPath: () => app.getPath("userData"),
  keytarService: KEYTAR_SERVICE,
});
const pluginHttpProxy = createPluginHttpProxy({
  appendAudit: (entry) => desktopPersistence.appendPluginNetworkAudit(entry),
});
let getDesktopAuthAccessToken: () => Promise<string | null> = async () => null;
const githubServiceProvider = createGitHubServiceProvider({
  loadConfig: () => desktopPersistence.loadConfig(),
  getAccessToken: () => getDesktopAuthAccessToken(),
});
const desktopAuth = createDesktopAuthManager({
  clientId: GITHUB_CLIENT_ID,
  keytarService: KEYTAR_SERVICE,
  invalidateGitHubService: () => githubServiceProvider.invalidate(),
  openExternal: (url) => {
    shell.openExternal(url);
  },
});
getDesktopAuthAccessToken = () => desktopAuth.getAccessToken();

// ==================== 托盘 ====================

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

function createTray(): void {
  const isMac = process.platform === "darwin";
  const iconName = isMac ? "tray-mac.png" : "icon.png";
  const iconPath = join(__dirname, "../../build", iconName);
  const nativeIcon = nativeImage.createFromPath(iconPath);

  if (isMac) nativeIcon.setTemplateImage(true);
  tray = new Tray(nativeIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示/隐藏窗口",
      click: () => {
        if (mainWindow) {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
      },
    },
    { type: "separator" },
    {
      label: "退出 Hexo CMS",
      role: "quit",
    },
  ]);

  tray.setToolTip("Hexo CMS");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function createWindow(): void {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: isMac,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ==================== 更新 IPC ====================

ipcMain.handle("update:check", async () => {
  updaterCheckForUpdates();
});

ipcMain.handle("update:download", async () => {
  downloadUpdate();
});

ipcMain.handle("update:install", async () => {
  quitAndInstall();
});

ipcMain.handle("update:set-channel", async (_event, channel: "stable" | "beta") => {
  setChannel(channel);
  updaterCheckForUpdates();
});

ipcMain.handle("update:get-version", async () => {
  return { version: app.getVersion(), channel: getCurrentChannel() };
});

// ==================== 窗口控制 IPC ====================

ipcMain.handle("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:maximize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.maximize();
});

ipcMain.handle("window:unmaximize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.unmaximize();
});

ipcMain.handle("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("window:isMaximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.hexo-cms");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();
  createTray();

  const channel = getCurrentChannel();
  initUpdater(mainWindow!, channel);
  updaterCheckForUpdates();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ==================== IPC handlers ====================

// Auth
ipcMain.handle("auth:getSession", async () => {
  return desktopAuth.getSession();
});

ipcMain.handle("auth:startDeviceFlow", async () => {
  return desktopAuth.startDeviceFlow();
});

ipcMain.handle("auth:signOut", async () => {
  await desktopAuth.signOut();
});

ipcMain.handle("auth:reauthorize", async () => {
  return desktopAuth.reauthorize();
});

// 配置管理
ipcMain.handle("config:get", () => {
  return desktopPersistence.loadConfig();
});

ipcMain.handle("config:save", (_event, config: GitHubConfig) => {
  try {
    desktopPersistence.saveConfig(config);
    githubServiceProvider.invalidate();
    return true;
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: config:save failed", error: String(error) }));
    throw error;
  }
});

ipcMain.handle("plugin-storage:load", () => {
  return desktopPersistence.loadPluginStorage();
});

ipcMain.handle("plugin-storage:save", (_event, value: PluginStorageStoreValue) => {
  desktopPersistence.savePluginStorage(value);
});

ipcMain.handle("plugin-secret:load", async () => {
  // Keep the legacy IPC channel available without exposing plaintext secrets.
  return {};
});

ipcMain.handle("plugin-secret:save", async (_event, value: PluginSecretStoreValue) => {
  await desktopPersistence.savePluginSecrets(value);
});

ipcMain.handle("plugin-secret:has", async (_event, { pluginId, key }: { pluginId: string; key: string }) => {
  return desktopPersistence.hasPluginSecret(pluginId, key);
});

ipcMain.handle("plugin-secret:mutate", async (_event, mutation: PluginSecretMutation) => {
  await desktopPersistence.mutatePluginSecret(mutation);
});

ipcMain.handle("plugin-http:fetch", async (_event, req: PluginFetchRequest) => {
  return pluginHttpProxy.fetch(req);
});

ipcMain.handle("plugin-network-audit:list", async (_event, limit?: number) => {
  return desktopPersistence.listPluginNetworkAudit(limit);
});

ipcMain.handle("plugin-state:load", () => {
  return desktopPersistence.loadPluginState();
});

ipcMain.handle("plugin-state:save", (_event, value: PluginStateStoreValue) => {
  desktopPersistence.savePluginState(value);
});

ipcMain.handle("plugin-config:load", () => {
  return desktopPersistence.loadPluginConfig();
});

ipcMain.handle("plugin-config:save", (_event, value: PluginConfigStoreValue) => {
  desktopPersistence.savePluginConfig(value);
});

ipcMain.handle("plugin-logs:load", () => {
  return desktopPersistence.loadPluginLogs();
});

ipcMain.handle("plugin-logs:save", (_event, value: PluginLogStoreValue) => {
  desktopPersistence.savePluginLogs(value);
});

// Onboarding repository import
ipcMain.handle("onboarding:listRepositories", async (_event, input: { query?: string } = {}) => {
  const token = await desktopAuth.getAccessToken();
  if (!token) return [];

  const { Octokit } = await import("octokit");
  return listWritableRepositories(new Octokit({
    auth: token,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  }) as OctokitLike, input);
});

ipcMain.handle("onboarding:validateRepository", async (_event, input: { owner: string; repo: string; branch?: string }) => {
  const token = await desktopAuth.getAccessToken();
  if (!token) {
    return {
      ok: false,
      checks: [{ id: "access", status: "error", message: "当前授权缺少仓库读写权限，请重新授权" }],
      error: "REAUTH_REQUIRED",
    };
  }

  const { Octokit } = await import("octokit");
  return validateHexoRepository(new Octokit({
    auth: token,
    headers: { "X-GitHub-Api-Version": "2022-11-28" },
  }) as OctokitLike, input);
});

// 文章管理
ipcMain.handle("github:get-posts", async () => {
  try {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return [];
    return await github.getPosts();
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-posts failed", error: String(error) }));
    return [];
  }
});

ipcMain.handle("github:get-post", async (_event, path: string) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    return await github.getPost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-post failed", path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:save-post", async (_event, post) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.savePost(post);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:save-post failed", path: post?.path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:delete-post", async (_event, path: string) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.deletePost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:delete-post failed", path, error: String(error) }));
    throw error;
  }
});

// 页面管理（复用 posts API，路径前缀不同）
ipcMain.handle("github:get-pages", async () => {
  try {
    const github = await githubServiceProvider.getGitHubService();
    if (!github) return [];
    return await github.getPosts();
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-pages failed", error: String(error) }));
    return [];
  }
});

ipcMain.handle("github:get-page", async (_event, path: string) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    return await github.getPost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-page failed", path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:save-page", async (_event, post) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.savePost(post);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:save-page failed", path: post?.path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:delete-page", async (_event, path: string) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.deletePost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:delete-page failed", path, error: String(error) }));
    throw error;
  }
});

// 标签和分类管理
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

// 媒体管理
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
  } catch {
    return [];
  }
});

ipcMain.handle("github:upload-media", async (_event, { buffer, path, name }: { buffer: ArrayBuffer; path: string; name: string; type: string }) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    const bytes = new Uint8Array(buffer);
    const base64 = Buffer.from(bytes).toString("base64");
    return await github.uploadMedia(path, base64, name);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:upload-media failed", path, name, error: String(error) }));
    throw new Error("Failed to upload media", { cause: error });
  }
});

ipcMain.handle("github:delete-media", async (_event, path: string) => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.deleteMedia(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:delete-media failed", path, error: String(error) }));
    throw new Error("Failed to delete media", { cause: error });
  }
});

// 统计数据
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

// 主题管理
ipcMain.handle("github:get-themes", async () => {
  const github = await githubServiceProvider.getGitHubService();
  if (!github) return { currentTheme: "", installedThemes: [] };

  try {
    const configFile = await github.getRawFile("_config.yml");
    const currentTheme = configFile ? parseYamlValue(configFile.content, "theme") : null;

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
  const github = await githubServiceProvider.getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    const configFile = await github.getRawFile("_config.yml");
    if (!configFile) throw new Error("_config.yml not found");
    const updatedConfig = setYamlValue(configFile.content, "theme", themeName);
    await github.writeRawFile("_config.yml", updatedConfig, `切换主题为: ${themeName}`);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:switch-theme failed", themeName, error: String(error) }));
    throw error;
  }
});

// 部署管理
ipcMain.handle("github:get-deployments", async () => {
  const config = desktopPersistence.loadConfig();
  if (!config) return [];

  const token = await desktopAuth.getAccessToken();

  if (!token) return [];

  try {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({
      auth: token,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: config.owner,
      repo: config.repo,
      per_page: 20,
    });

    return data.workflow_runs.map((run) => ({
      id: String(run.id),
      status: run.status === "completed" ? (run.conclusion === "success" ? "success" : "failed") : run.status === "in_progress" ? "running" : "pending",
      createdAt: run.created_at,
      duration: run.status === "completed" ? new Date(run.updated_at).getTime() - new Date(run.created_at).getTime() : 0,
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
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });
    await octokit.rest.actions.createWorkflowDispatch({
      owner: config.owner, repo: config.repo, workflow_id: workflowFile, ref: config.branch || "main",
    });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:trigger-deploy failed", workflowFile, error: String(error) }));
    throw error;
  }
});

// Helper functions for YAML parsing
function parseYamlValue(yaml: string, key: string): string | null {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = yaml.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function setYamlValue(yaml: string, key: string, value: string): string {
  const regex = new RegExp(`^(${key}:\\s*)(.+)$`, "m");
  if (regex.test(yaml)) {
    return yaml.replace(regex, `$1${value}`);
  }
  return yaml + `\n${key}: ${value}`;
}
