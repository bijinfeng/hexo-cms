import { contextBridge, ipcRenderer } from "electron";
import { isElectronIpcChannel, type ElectronAPI, type UpdateChannel, type UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";

const electronAPI: ElectronAPI = {
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  startDeviceFlow: () => ipcRenderer.invoke("auth:startDeviceFlow"),
  signOut: () => ipcRenderer.invoke("auth:signOut"),
  reauthorize: () => ipcRenderer.invoke("auth:reauthorize"),
  listOnboardingRepositories: (input) => ipcRenderer.invoke("onboarding:listRepositories", input),
  validateOnboardingRepository: (input) => ipcRenderer.invoke("onboarding:validateRepository", input),

  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
    if (!isElectronIpcChannel(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args) as Promise<T>;
  },

  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => {
    const handler = (_event: unknown, payload: UpdateStatusPayload) => callback(payload);
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
