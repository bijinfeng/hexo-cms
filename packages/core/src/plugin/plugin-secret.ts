import type { PluginPermission, PluginSecretAPI, PluginSecretStoreValue } from "./types";

export interface PluginSecretStore {
  load(): PluginSecretStoreValue | Promise<PluginSecretStoreValue>;
  save(value: PluginSecretStoreValue): void | Promise<void>;
  has?(pluginId: string, key: string): boolean | Promise<boolean>;
  set?(pluginId: string, key: string, value: string): void | Promise<void>;
  delete?(pluginId: string, key: string): void | Promise<void>;
}

export class MemoryPluginSecretStore implements PluginSecretStore {
  constructor(private value: PluginSecretStoreValue = {}) {}

  load(): PluginSecretStoreValue {
    return cloneSecretValue(this.value);
  }

  save(value: PluginSecretStoreValue): void {
    this.value = cloneSecretValue(value);
  }
}

export function createPluginSecretAPI(
  pluginId: string,
  store: PluginSecretStore,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
): PluginSecretAPI {
  return {
    async has(key: string): Promise<boolean> {
      assertSecretKey(key);
      permissionBroker.assert(pluginId, "pluginSecret.read", "plugin.secret.has");
      if (store.has) return store.has(pluginId, key);
      const current = await store.load();
      return typeof current[pluginId]?.[key] === "string";
    },

    async set(key: string, value: string): Promise<void> {
      assertSecretKey(key);
      assertSecretValue(value);
      permissionBroker.assert(pluginId, "pluginSecret.write", "plugin.secret.set");
      if (store.set) {
        await store.set(pluginId, key, value);
        return;
      }
      const current = await store.load();
      await store.save({
        ...current,
        [pluginId]: {
          ...(current[pluginId] ?? {}),
          [key]: value,
        },
      });
    },

    async delete(key: string): Promise<void> {
      assertSecretKey(key);
      permissionBroker.assert(pluginId, "pluginSecret.write", "plugin.secret.delete");
      if (store.delete) {
        await store.delete(pluginId, key);
        return;
      }
      const current = await store.load();
      const pluginSecrets = { ...(current[pluginId] ?? {}) };
      delete pluginSecrets[key];
      await store.save({
        ...current,
        [pluginId]: pluginSecrets,
      });
    },
  };
}

function assertSecretKey(key: string): void {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Plugin secret key must be a non-empty string");
  }
}

function assertSecretValue(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Plugin secret value must be a non-empty string");
  }
}

function cloneSecretValue(value: PluginSecretStoreValue): PluginSecretStoreValue {
  return JSON.parse(JSON.stringify(value)) as PluginSecretStoreValue;
}
