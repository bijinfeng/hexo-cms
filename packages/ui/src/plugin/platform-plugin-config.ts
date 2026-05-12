import { BrowserPluginConfigStore, type PluginConfigStore, type PluginConfigStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

export class WebPluginConfigStore implements PluginConfigStore {
  private fallback = new BrowserPluginConfigStore();
  private cache: PluginConfigStoreValue;
  private loaded = false;

  constructor(private readonly endpoint = "/api/plugin/config") {
    this.cache = this.fallback.load();
  }

  load(): PluginConfigStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromServer();
    }
    return { ...this.cache };
  }

  save(value: PluginConfigStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    this.persistToServer(value);
  }

  private fetchFromServer(): void {
    fetch(this.endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { config?: PluginConfigStoreValue } | null) => {
        if (data?.config && Object.keys(data.config).length > 0) {
          this.cache = data.config;
          this.fallback.save(data.config);
        }
      })
      .catch(() => {});
  }

  private persistToServer(value: PluginConfigStoreValue): void {
    fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: value }),
    }).catch(() => {});
  }
}

export class DesktopPluginConfigStore implements PluginConfigStore {
  private fallback = new BrowserPluginConfigStore();
  private cache: PluginConfigStoreValue;
  private loaded = false;

  constructor() {
    this.cache = this.fallback.load();
  }

  load(): PluginConfigStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromIPC();
    }
    return { ...this.cache };
  }

  save(value: PluginConfigStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    getElectronAPI()?.invoke("plugin-config:save", value).catch(() => {});
  }

  private fetchFromIPC(): void {
    getElectronAPI()
      ?.invoke<PluginConfigStoreValue>("plugin-config:load")
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          this.cache = data;
          this.fallback.save(data);
        }
      })
      .catch(() => {});
  }
}

export function createPlatformPluginConfigStore(): PluginConfigStore {
  if (typeof window === "undefined") return new BrowserPluginConfigStore();
  if (getElectronAPI()) return new DesktopPluginConfigStore();
  if (typeof fetch === "function") return new WebPluginConfigStore();
  return new BrowserPluginConfigStore();
}
