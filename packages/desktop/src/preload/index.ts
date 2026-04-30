import { contextBridge, ipcRenderer } from "electron";

// IPC 通道白名单（安全限制）
const ALLOWED_CHANNELS = [
  "get-token",
  "set-token",
  "delete-token",
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
];

contextBridge.exposeInMainWorld("electronAPI", {
  // Token 管理
  getToken: (): Promise<string | null> => ipcRenderer.invoke("get-token"),
  setToken: (token: string): Promise<boolean> => ipcRenderer.invoke("set-token", token),
  deleteToken: (): Promise<boolean> => ipcRenderer.invoke("delete-token"),

  // 通用 IPC 调用（带白名单验证）
  invoke: (channel: string, ...args: any[]): Promise<any> => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
});
