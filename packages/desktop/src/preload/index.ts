import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getToken: (): Promise<string | null> => ipcRenderer.invoke("get-token"),
  setToken: (token: string): Promise<boolean> => ipcRenderer.invoke("set-token", token),
  deleteToken: (): Promise<boolean> => ipcRenderer.invoke("delete-token"),
});
