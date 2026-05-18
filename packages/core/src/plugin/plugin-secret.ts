import type { PluginPermission, PluginSecretAPI, PluginSecretStoreValue } from "./types";
import { assertNonEmptyString, cloneValue } from "../utils";
import { MemoryStore } from "./stores";

export interface PluginSecretStore {
  load(): PluginSecretStoreValue | Promise<PluginSecretStoreValue>;
  save(value: PluginSecretStoreValue): void | Promise<void>;
  has?(pluginId: string, key: string): boolean | Promise<boolean>;
  set?(pluginId: string, key: string, value: string): void | Promise<void>;
  delete?(pluginId: string, key: string): void | Promise<void>;
}

export class MemoryPluginSecretStore extends MemoryStore<PluginSecretStoreValue> {
  load(): PluginSecretStoreValue { return cloneValue(super.load()); }
  save(value: PluginSecretStoreValue): void { super.save(cloneValue(value)); }
}

export function createPluginSecretAPI(
  pluginId: string,
  store: PluginSecretStore,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
): PluginSecretAPI {
  return {
    async has(key: string): Promise<boolean> {
      assertNonEmptyString(key, "Plugin secret key");
      permissionBroker.assert(pluginId, "pluginSecret.read", "plugin.secret.has");
      if (store.has) return store.has(pluginId, key);
      const current = await store.load();
      return typeof current[pluginId]?.[key] === "string";
    },

    async set(key: string, value: string): Promise<void> {
      assertNonEmptyString(key, "Plugin secret key");
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("Plugin secret value must be a non-empty string");
      }
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
      assertNonEmptyString(key, "Plugin secret key");
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
