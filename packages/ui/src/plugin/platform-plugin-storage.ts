import { BrowserPluginStorageStore, type PluginStorageStore, type PluginStorageStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

export class WebPluginStorageStore implements PluginStorageStore {
  constructor(private readonly endpoint = "/api/plugin/storage") {}

  async load(): Promise<PluginStorageStoreValue> {
    const response = await fetch(this.endpoint);
    if (!response.ok) return {};
    const data = (await response.json()) as { storage?: PluginStorageStoreValue };
    return data.storage ?? {};
  }

  async save(value: PluginStorageStoreValue): Promise<void> {
    await fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage: value }),
    });
  }
}

export class DesktopPluginStorageStore implements PluginStorageStore {
  async load(): Promise<PluginStorageStoreValue> {
    return getElectronAPI()?.invoke<PluginStorageStoreValue>("plugin-storage:load") ?? {};
  }

  async save(value: PluginStorageStoreValue): Promise<void> {
    await getElectronAPI()?.invoke("plugin-storage:save", value);
  }
}

export function createPlatformPluginStorageStore(): PluginStorageStore {
  if (typeof window === "undefined") return new BrowserPluginStorageStore();
  if (getElectronAPI()) return new DesktopPluginStorageStore();
  if (typeof fetch === "function") return new WebPluginStorageStore();
  return new BrowserPluginStorageStore();
}
