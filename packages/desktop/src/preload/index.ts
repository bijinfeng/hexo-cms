import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Token 管理
  getToken: (): Promise<string | null> => ipcRenderer.invoke("get-token"),
  setToken: (token: string): Promise<boolean> => ipcRenderer.invoke("set-token", token),
  deleteToken: (): Promise<boolean> => ipcRenderer.invoke("delete-token"),

  // 通用 IPC 调用
  invoke: (channel: string, ...args: any[]): Promise<any> => ipcRenderer.invoke(channel, ...args),
});
