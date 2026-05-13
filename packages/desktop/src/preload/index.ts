import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "@hexo-cms/ui/types/electron-api";

// IPC 通道白名单（安全限制）
const ALLOWED_CHANNELS = [
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
  "window:minimize",
  "window:maximize",
  "window:unmaximize",
  "window:close",
  "window:isMaximized",
];

const electronAPI: ElectronAPI = {
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  startDeviceFlow: () => ipcRenderer.invoke("auth:startDeviceFlow"),
  signOut: () => ipcRenderer.invoke("auth:signOut"),
  reauthorize: () => ipcRenderer.invoke("auth:reauthorize"),
  listOnboardingRepositories: (input) => ipcRenderer.invoke("onboarding:listRepositories", input),
  validateOnboardingRepository: (input) => ipcRenderer.invoke("onboarding:validateRepository", input),

  // 通用 IPC 调用（带白名单验证）
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
