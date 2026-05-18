import { MemoryPluginSecretStore, type PluginSecretStore, type PluginSecretStoreValue } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

type SecretOperation =
  | { op: "has"; pluginId: string; key: string }
  | { op: "set"; pluginId: string; key: string; value: string }
  | { op: "delete"; pluginId: string; key: string };

export class WebPluginSecretStore implements PluginSecretStore {
  constructor(private readonly endpoint = "/api/plugin/secrets") {}

  async load(): Promise<PluginSecretStoreValue> {
    return {};
  }

  async save(value: PluginSecretStoreValue): Promise<void> {
    const entries = Object.entries(value);
    if (entries.length === 0) return;
    for (const [pluginId, namespace] of entries) {
      for (const [key, secret] of Object.entries(namespace)) {
        if (typeof secret !== "string" || secret.length === 0) continue;
        await this.set(pluginId, key, secret);
      }
    }
  }

  async set(pluginId: string, key: string, value: string): Promise<void> {
    await fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "set", pluginId, key, value } satisfies SecretOperation),
    });
  }

  async delete(pluginId: string, key: string): Promise<void> {
    await fetch(this.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", pluginId, key } satisfies SecretOperation),
    });
  }

  async has(pluginId: string, key: string): Promise<boolean> {
    const response = await fetch(`${this.endpoint}?pluginId=${encodeURIComponent(pluginId)}&key=${encodeURIComponent(key)}`);
    if (!response.ok) return false;
    const data = (await response.json()) as { configured?: boolean };
    return data.configured === true;
  }
}

export class DesktopPluginSecretStore implements PluginSecretStore {
  async load(): Promise<PluginSecretStoreValue> {
    return {};
  }

  async save(value: PluginSecretStoreValue): Promise<void> {
    const entries = Object.entries(value);
    if (entries.length === 0) return;
    for (const [pluginId, namespace] of entries) {
      for (const [key, secret] of Object.entries(namespace)) {
        if (typeof secret !== "string" || secret.length === 0) continue;
        await this.set(pluginId, key, secret);
      }
    }
  }

  async set(pluginId: string, key: string, value: string): Promise<void> {
    await getElectronAPI()?.invoke("plugin-secret:mutate", { op: "set", pluginId, key, value } satisfies SecretOperation);
  }

  async delete(pluginId: string, key: string): Promise<void> {
    await getElectronAPI()?.invoke("plugin-secret:mutate", { op: "delete", pluginId, key } satisfies SecretOperation);
  }

  async has(pluginId: string, key: string): Promise<boolean> {
    return getElectronAPI()?.invoke<boolean>("plugin-secret:has", { pluginId, key }) ?? false;
  }
}

export function createPlatformPluginSecretStore(): PluginSecretStore {
  if (typeof window === "undefined") return new MemoryPluginSecretStore();
  if (getElectronAPI()) return new DesktopPluginSecretStore();
  if (typeof fetch === "function") return new WebPluginSecretStore();
  return new MemoryPluginSecretStore();
}
