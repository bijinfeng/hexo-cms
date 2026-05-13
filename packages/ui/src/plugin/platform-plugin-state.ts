import { BrowserPluginStateStore, type PluginStateStore, type PluginStateStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";
import { DesktopBackedPluginStore, WebBackedPluginStore } from "./platform-sync-store";

export class WebPluginStateStore extends WebBackedPluginStore<PluginStateStoreValue> implements PluginStateStore {
  constructor(endpoint = "/api/plugin/state") {
    super({ endpoint, payloadKey: "state", fallback: new BrowserPluginStateStore() });
  }
}

export class DesktopPluginStateStore extends DesktopBackedPluginStore<PluginStateStoreValue> implements PluginStateStore {
  constructor() {
    super({
      loadChannel: "plugin-state:load",
      saveChannel: "plugin-state:save",
      fallback: new BrowserPluginStateStore(),
    });
  }
}

export function createPlatformPluginStateStore(): PluginStateStore {
  if (typeof window === "undefined") return new BrowserPluginStateStore();
  if (getElectronAPI()) return new DesktopPluginStateStore();
  if (typeof fetch === "function") return new WebPluginStateStore();
  return new BrowserPluginStateStore();
}
