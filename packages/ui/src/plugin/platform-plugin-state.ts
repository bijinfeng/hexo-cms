import { BrowserPluginStateStore, type PluginStateStore, type PluginStateStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

export class WebPluginStateStore implements PluginStateStore {
  private fallback = new BrowserPluginStateStore();
  private cache: PluginStateStoreValue;
  private loaded = false;

  constructor(private readonly endpoint = "/api/plugin/state") {
    this.cache = this.fallback.load();
  }

  load(): PluginStateStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromServer();
    }
    return { ...this.cache };
  }

  save(value: PluginStateStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    this.persistToServer(value);
  }

  private fetchFromServer(): void {
    fetch(this.endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { state?: PluginStateStoreValue } | null) => {
        if (data?.state && Object.keys(data.state).length > 0) {
          this.cache = data.state;
          this.fallback.save(data.state);
        }
      })
      .catch(() => {});
  }

  private persistToServer(value: PluginStateStoreValue): void {
    fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: value }),
    }).catch(() => {});
  }
}

export class DesktopPluginStateStore implements PluginStateStore {
  private fallback = new BrowserPluginStateStore();
  private cache: PluginStateStoreValue;
  private loaded = false;

  constructor() {
    this.cache = this.fallback.load();
  }

  load(): PluginStateStoreValue {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromIPC();
    }
    return { ...this.cache };
  }

  save(value: PluginStateStoreValue): void {
    this.cache = { ...value };
    this.fallback.save(value);
    getElectronAPI()?.invoke("plugin-state:save", value).catch(() => {});
  }

  private fetchFromIPC(): void {
    getElectronAPI()
      ?.invoke<PluginStateStoreValue>("plugin-state:load")
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          this.cache = data;
          this.fallback.save(data);
        }
      })
      .catch(() => {});
  }
}

export function createPlatformPluginStateStore(): PluginStateStore {
  if (typeof window === "undefined") return new BrowserPluginStateStore();
  if (getElectronAPI()) return new DesktopPluginStateStore();
  if (typeof fetch === "function") return new WebPluginStateStore();
  return new BrowserPluginStateStore();
}
