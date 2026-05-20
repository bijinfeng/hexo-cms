import { assertNonEmptyString, cloneValue } from "../utils";
import { BrowserJsonStore, MemoryStore } from "./stores";
import type {
  PluginPermission,
  PluginStorageAPI,
  PluginStorageJsonValue,
  PluginStorageStoreValue,
} from "./types";

export interface PluginStorageStore {
  load(): PluginStorageStoreValue | Promise<PluginStorageStoreValue>;
  save(value: PluginStorageStoreValue): void | Promise<void>;
}

export class MemoryPluginStorageStore extends MemoryStore<PluginStorageStoreValue> {
  load(): PluginStorageStoreValue {
    return cloneValue(super.load());
  }
  save(value: PluginStorageStoreValue): void {
    super.save(cloneValue(value));
  }
}

export class BrowserPluginStorageStore
  extends BrowserJsonStore<PluginStorageStoreValue>
  implements PluginStorageStore
{
  constructor(key = "hexo-cms:plugin-storage") {
    super(key);
  }
}

export function createPluginStorageAPI(
  pluginId: string,
  store: PluginStorageStore,
  permissionBroker: {
    assert(pluginId: string, permission: PluginPermission, operation: string): void;
  },
): PluginStorageAPI {
  return {
    async get<T extends PluginStorageJsonValue>(key: string): Promise<T | undefined> {
      assertNonEmptyString(key, "Plugin storage key");
      permissionBroker.assert(pluginId, "pluginStorage.read", "plugin.storage.get");
      const current = await store.load();
      return current[pluginId]?.[key] as T | undefined;
    },

    async set<T extends PluginStorageJsonValue>(key: string, value: T): Promise<void> {
      assertNonEmptyString(key, "Plugin storage key");
      permissionBroker.assert(pluginId, "pluginStorage.write", "plugin.storage.set");
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
      assertNonEmptyString(key, "Plugin storage key");
      permissionBroker.assert(pluginId, "pluginStorage.write", "plugin.storage.delete");
      const current = await store.load();
      const pluginStorage = { ...(current[pluginId] ?? {}) };
      delete pluginStorage[key];
      await store.save({
        ...current,
        [pluginId]: pluginStorage,
      });
    },

    async keys(): Promise<string[]> {
      permissionBroker.assert(pluginId, "pluginStorage.read", "plugin.storage.keys");
      const current = await store.load();
      return Object.keys(current[pluginId] ?? {}).sort((a, b) => a.localeCompare(b));
    },
  };
}
