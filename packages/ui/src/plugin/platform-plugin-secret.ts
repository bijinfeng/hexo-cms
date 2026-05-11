import { MemoryPluginSecretStore, type PluginSecretStore, type PluginSecretStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

export class WebPluginSecretStore implements PluginSecretStore {
  constructor(private readonly endpoint = "/api/plugin/secrets") {}

  async load(): Promise<PluginSecretStoreValue> {
    const response = await fetch(this.endpoint);
    if (!response.ok) return {};
    const data = (await response.json()) as { secrets?: PluginSecretStoreValue };
    return data.secrets ?? {};
  }

  async save(value: PluginSecretStoreValue): Promise<void> {
    await fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secrets: value }),
    });
  }
}

export class DesktopPluginSecretStore implements PluginSecretStore {
  async load(): Promise<PluginSecretStoreValue> {
    return getElectronAPI()?.invoke<PluginSecretStoreValue>("plugin-secret:load") ?? {};
  }

  async save(value: PluginSecretStoreValue): Promise<void> {
    await getElectronAPI()?.invoke("plugin-secret:save", value);
  }
}

export function createPlatformPluginSecretStore(): PluginSecretStore {
  if (typeof window === "undefined") return new MemoryPluginSecretStore();
  if (getElectronAPI()) return new DesktopPluginSecretStore();
  if (typeof fetch === "function") return new WebPluginSecretStore();
  return new MemoryPluginSecretStore();
}
