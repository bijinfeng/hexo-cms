import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { officialPlugins } from "@hexo-cms/plugins";
import { createDesktopAuthManager } from "./desktop-auth";
import { createDesktopPersistence } from "./desktop-persistence";
import { createGitHubServiceProvider } from "./github-service-provider";
import { createPluginHttpProxy } from "./plugin-http-proxy";
import { registerIpcHandlers } from "./ipc-handlers";
import { initUpdater, checkForUpdates as updaterCheckForUpdates, downloadUpdate, quitAndInstall, setChannel, getCurrentChannel } from "./auto-updater";

const KEYTAR_SERVICE = "hexo-cms";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";

const desktopPersistence = createDesktopPersistence({
  getUserDataPath: () => app.getPath("userData"),
  keytarService: KEYTAR_SERVICE,
});
const officialPluginManifests = officialPlugins.map((plugin) => plugin.manifest);
const pluginHttpProxy = createPluginHttpProxy({
  manifests: officialPluginManifests,
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
  openExternal: (url) => { shell.openExternal(url); },
});
getDesktopAuthAccessToken = () => desktopAuth.getAccessToken();

registerIpcHandlers({
  githubServiceProvider,
  desktopPersistence,
  desktopAuth,
  pluginHttpProxy,
});

// ==================== Locale IPC ====================
ipcMain.handle("locale:get", () => {
  return desktopPersistence.loadLocale();
});
ipcMain.handle("locale:set", (_event, locale: string) => {
  desktopPersistence.saveLocale(locale);
});
ipcMain.handle("locale:get-system", () => {
  return app.getLocale();
});

// ==================== 更新 IPC ====================
ipcMain.handle("update:check", async () => { updaterCheckForUpdates(); });
ipcMain.handle("update:download", async () => { downloadUpdate(); });
ipcMain.handle("update:install", async () => { quitAndInstall(); });
ipcMain.handle("update:set-channel", async (_event, channel: "stable" | "beta") => { setChannel(channel); updaterCheckForUpdates(); });
ipcMain.handle("update:get-version", async () => ({ version: app.getVersion(), channel: getCurrentChannel() }));

// ==================== 窗口控制 IPC ====================
ipcMain.handle("window:minimize", (event) => { BrowserWindow.fromWebContents(event.sender)?.minimize(); });
ipcMain.handle("window:maximize", (event) => { BrowserWindow.fromWebContents(event.sender)?.maximize(); });
ipcMain.handle("window:unmaximize", (event) => { BrowserWindow.fromWebContents(event.sender)?.unmaximize(); });
ipcMain.handle("window:close", (event) => { BrowserWindow.fromWebContents(event.sender)?.close(); });
ipcMain.handle("window:isMaximized", (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);

// ==================== 窗口 & 托盘 ====================
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
    { label: "显示/隐藏窗口", click: () => { mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show(); } },
    { type: "separator" },
    { label: "退出 Hexo CMS", role: "quit" },
  ]);
  tray.setToolTip("Hexo CMS");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => { mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show(); });
}

function createWindow(): void {
  const isMac = process.platform === "darwin";
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    show: false, frame: isMac, autoHideMenuBar: true,
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    webPreferences: { preload: join(__dirname, "../preload/index.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.on("ready-to-show", () => { mainWindow?.show(); });
  mainWindow.webContents.setWindowOpenHandler((details) => { shell.openExternal(details.url); return { action: "deny" }; });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.hexo-cms");
  app.on("browser-window-created", (_, window) => { optimizer.watchWindowShortcuts(window); });
  createWindow();
  createTray();
  initUpdater(mainWindow!, getCurrentChannel());
  updaterCheckForUpdates();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
