import type { ElectronAPI } from "../types/electron-api";

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  return window.electronAPI ?? null;
}

export function requireElectronAPI(): ElectronAPI {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    throw new Error("Electron API is not available");
  }
  return electronAPI;
}
