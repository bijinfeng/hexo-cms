import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from "electron";
import { dirname, join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { GitHubService } from "@hexo-cms/core";
import type { GitHubConfig, PluginConfigStoreValue, PluginSecretStoreValue, PluginStateStoreValue, PluginStorageStoreValue } from "@hexo-cms/core";
import type { DeviceFlowInfo } from "@hexo-cms/ui";
import {
  createAnonymousSession,
  createAuthenticatedSession,
  createDeviceFlowSession,
  fetchGitHubUser,
  parseStoredOAuthSession,
  pollGitHubDeviceFlowToken,
  serializeStoredOAuthSession,
  startGitHubDeviceFlow,
  type StoredOAuthSession,
} from "./auth";
import { listWritableRepositories, validateHexoRepository, type OctokitLike } from "./onboarding";

const KEYTAR_SERVICE = "hexo-cms";
const LEGACY_TOKEN_ACCOUNT = "github-token";
const OAUTH_SESSION_ACCOUNT = "github-oauth-session";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";

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

// ==================== 配置存储 ====================

function getConfigPath() {
  return join(app.getPath("userData"), "github-config.json");
}

function loadConfig(): GitHubConfig | null {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function saveConfigToFile(config: GitHubConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

function getPluginStoragePath(): string {
  return join(app.getPath("userData"), "plugins", "storage.json");
}

function loadPluginStorage(): PluginStorageStoreValue {
  const storagePath = getPluginStoragePath();
  if (!existsSync(storagePath)) return {};
  try {
    return JSON.parse(readFileSync(storagePath, "utf-8")) as PluginStorageStoreValue;
  } catch {
    return {};
  }
}

function savePluginStorage(value: PluginStorageStoreValue): void {
  const storagePath = getPluginStoragePath();
  mkdirSync(dirname(storagePath), { recursive: true });
  writeFileSync(storagePath, JSON.stringify(value, null, 2));
}

// ==================== 插件状态持久化 ====================

function getPluginStatePath(): string {
  return join(app.getPath("userData"), "plugins", "state.json");
}

function loadPluginStateFromFile(): PluginStateStoreValue {
  const statePath = getPluginStatePath();
  if (!existsSync(statePath)) return {};
  try {
    return JSON.parse(readFileSync(statePath, "utf-8")) as PluginStateStoreValue;
  } catch {
    return {};
  }
}

function savePluginStateToFile(value: PluginStateStoreValue): void {
  const statePath = getPluginStatePath();
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(value, null, 2));
}

// ==================== 插件配置持久化 ====================

function getPluginConfigPath(): string {
  return join(app.getPath("userData"), "plugins", "config.json");
}

function loadPluginConfigFromFile(): PluginConfigStoreValue {
  const configPath = getPluginConfigPath();
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as PluginConfigStoreValue;
  } catch {
    return {};
  }
}

function savePluginConfigToFile(value: PluginConfigStoreValue): void {
  const configPath = getPluginConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(value, null, 2));
}

// ==================== 插件网络审计日志 ====================

interface PluginNetworkAuditEntry {
  pluginId: string;
  url: string;
  method: string;
  status: number;
  error?: string;
  createdAt: string;
}

const MAX_AUDIT_ENTRIES = 200;

function getPluginNetworkAuditPath(): string {
  return join(app.getPath("userData"), "plugins", "network-audit.json");
}

function loadPluginNetworkAudit(): PluginNetworkAuditEntry[] {
  const auditPath = getPluginNetworkAuditPath();
  if (!existsSync(auditPath)) return [];
  try {
    return JSON.parse(readFileSync(auditPath, "utf-8")) as PluginNetworkAuditEntry[];
  } catch {
    return [];
  }
}

function appendPluginNetworkAudit(entry: Omit<PluginNetworkAuditEntry, "createdAt">): void {
  const entries = loadPluginNetworkAudit();
  entries.unshift({ ...entry, createdAt: new Date().toISOString() });
  const trimmed = entries.slice(0, MAX_AUDIT_ENTRIES);
  const auditPath = getPluginNetworkAuditPath();
  mkdirSync(dirname(auditPath), { recursive: true });
  writeFileSync(auditPath, JSON.stringify(trimmed, null, 2));
}

// ==================== 插件网络请求代理 ====================

interface PluginFetchRequest {
  pluginId?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

interface PluginFetchResponseBody {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

const MAX_PLUGIN_FETCH_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_PLUGIN_FETCH_TIMEOUT_MS = 10_000;

function sanitizePluginFetchHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (normalized !== "cookie" && normalized !== "set-cookie") {
      result[key] = value;
    }
  }
  return result;
}

async function executePluginFetch(req: PluginFetchRequest): Promise<PluginFetchResponseBody> {
  if (!req.url || typeof req.url !== "string") {
    throw new Error("Invalid URL");
  }

  const parsedUrl = new URL(req.url);
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Only HTTPS is allowed");
  }

  const timeoutMs = req.timeoutMs ?? DEFAULT_PLUGIN_FETCH_TIMEOUT_MS;
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const auditPluginId = typeof req.pluginId === "string" ? req.pluginId : "unknown";
  const auditMethod = req.method ?? "GET";

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: auditMethod,
      headers: sanitizePluginFetchHeaders(req.headers),
      body: req.body,
      signal: controller.signal,
      credentials: "omit",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PLUGIN_FETCH_RESPONSE_SIZE) {
      appendPluginNetworkAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 413,
        error: "response_too_large",
      });
      throw new Error("Response too large");
    }

    const body = await response.text();
    if (body.length > MAX_PLUGIN_FETCH_RESPONSE_SIZE) {
      appendPluginNetworkAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 413,
        error: "response_too_large",
      });
      throw new Error("Response too large");
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    appendPluginNetworkAudit({
      pluginId: auditPluginId,
      url: parsedUrl.toString(),
      method: auditMethod,
      status: response.status,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message !== "Response too large") {
      appendPluginNetworkAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 0,
        error: message,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// ==================== GitHubService 工厂（带缓存）====================

let cachedGitHubService: GitHubService | null = null;
let cachedToken: string | null = null;
let cachedConfig: GitHubConfig | null = null;
let activeDeviceFlow: { deviceCode: string; deviceFlow: DeviceFlowInfo } | null = null;
let lastDeviceFlowError: string | null = null;
let pollingDeviceFlow = false;

async function getStoredOAuthSession(): Promise<StoredOAuthSession | null> {
  try {
    const keytar = await import("keytar");
    const value = await keytar.default.getPassword(KEYTAR_SERVICE, OAUTH_SESSION_ACCOUNT);
    return parseStoredOAuthSession(value);
  } catch {
    return null;
  }
}

async function saveStoredOAuthSession(session: StoredOAuthSession): Promise<void> {
  const keytar = await import("keytar");
  await keytar.default.setPassword(KEYTAR_SERVICE, OAUTH_SESSION_ACCOUNT, serializeStoredOAuthSession(session));
}

async function deleteStoredOAuthSession(): Promise<void> {
  try {
    const keytar = await import("keytar");
    await keytar.default.deletePassword(KEYTAR_SERVICE, OAUTH_SESSION_ACCOUNT);
    await keytar.default.deletePassword(KEYTAR_SERVICE, LEGACY_TOKEN_ACCOUNT);
  } catch {
    // Signing out should be idempotent even if the OS keychain is unavailable.
  }
  activeDeviceFlow = null;
  lastDeviceFlowError = null;
  invalidateGitHubServiceCache();
}

async function getGitHubAccessToken(): Promise<string | null> {
  const session = await getStoredOAuthSession();
  return session?.accessToken ?? null;
}

async function getGitHubService(): Promise<GitHubService | null> {
  const config = loadConfig();
  if (!config) {
    cachedGitHubService = null;
    return null;
  }

  const token = await getGitHubAccessToken();

  if (!token) {
    cachedGitHubService = null;
    return null;
  }

  // 返回缓存实例（如果 config 和 token 未变）
  if (
    cachedGitHubService &&
    cachedToken === token &&
    cachedConfig?.owner === config.owner &&
    cachedConfig?.repo === config.repo &&
    cachedConfig?.branch === config.branch &&
    cachedConfig?.postsDir === config.postsDir &&
    cachedConfig?.mediaDir === config.mediaDir
  ) {
    return cachedGitHubService;
  }

  // 创建新实例并缓存
  cachedToken = token;
  cachedConfig = config;
  cachedGitHubService = new GitHubService(token, config);
  return cachedGitHubService;
}

function invalidateGitHubServiceCache(): void {
  cachedGitHubService = null;
  cachedToken = null;
  cachedConfig = null;
}

async function pollActiveDeviceFlow(): Promise<void> {
  if (!activeDeviceFlow || pollingDeviceFlow) return;
  pollingDeviceFlow = true;

  try {
    while (activeDeviceFlow) {
      if (Date.now() >= new Date(activeDeviceFlow.deviceFlow.expiresAt).getTime()) {
        activeDeviceFlow = null;
        lastDeviceFlowError = "AUTH_TIMEOUT";
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.max(activeDeviceFlow?.deviceFlow.interval ?? 5, 1) * 1000));
      if (!activeDeviceFlow) return;

      const result = await pollGitHubDeviceFlowToken({
        clientId: GITHUB_CLIENT_ID,
        deviceCode: activeDeviceFlow.deviceCode,
      });

      if (result.status === "pending") continue;
      if (result.status === "slow_down") {
        activeDeviceFlow.deviceFlow.interval += result.intervalDelta ?? 5;
        continue;
      }
      if (result.status === "error") {
        activeDeviceFlow = null;
        lastDeviceFlowError = result.error;
        return;
      }
      if (result.status !== "success") continue;

      const user = await fetchGitHubUser(result.token);
      await saveStoredOAuthSession({
        accessToken: result.token,
        tokenType: result.tokenType,
        scope: result.scope,
        githubUserId: user?.id,
        user,
        createdAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
      });
      activeDeviceFlow = null;
      lastDeviceFlowError = null;
      invalidateGitHubServiceCache();
    }
  } finally {
    pollingDeviceFlow = false;
  }
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
  const session = await getStoredOAuthSession();
  if (session) return createAuthenticatedSession(session);
  if (activeDeviceFlow || lastDeviceFlowError) return createDeviceFlowSession(activeDeviceFlow?.deviceFlow ?? null, lastDeviceFlowError);
  return createAnonymousSession();
});

ipcMain.handle("auth:startDeviceFlow", async () => {
  const started = await startGitHubDeviceFlow({ clientId: GITHUB_CLIENT_ID });
  if (started.session.state !== "authenticating" || !started.session.deviceFlow) {
    return started.session;
  }

  activeDeviceFlow = {
    deviceCode: started.deviceCode,
    deviceFlow: started.session.deviceFlow,
  };
  lastDeviceFlowError = null;

  shell.openExternal(started.session.deviceFlow.verificationUri);
  void pollActiveDeviceFlow();
  return started.session;
});

ipcMain.handle("auth:signOut", async () => {
  await deleteStoredOAuthSession();
});

ipcMain.handle("auth:reauthorize", async () => {
  await deleteStoredOAuthSession();
  const started = await startGitHubDeviceFlow({ clientId: GITHUB_CLIENT_ID });
  if (started.session.state === "authenticating" && started.session.deviceFlow) {
    activeDeviceFlow = {
      deviceCode: started.deviceCode,
      deviceFlow: started.session.deviceFlow,
    };
    lastDeviceFlowError = null;
    shell.openExternal(started.session.deviceFlow.verificationUri);
    void pollActiveDeviceFlow();
  }
  return started.session;
});

// 配置管理
ipcMain.handle("config:get", () => {
  return loadConfig();
});

ipcMain.handle("config:save", (_event, config: GitHubConfig) => {
  try {
    saveConfigToFile(config);
    invalidateGitHubServiceCache();
    return true;
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: config:save failed", error: String(error) }));
    throw error;
  }
});

ipcMain.handle("plugin-storage:load", () => {
  return loadPluginStorage();
});

ipcMain.handle("plugin-storage:save", (_event, value: PluginStorageStoreValue) => {
  savePluginStorage(value);
});

ipcMain.handle("plugin-secret:load", async () => {
  const keytar = await import("keytar");
  const value = await keytar.default.getPassword(KEYTAR_SERVICE, "plugin-secrets");
  if (!value) return {};
  try {
    return JSON.parse(value) as PluginSecretStoreValue;
  } catch {
    return {};
  }
});

ipcMain.handle("plugin-secret:save", async (_event, value: PluginSecretStoreValue) => {
  const keytar = await import("keytar");
  await keytar.default.setPassword(KEYTAR_SERVICE, "plugin-secrets", JSON.stringify(value));
});

ipcMain.handle("plugin-http:fetch", async (_event, req: PluginFetchRequest) => {
  return executePluginFetch(req);
});

ipcMain.handle("plugin-network-audit:list", async (_event, limit?: number) => {
  const entries = loadPluginNetworkAudit();
  return entries.slice(0, typeof limit === "number" && limit > 0 ? limit : 50);
});

ipcMain.handle("plugin-state:load", () => {
  return loadPluginStateFromFile();
});

ipcMain.handle("plugin-state:save", (_event, value: PluginStateStoreValue) => {
  savePluginStateToFile(value);
});

ipcMain.handle("plugin-config:load", () => {
  return loadPluginConfigFromFile();
});

ipcMain.handle("plugin-config:save", (_event, value: PluginConfigStoreValue) => {
  savePluginConfigToFile(value);
});

// Onboarding repository import
ipcMain.handle("onboarding:listRepositories", async (_event, input: { query?: string } = {}) => {
  const token = await getGitHubAccessToken();
  if (!token) return [];

  const { Octokit } = await import("octokit");
  return listWritableRepositories(new Octokit({ auth: token }) as OctokitLike, input);
});

ipcMain.handle("onboarding:validateRepository", async (_event, input: { owner: string; repo: string; branch?: string }) => {
  const token = await getGitHubAccessToken();
  if (!token) {
    return {
      ok: false,
      checks: [{ id: "access", status: "error", message: "当前授权缺少仓库读写权限，请重新授权" }],
      error: "REAUTH_REQUIRED",
    };
  }

  const { Octokit } = await import("octokit");
  return validateHexoRepository(new Octokit({ auth: token }) as OctokitLike, input);
});

// 文章管理
ipcMain.handle("github:get-posts", async () => {
  try {
    const github = await getGitHubService();
    if (!github) return [];
    return await github.getPosts();
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-posts failed", error: String(error) }));
    return [];
  }
});

ipcMain.handle("github:get-post", async (_event, path: string) => {
  const github = await getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    return await github.getPost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-post failed", path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:save-post", async (_event, post) => {
  const github = await getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.savePost(post);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:save-post failed", path: post?.path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:delete-post", async (_event, path: string) => {
  const github = await getGitHubService();
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
    const github = await getGitHubService();
    if (!github) return [];
    return await github.getPosts();
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-pages failed", error: String(error) }));
    return [];
  }
});

ipcMain.handle("github:get-page", async (_event, path: string) => {
  const github = await getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    return await github.getPost(path);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:get-page failed", path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:save-page", async (_event, post) => {
  const github = await getGitHubService();
  if (!github) throw new Error("GitHub not configured");
  try {
    await github.savePost(post);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "IPC: github:save-page failed", path: post?.path, error: String(error) }));
    throw error;
  }
});

ipcMain.handle("github:delete-page", async (_event, path: string) => {
  const github = await getGitHubService();
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
  const github = await getGitHubService();
  if (!github) return { tags: [], categories: [], total: 0 };

  const posts = await github.getPosts();
  const tagMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const post of posts) {
    const tags = post.frontmatter.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    } else if (typeof tags === "string" && tags) {
      tagMap.set(tags, (tagMap.get(tags) || 0) + 1);
    }

    const category = post.frontmatter.category || post.frontmatter.categories;
    if (typeof category === "string" && category) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    } else if (Array.isArray(category)) {
      for (const cat of category) {
        if (typeof cat === "string") categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
    }
  }

  const tagList = Array.from(tagMap.entries())
    .map(([name, count], i) => ({ id: String(i + 1), name, slug: name.toLowerCase().replace(/\s+/g, "-"), count }))
    .sort((a, b) => b.count - a.count);

  const categoryList = Array.from(categoryMap.entries())
    .map(([name, count], i) => ({ id: String(i + 1), name, slug: name.toLowerCase().replace(/\s+/g, "-"), count }))
    .sort((a, b) => b.count - a.count);

  return { tags: tagList, categories: categoryList, total: posts.length };
});

ipcMain.handle("github:rename-tag", async (_event, { type, oldName, newName }: { type: "tag" | "category"; oldName: string; newName: string }) => {
  const github = await getGitHubService();
  if (!github) return { updatedCount: 0 };

  const posts = await github.getPosts();
  let updatedCount = 0;

  for (const post of posts) {
    let changed = false;
    const fm = { ...post.frontmatter };

    if (type === "tag") {
      if (Array.isArray(fm.tags)) {
        const idx = fm.tags.indexOf(oldName);
        if (idx !== -1) { fm.tags[idx] = newName; changed = true; }
      } else if (fm.tags === oldName) {
        fm.tags = newName; changed = true;
      }
    } else {
      if (fm.category === oldName) { fm.category = newName; changed = true; }
      if (fm.categories === oldName) { fm.categories = newName; changed = true; }
    }

    if (changed) {
      await github.savePost({ ...post, frontmatter: fm });
      updatedCount++;
    }
  }

  return { updatedCount };
});

ipcMain.handle("github:delete-tag", async (_event, { type, name }: { type: "tag" | "category"; name: string }) => {
  const github = await getGitHubService();
  if (!github) return { updatedCount: 0 };

  const posts = await github.getPosts();
  let updatedCount = 0;

  for (const post of posts) {
    let changed = false;
    const fm = { ...post.frontmatter };

    if (type === "tag") {
      if (Array.isArray(fm.tags)) {
        const filtered = fm.tags.filter((t: string) => t !== name);
        if (filtered.length !== fm.tags.length) { fm.tags = filtered; changed = true; }
      } else if (fm.tags === name) {
        fm.tags = []; changed = true;
      }
    } else {
      if (fm.category === name) { delete fm.category; changed = true; }
      if (fm.categories === name) { delete fm.categories; changed = true; }
    }

    if (changed) {
      await github.savePost({ ...post, frontmatter: fm });
      updatedCount++;
    }
  }

  return { updatedCount };
});

// 媒体管理
ipcMain.handle("github:get-media", async () => {
  const github = await getGitHubService();
  if (!github) return [];

  const config = loadConfig();
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
  const github = await getGitHubService();
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
  const github = await getGitHubService();
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
  const github = await getGitHubService();
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
  const github = await getGitHubService();
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
  const github = await getGitHubService();
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
  const config = loadConfig();
  if (!config) return [];

  const token = await getGitHubAccessToken();

  if (!token) return [];

  try {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });

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
  const config = loadConfig();
  if (!config) throw new Error("GitHub not configured");
  try {
    const token = await getGitHubAccessToken();
    if (!token) throw new Error("No token found");
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });
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
