# Auto-Update Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto-update capability to the Hexo CMS Electron desktop app using `electron-updater` with GitHub Releases, supporting stable/beta channels and startup checks.

**Architecture:** Main process `auto-updater.ts` wraps `electron-updater`, pushes status events via IPC to the renderer where a `useUpdater` hook drives an `UpdateBanner` banner and a Settings section. `electron-builder.yml` publishes to GitHub Releases via CI.

**Tech Stack:** electron-updater (v6), electron-builder (v26), React 19, Tailwind CSS v4, Vitest, GitHub Actions

---

### Task 1: Add update IPC channels and types to the shared allowlist

**Files:**
- Modify: `packages/ui/src/types/electron-api.ts`

- [ ] **Step 1: Add new channels and types**

```ts
import type { AuthSession } from "./auth";
import type {
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
} from "./onboarding";

export const ELECTRON_IPC_CHANNELS = [
  "auth:getSession",
  "auth:startDeviceFlow",
  "auth:signOut",
  "auth:reauthorize",
  "onboarding:listRepositories",
  "onboarding:validateRepository",
  "config:get",
  "config:save",
  "github:get-posts",
  "github:get-post",
  "github:save-post",
  "github:delete-post",
  "github:get-pages",
  "github:get-page",
  "github:save-page",
  "github:delete-page",
  "github:get-tags",
  "github:rename-tag",
  "github:delete-tag",
  "github:get-media",
  "github:upload-media",
  "github:delete-media",
  "github:get-stats",
  "github:get-themes",
  "github:switch-theme",
  "github:get-deployments",
  "github:trigger-deploy",
  "plugin-storage:load",
  "plugin-storage:save",
  "plugin-secret:load",
  "plugin-secret:save",
  "plugin-secret:has",
  "plugin-secret:mutate",
  "plugin-http:fetch",
  "plugin-network-audit:list",
  "plugin-state:load",
  "plugin-state:save",
  "plugin-config:load",
  "plugin-config:save",
  "plugin-logs:load",
  "plugin-logs:save",
  "window:minimize",
  "window:maximize",
  "window:unmaximize",
  "window:close",
  "window:isMaximized",
  "update:check",
  "update:download",
  "update:install",
  "update:set-channel",
  "update:get-version",
] as const;

export type ElectronIpcChannel = (typeof ELECTRON_IPC_CHANNELS)[number];

const ELECTRON_IPC_CHANNEL_SET = new Set<string>(ELECTRON_IPC_CHANNELS);

export function isElectronIpcChannel(channel: string): channel is ElectronIpcChannel {
  return ELECTRON_IPC_CHANNEL_SET.has(channel);
}

export type UpdateChannel = "stable" | "beta";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatusPayload {
  status: UpdateStatus;
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  message?: string;
}

export interface ElectronAPI {
  getSession: () => Promise<AuthSession>;
  startDeviceFlow: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
  listOnboardingRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateOnboardingRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  invoke: <T = unknown>(channel: ElectronIpcChannel, ...args: unknown[]) => Promise<T>;
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  setUpdateChannel: (channel: UpdateChannel) => Promise<void>;
  getVersion: () => Promise<{ version: string; channel: UpdateChannel }>;
}
```

- [ ] **Step 2: Run type-check to verify**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/types/electron-api.ts
git commit -m "feat: add update IPC channels and types to shared allowlist"
```

---

### Task 2: Create main process auto-updater service

**Files:**
- Create: `packages/desktop/src/main/auto-updater.ts`

- [ ] **Step 1: Write the auto-updater module**

```ts
import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";
import type { UpdateChannel, UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";
import { readJsonFile, writeJsonFile } from "./json-file-store";
import { join } from "path";
import { app } from "electron";

const UPDATE_CONFIG_FILENAME = "update-config.json";

function getUpdateConfigPath(): string {
  return join(app.getPath("userData"), UPDATE_CONFIG_FILENAME);
}

interface UpdateConfig {
  channel: UpdateChannel;
}

function loadChannel(): UpdateChannel {
  return readJsonFile<UpdateConfig>(getUpdateConfigPath(), () => ({ channel: "stable" })).channel;
}

function saveChannel(channel: UpdateChannel): void {
  writeJsonFile(getUpdateConfigPath(), { channel });
}

let mainWindow: BrowserWindow | null = null;

function sendStatus(payload: UpdateStatusPayload): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update:status", payload);
  }
}

export function initUpdater(window: BrowserWindow, channel: UpdateChannel): void {
  mainWindow = window;

  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = channel === "beta";

  autoUpdater.on("checking-for-update", () => {
    sendStatus({ status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({ status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({
      status: "downloading",
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendStatus({
      status: "downloaded",
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    sendStatus({
      status: "error",
      message: error.message,
    });
  });
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(() => {
    // Startup check failures are silent — no network is not an error
  });
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((error) => {
    sendStatus({ status: "error", message: String(error) });
  });
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function setChannel(channel: UpdateChannel): void {
  saveChannel(channel);
  autoUpdater.allowPrerelease = channel === "beta";
}

export function getCurrentChannel(): UpdateChannel {
  return loadChannel();
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/desktop/src/main/auto-updater.ts
git commit -m "feat: add main process auto-updater service"
```

---

### Task 3: Register update IPC handlers in main process

**Files:**
- Modify: `packages/desktop/src/main/index.ts`

- [ ] **Step 1: Add import at the top of index.ts**

Add after the existing taxonomy import on line 10:

```ts
import { initUpdater, checkForUpdates as updaterCheckForUpdates, downloadUpdate, quitAndInstall, setChannel, getCurrentChannel } from "./auto-updater";
```

- [ ] **Step 2: Add IPC handlers before the window control handlers**

Add after line 113 (end of imports / before `// ==================== 窗口控制 IPC ====================`):

```ts
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
```

- [ ] **Step 3: Add startup update check in app.whenReady**

Modify the `app.whenReady()` block (around line 134). Replace:

```ts
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
```

With:

```ts
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
```

- [ ] **Step 4: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/main/index.ts
git commit -m "feat: register update IPC handlers and startup check"
```

---

### Task 4: Expose update API in preload bridge

**Files:**
- Modify: `packages/desktop/src/preload/index.ts`

- [ ] **Step 1: Replace preload/index.ts**

```ts
import { contextBridge, ipcRenderer } from "electron";
import { isElectronIpcChannel, type ElectronAPI, type UpdateChannel, type UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";

const electronAPI: ElectronAPI = {
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  startDeviceFlow: () => ipcRenderer.invoke("auth:startDeviceFlow"),
  signOut: () => ipcRenderer.invoke("auth:signOut"),
  reauthorize: () => ipcRenderer.invoke("auth:reauthorize"),
  listOnboardingRepositories: (input) => ipcRenderer.invoke("onboarding:listRepositories", input),
  validateOnboardingRepository: (input) => ipcRenderer.invoke("onboarding:validateRepository", input),

  // 通用 IPC 调用（带白名单验证）
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    if (!isElectronIpcChannel(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },

  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: UpdateStatusPayload) => callback(payload);
    ipcRenderer.on("update:status", handler);
    return () => {
      ipcRenderer.removeListener("update:status", handler);
    };
  },

  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  quitAndInstall: () => ipcRenderer.invoke("update:install"),
  setUpdateChannel: (channel: UpdateChannel) => ipcRenderer.invoke("update:set-channel", channel),
  getVersion: () => ipcRenderer.invoke("update:get-version"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/preload/index.ts
git commit -m "feat: expose update API in preload bridge"
```

---

### Task 5: Verify IPC channel contract

**Files:**
- Create: `packages/desktop/src/main/ipc-channel-contract.test.ts` (move from preload/__tests__ if existing)
- The existing test is at `packages/desktop/src/main/ipc-channel-contract.test.ts`

- [ ] **Step 1: Run existing contract test to see it fail with new channels**

```bash
pnpm --filter @hexo-cms/desktop test -- ipc-channel-contract
```

Expected: FAIL — the test will detect that `ELECTRON_IPC_CHANNELS` has new channels but main process doesn't handle them yet (or vice versa — wait, we already added handlers, so it should pass if the test path is right).

Let's check: the test reads `src/main/index.ts` relative to `process.cwd()`, which is the package root when running from the desktop package. Our handlers are in `index.ts`, and the channels are in the allowlist. This should pass now.

- [ ] **Step 2: Run the contract test**

```bash
pnpm --filter @hexo-cms/desktop test -- ipc-channel-contract
```

Expected: PASS — channels match.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/main/ipc-channel-contract.test.ts
git commit -m "test: verify update IPC channels in contract test"
```

---

### Task 6: Configure electron-builder.yml and package.json for publishing

**Files:**
- Modify: `packages/desktop/electron-builder.yml`
- Modify: `packages/desktop/package.json`

- [ ] **Step 1: Update publish config in electron-builder.yml**

Replace lines 40-43:

```yaml
publish:
  provider: github
  owner: your-github-username
  repo: hexo-cms
```

With:

```yaml
publish:
  provider: github
  owner: bijinfeng
  repo: hexo-cms
  releaseType: draft
```

- [ ] **Step 2: Add repository field to package.json**

Add after `"main": "out/main/index.js",` (line 6):

```json
"repository": {
  "type": "git",
  "url": "https://github.com/bijinfeng/hexo-cms.git"
},
```

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/electron-builder.yml packages/desktop/package.json
git commit -m "chore: configure electron-builder github publish with draft releases"
```

---

### Task 7: Create useUpdater hook

**Files:**
- Create: `packages/desktop/src/renderer/src/hooks/useUpdater.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useState, useEffect, useCallback } from "react";
import { getElectronAPI } from "@hexo-cms/ui";
import type { UpdateStatus, UpdateChannel, UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";

export interface UseUpdaterReturn {
  status: UpdateStatus;
  progress: number;
  version: string | null;
  error: string | null;
  channel: UpdateChannel;
  currentVersion: string;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  quitAndInstall: () => void;
  setChannel: (ch: UpdateChannel) => void;
}

export function useUpdater(): UseUpdaterReturn | null {
  const electronAPI = getElectronAPI();
  const isElectron = electronAPI !== null;

  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannelState] = useState<UpdateChannel>("stable");
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    if (!isElectron) return;

    electronAPI.getVersion().then((v) => {
      setCurrentVersion(v.version);
      setChannelState(v.channel);
    });

    const unsubscribe = electronAPI.onUpdateStatus((payload: UpdateStatusPayload) => {
      setStatus(payload.status);
      if (payload.version) setVersion(payload.version);
      if (payload.percent !== undefined) setProgress(payload.percent);
      if (payload.message) setError(payload.message);
    });

    return unsubscribe;
  }, []);

  const checkForUpdates = useCallback(() => {
    if (!isElectron) return;
    setError(null);
    electronAPI.checkForUpdates();
  }, [isElectron]);

  const download = useCallback(() => {
    if (!isElectron) return;
    electronAPI.downloadUpdate();
  }, [isElectron]);

  const quitAndInstall = useCallback(() => {
    if (!isElectron) return;
    electronAPI.quitAndInstall();
  }, [isElectron]);

  const handleSetChannel = useCallback(
    (ch: UpdateChannel) => {
      if (!isElectron) return;
      setChannelState(ch);
      electronAPI.setUpdateChannel(ch);
    },
    [isElectron],
  );

  if (!isElectron) return null;

  return {
    status,
    progress,
    version,
    error,
    channel,
    currentVersion,
    checkForUpdates,
    downloadUpdate: download,
    quitAndInstall,
    setChannel: handleSetChannel,
  };
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/src/hooks/useUpdater.ts
git commit -m "feat: add useUpdater hook for update state"
```

---

### Task 8: Create UpdateBanner component

**Files:**
- Create: `packages/desktop/src/renderer/src/components/UpdateBanner.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { ArrowDown, CheckCircle2, Loader2, AlertCircle, RotateCw } from "lucide-react";
import type { UseUpdaterReturn } from "../hooks/useUpdater";

interface UpdateBannerProps {
  updater: UseUpdaterReturn;
}

export function UpdateBanner({ updater }: UpdateBannerProps) {
  const { status, version, progress, error, downloadUpdate, quitAndInstall, checkForUpdates } = updater;

  if (status === "idle" || status === "up-to-date") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white shadow-md">
      {status === "checking" && (
        <span className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Checking for updates...
        </span>
      )}

      {status === "available" && (
        <span className="flex items-center gap-3">
          <span>New version {version} available</span>
          <button
            onClick={downloadUpdate}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <ArrowDown size={14} />
            Update Now
          </button>
        </span>
      )}

      {status === "downloading" && (
        <span className="flex items-center gap-3 w-full max-w-md">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          <span className="flex-shrink-0">Downloading {version}</span>
          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="flex-shrink-0 tabular-nums">{progress}%</span>
        </span>
      )}

      {status === "downloaded" && (
        <span className="flex items-center gap-2">
          <CheckCircle2 size={14} />
          {version} ready to install
          <button
            onClick={quitAndInstall}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <RotateCw size={14} />
            Restart Now
          </button>
        </span>
      )}

      {status === "error" && (
        <span className="flex items-center gap-3">
          <AlertCircle size={14} />
          <span>Update failed{error ? `: ${error}` : ""}</span>
          <button
            onClick={checkForUpdates}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
          >
            <RotateCw size={14} />
            Retry
          </button>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/src/components/UpdateBanner.tsx
git commit -m "feat: add UpdateBanner component"
```

---

### Task 9: Render UpdateBanner in __root.tsx

**Files:**
- Modify: `packages/desktop/src/renderer/src/routes/__root.tsx`

- [ ] **Step 1: Add import and render UpdateBanner**

Add import at top:

```tsx
import { UpdateBanner } from "../components/UpdateBanner";
import { useUpdater } from "../hooks/useUpdater";
```

In `RootComponent`, add after the `useState` lines (after line 24):

```tsx
const updater = useUpdater();
```

Add the UpdateBanner rendering right after the `guardPending` check, before the main return. Add it inside the authenticated/non-public route returns. The simplest approach: wrap the return content.

Replace the final return block (lines 82-94):

```tsx
  if (isPublicRoute || isSetupRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          <CMSLayout isElectron>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </CMSLayout>
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}
```

With:

```tsx
  if (isPublicRoute || isSetupRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

  return (
    <DataProviderProvider provider={desktopDataProvider}>
      <PluginProvider>
        <ErrorBoundary>
          {updater && <UpdateBanner updater={updater} />}
          <CMSLayout isElectron>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </CMSLayout>
        </ErrorBoundary>
      </PluginProvider>
    </DataProviderProvider>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat: render UpdateBanner in root layout"
```

---

### Task 10: Add update settings section to SettingsPage

**Files:**
- Modify: `packages/ui/src/pages/settings.tsx`
- Modify: `packages/desktop/src/renderer/src/routes/settings.tsx`

- [ ] **Step 1: Add `extraSections` prop to SettingsPage**

In `packages/ui/src/pages/settings.tsx`, add import for `React` (if not already implicitly available — check existing imports; `React` is used via JSX so it's available). Modify the interface and component:

Replace lines 46-50:

```ts
export interface SettingsPageProps {
  authClient?: AuthClient;
  initialSection?: string;
  onSignedOut?: () => void;
}
```

With:

```tsx
import type { ReactNode } from "react";

export interface SettingsSectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  render: () => ReactNode;
}

export interface SettingsPageProps {
  authClient?: AuthClient;
  initialSection?: string;
  onSignedOut?: () => void;
  extraSections?: SettingsSectionDef[];
}
```

Now modify the `settingsSections` usage to include extra sections. Replace lines 24-31:

```ts
const settingsSections = [
  { id: "site", label: "站点信息", icon: Globe },
  { id: "github", label: "GitHub 集成", icon: GithubIcon },
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "plugins", label: "插件管理", icon: Puzzle },
  { id: "security", label: "安全设置", icon: Shield },
];

const settingSectionIds = new Set(settingsSections.map((section) => section.id));
```

With:

```tsx
const baseSettingsSections = [
  { id: "site", label: "站点信息", icon: Globe },
  { id: "github", label: "GitHub 集成", icon: GithubIcon },
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "plugins", label: "插件管理", icon: Puzzle },
  { id: "security", label: "安全设置", icon: Shield },
];

function useMergedSections(extraSections?: SettingsSectionDef[]) {
  if (!extraSections || extraSections.length === 0) return baseSettingsSections;
  return [...baseSettingsSections, ...extraSections];
}
```

In the `SettingsPage` function, after line 52, modify to use `extraSections`:

```tsx
export function SettingsPage({ authClient, initialSection, onSignedOut, extraSections }: SettingsPageProps) {
  const sections = useMergedSections(extraSections);
  const sectionIds = new Set(sections.map((s) => s.id));

  function getInitialSettingsSection(): string {
    if (typeof window === "undefined") return "site";
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("section") ?? window.location.hash.replace(/^#/, "");
    return normalizeSettingsSection(requested);
  }

  function normalizeSettingsSection(value?: string | null): string {
    return value && sectionIds.has(value) ? value : "site";
  }

  const [activeSection, setActiveSection] = useState(() =>
    initialSection ? normalizeSettingsSection(initialSection) : getInitialSettingsSection(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection ? normalizeSettingsSection(initialSection) : getInitialSettingsSection());
  }, [initialSection, sections]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">站点设置</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            管理站点配置和集成
          </p>
        </div>
        <Button onClick={handleSave} variant={saved ? "success" : "default"}>
          {saved ? (
            <>
              <CheckCircle2 size={16} />
              已保存
            </>
          ) : (
            <>
              <Save size={16} />
              保存更改
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left ${
                    activeSection === section.id
                      ? "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {section.label}
                  {activeSection === section.id && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "site" && <SiteSettings />}
          {activeSection === "github" && <GitHubSettings authClient={authClient} onSignedOut={onSignedOut} />}
          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "notifications" && <NotificationSettings />}
          {activeSection === "plugins" && <PluginSettingsPanel />}
          {activeSection === "security" && <SecuritySettings />}
          {extraSections?.map((section) =>
            activeSection === section.id ? <section key={section.id}>{section.render()}</section> : null,
          )}
        </div>
      </div>
    </div>
  );
}
```

Note: You must remove the module-level `getInitialSettingsSection`, `normalizeSettingsSection`, `settingsSections`, and `settingSectionIds` from the top level (lines 24-44 in the original) since they're now inside the component.

- [ ] **Step 2: Add UpdatesSection component and wire into desktop settings route**

In `packages/desktop/src/renderer/src/routes/settings.tsx`, replace the entire file:

```tsx
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { SettingsPage, type SettingsSectionDef } from "@hexo-cms/ui/pages/settings";
import { desktopAuthClient } from "../lib/desktop-auth-client";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@hexo-cms/ui";
import { Button } from "@hexo-cms/ui";
import { useUpdater } from "../hooks/useUpdater";

function UpdatesSection() {
  const updater = useUpdater();
  if (!updater) return null;

  const { status, progress, version, error, channel, currentVersion, checkForUpdates, downloadUpdate, quitAndInstall, setChannel } = updater;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>版本信息</CardTitle>
          <p className="text-sm text-[var(--text-secondary)]">当前版本和更新设置</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">当前版本</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">v{currentVersion || "..."}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">更新通道</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "stable" | "beta")}
              className="text-sm px-2 py-1 rounded-md border border-[var(--border-base)] bg-[var(--bg-base)] text-[var(--text-primary)] cursor-pointer"
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button onClick={checkForUpdates} disabled={status === "checking" || status === "downloading"} className="w-full">
            <RefreshCw size={16} className={status === "checking" || status === "downloading" ? "animate-spin" : ""} />
            {status === "checking" ? "检查中..." : status === "downloading" ? "下载中..." : "检查更新"}
          </Button>

          {status === "available" && version && (
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--text-primary)]">发现新版本 v{version}</p>
              <Button onClick={downloadUpdate} variant="default" className="w-full">
                立即更新
              </Button>
            </div>
          )}

          {status === "downloading" && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-[var(--text-secondary)]">{progress}%</p>
            </div>
          )}

          {status === "downloaded" && (
            <Button onClick={quitAndInstall} variant="default" className="w-full">
              重启安装
            </Button>
          )}

          {status === "up-to-date" && (
            <p className="text-sm text-center text-[var(--text-secondary)]">已是最新版本</p>
          )}

          {status === "error" && (
            <div className="text-center space-y-2">
              <p className="text-sm text-red-500">更新失败{error ? `: ${error}` : ""}</p>
              <Button onClick={checkForUpdates} variant="ghost" className="w-full">
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const updatesSectionDef: SettingsSectionDef = {
  id: "updates",
  label: "自动更新",
  icon: RefreshCw,
  render: () => <UpdatesSection />,
};

function DesktopSettingsPage() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const section = getSearchValue(routerState.location.search, "section");
  return (
    <SettingsPage
      authClient={desktopAuthClient}
      initialSection={section}
      extraSections={[updatesSectionDef]}
      onSignedOut={() => navigate({ to: "/login", replace: true })}
    />
  );
}

export const Route = createFileRoute("/settings")({
  component: DesktopSettingsPage,
});

function getSearchValue(search: unknown, key: string): string | undefined {
  if (typeof search === "string") {
    return new URLSearchParams(search).get(key) ?? undefined;
  }
  if (search && typeof search === "object") {
    const value = (search as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}
```

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/pages/settings.tsx packages/desktop/src/renderer/src/routes/settings.tsx
git commit -m "feat: add update settings section with channel switching"
```

---

### Task 11: Write auto-updater unit test

**Files:**
- Create: `packages/desktop/src/main/__tests__/auto-updater.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();
const mockOn = vi.fn();
const mockCheckForUpdates = vi.fn();
const mockDownloadUpdate = vi.fn();
const mockQuitAndInstall = vi.fn();

vi.mock("electron-updater", () => ({
  autoUpdater: {
    get autoDownload() { return false; },
    set autoDownload(_v: boolean) {},
    get allowPrerelease() { return false; },
    set allowPrerelease(_v: boolean) {},
    on: mockOn,
    checkForUpdates: mockCheckForUpdates,
    downloadUpdate: mockDownloadUpdate,
    quitAndInstall: mockQuitAndInstall,
  },
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp/test-user-data"),
    getVersion: vi.fn(() => "0.0.1"),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock("../json-file-store", () => ({
  readJsonFile: vi.fn((_path: string, fallback: () => unknown) => fallback()),
  writeJsonFile: vi.fn(),
}));

describe("auto-updater", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("initializes with stable channel by default", async () => {
    const { initUpdater, getCurrentChannel } = await import("../auto-updater");

    expect(getCurrentChannel()).toBe("stable");
  });

  it("registers electron-updater event handlers on init", async () => {
    const { initUpdater } = await import("../auto-updater");
    const mockWindow = { webContents: { send: mockSend }, isDestroyed: () => false } as any;

    initUpdater(mockWindow, "stable");

    expect(mockOn).toHaveBeenCalledWith("checking-for-update", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-available", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-not-available", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("download-progress", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-downloaded", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("calls checkForUpdates and swallows errors", async () => {
    const { checkForUpdates } = await import("../auto-updater");
    mockCheckForUpdates.mockRejectedValueOnce(new Error("network error"));

    await expect(checkForUpdates()).resolves.toBeUndefined();
  });

  it("calls downloadUpdate and sends error on failure", async () => {
    const { initUpdater, downloadUpdate } = await import("../auto-updater");
    const mockWindow = { webContents: { send: mockSend }, isDestroyed: () => false } as any;
    initUpdater(mockWindow, "stable");

    mockDownloadUpdate.mockRejectedValueOnce(new Error("download failed"));

    await downloadUpdate();

    expect(mockSend).toHaveBeenCalledWith("update:status", expect.objectContaining({
      status: "error",
      message: expect.stringContaining("download failed"),
    }));
  });
});
```

- [ ] **Step 2: Run the test**

```bash
pnpm --filter @hexo-cms/desktop test -- auto-updater
```

Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/main/__tests__/auto-updater.test.ts
git commit -m "test: add auto-updater unit tests"
```

---

### Task 12: Create GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:
    inputs:
      version:
        description: "Version (e.g. 1.0.0)"
        required: true
        type: string
      prerelease:
        description: "Pre-release?"
        required: false
        default: false
        type: boolean

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build desktop
        run: pnpm build:desktop:compile

      - name: Publish to GitHub Releases
        run: npx electron-builder --publish always
        working-directory: packages/desktop
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_IDENTITY_AUTO_DISCOVERY: "false"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow for electron-builder publish"
```

---

### Task 13: Final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full type-check across all packages**

```bash
pnpm type-check
```

Expected: No errors across all packages.

- [ ] **Step 2: Run all desktop tests**

```bash
pnpm --filter @hexo-cms/desktop test
```

Expected: All tests pass, including contract test and auto-updater test.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No errors.

- [ ] **Step 4: Verify build compiles**

```bash
pnpm --filter @hexo-cms/desktop build:desktop:compile
```

Wait — the script is named differently across packages. Check the root package.json. Actually the desktop package has `"build": "electron-vite build && electron-builder"` and the root has `"build:desktop:compile": "..."`. Let's use:

```bash
cd packages/desktop && npx electron-vite build
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Final commit if needed**

```bash
git status
# If no changes, done.
# If lint/type fixes were applied, commit them.
```
