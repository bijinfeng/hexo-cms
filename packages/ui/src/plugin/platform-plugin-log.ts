import { BrowserPluginLogStore, type PluginLogStore, type PluginLogStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";
import { DesktopBackedPluginStore, WebBackedPluginStore } from "./platform-sync-store";

export class WebPluginLogStore extends WebBackedPluginStore<PluginLogStoreValue> implements PluginLogStore {
  constructor(endpoint = "/api/plugin/logs") {
    super({ endpoint, payloadKey: "logs", fallback: new BrowserPluginLogStore() });
  }
}

export class DesktopPluginLogStore extends DesktopBackedPluginStore<PluginLogStoreValue> implements PluginLogStore {
  constructor() {
    super({
      loadChannel: "plugin-logs:load",
      saveChannel: "plugin-logs:save",
      fallback: new BrowserPluginLogStore(),
    });
  }
}

export function createPlatformPluginLogStore(): PluginLogStore {
  if (typeof window === "undefined") return new BrowserPluginLogStore();
  if (getElectronAPI()) return new DesktopPluginLogStore();
  if (typeof fetch === "function") return new WebPluginLogStore();
  return new BrowserPluginLogStore();
}
