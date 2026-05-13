import { BrowserPluginLogStore, type PluginLogStore, type PluginLogStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

export class WebPluginLogStore implements PluginLogStore {
  private fallback = new BrowserPluginLogStore();
  private cache: PluginLogStoreValue;
  private loaded = false;

  constructor(private readonly endpoint = "/api/plugin/logs") {
    this.cache = this.fallback.load();
  }

  load(): PluginLogStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromServer();
    }
    return { ...this.cache };
  }

  save(value: PluginLogStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    this.persistToServer(value);
  }

  private fetchFromServer(): void {
    fetch(this.endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { logs?: PluginLogStoreValue } | null) => {
        if (data?.logs && Object.keys(data.logs).length > 0) {
          this.cache = data.logs;
          this.fallback.save(data.logs);
        }
      })
      .catch(() => {});
  }

  private persistToServer(value: PluginLogStoreValue): void {
    fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs: value }),
    }).catch(() => {});
  }
}

export class DesktopPluginLogStore implements PluginLogStore {
  private fallback = new BrowserPluginLogStore();
  private cache: PluginLogStoreValue;
  private loaded = false;

  constructor() {
    this.cache = this.fallback.load();
  }

  load(): PluginLogStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromIPC();
    }
    return { ...this.cache };
  }

  save(value: PluginLogStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    getElectronAPI()?.invoke("plugin-logs:save", value).catch(() => {});
  }

  private fetchFromIPC(): void {
    getElectronAPI()
      ?.invoke<PluginLogStoreValue>("plugin-logs:load")
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          this.cache = data;
          this.fallback.save(data);
        }
      })
      .catch(() => {});
  }
}

export function createPlatformPluginLogStore(): PluginLogStore {
  if (typeof window === "undefined") return new BrowserPluginLogStore();
  if (getElectronAPI()) return new DesktopPluginLogStore();
  if (typeof fetch === "function") return new WebPluginLogStore();
  return new BrowserPluginLogStore();
}
