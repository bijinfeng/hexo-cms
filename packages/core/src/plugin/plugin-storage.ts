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

export class MemoryPluginStorageStore implements PluginStorageStore {
  constructor(private value: PluginStorageStoreValue = {}) {}

  load(): PluginStorageStoreValue {
    return cloneStorageValue(this.value);
  }

  save(value: PluginStorageStoreValue): void {
    this.value = cloneStorageValue(value);
  }
}

export class BrowserPluginStorageStore implements PluginStorageStore {
  constructor(private readonly key = "hexo-cms:plugin-storage") {}

  load(): PluginStorageStoreValue {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(value: PluginStorageStoreValue): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}

export function createPluginStorageAPI(
  pluginId: string,
  store: PluginStorageStore,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
): PluginStorageAPI {
  return {
    async get<T extends PluginStorageJsonValue>(key: string): Promise<T | undefined> {
      assertStorageKey(key);
      permissionBroker.assert(pluginId, "pluginStorage.read", "plugin.storage.get");
      const current = await store.load();
      return current[pluginId]?.[key] as T | undefined;
    },

    async set<T extends PluginStorageJsonValue>(key: string, value: T): Promise<void> {
      assertStorageKey(key);
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
      assertStorageKey(key);
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

function assertStorageKey(key: string): void {
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error("Plugin storage key must be a non-empty string");
  }
}

function cloneStorageValue(value: PluginStorageStoreValue): PluginStorageStoreValue {
  return JSON.parse(JSON.stringify(value)) as PluginStorageStoreValue;
}
