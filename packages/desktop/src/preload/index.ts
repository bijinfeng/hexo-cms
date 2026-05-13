import { contextBridge, ipcRenderer } from "electron";
import { isElectronIpcChannel, type ElectronAPI } from "@hexo-cms/ui/types/electron-api";

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
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
