import { BrowserPluginConfigStore, type PluginConfigStore, type PluginConfigStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";
import { DesktopBackedPluginStore, WebBackedPluginStore } from "./platform-sync-store";

export class WebPluginConfigStore extends WebBackedPluginStore<PluginConfigStoreValue> implements PluginConfigStore {
  constructor(endpoint = "/api/plugin/config") {
    super({ endpoint, payloadKey: "config", fallback: new BrowserPluginConfigStore() });
  }
}

export class DesktopPluginConfigStore extends DesktopBackedPluginStore<PluginConfigStoreValue> implements PluginConfigStore {
  constructor() {
    super({
      loadChannel: "plugin-config:load",
      saveChannel: "plugin-config:save",
      fallback: new BrowserPluginConfigStore(),
    });
  }
}

export function createPlatformPluginConfigStore(): PluginConfigStore {
  if (typeof window === "undefined") return new BrowserPluginConfigStore();
  if (getElectronAPI()) return new DesktopPluginConfigStore();
  if (typeof fetch === "function") return new WebPluginConfigStore();
  return new BrowserPluginConfigStore();
}
