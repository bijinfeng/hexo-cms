import { join } from "path";
import type {
  GitHubConfig,
  PluginConfigStoreValue,
  PluginLogStoreValue,
  PluginSecretStoreValue,
  PluginStateStoreValue,
  PluginStorageStoreValue,
} from "@hexo-cms/core";
import { createJsonFileStore } from "./json-file-store";

const PLUGIN_SECRET_ACCOUNT = "plugin-secrets";
const DEFAULT_MAX_AUDIT_ENTRIES = 200;

export type PluginSecretMutation =
  | { op: "set"; pluginId: string; key: string; value: string }
  | { op: "delete"; pluginId: string; key: string };

export interface PluginNetworkAuditEntryInput {
  pluginId: string;
  url: string;
  method: string;
  status: number;
  error?: string;
}

export interface PluginNetworkAuditEntry extends PluginNetworkAuditEntryInput {
  createdAt: string;
}

export interface KeychainAdapter {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface DesktopPersistence {
  loadConfig(): GitHubConfig | null;
  saveConfig(config: GitHubConfig): void;
  loadPluginStorage(): PluginStorageStoreValue;
  savePluginStorage(value: PluginStorageStoreValue): void;
  loadPluginSecrets(): Promise<PluginSecretStoreValue>;
  savePluginSecrets(value: PluginSecretStoreValue): Promise<void>;
  hasPluginSecret(pluginId: string, key: string): Promise<boolean>;
  mutatePluginSecret(mutation: PluginSecretMutation | null | undefined): Promise<void>;
  loadPluginState(): PluginStateStoreValue;
  savePluginState(value: PluginStateStoreValue): void;
  loadPluginConfig(): PluginConfigStoreValue;
  savePluginConfig(value: PluginConfigStoreValue): void;
  loadPluginLogs(): PluginLogStoreValue;
  savePluginLogs(value: PluginLogStoreValue): void;
  appendPluginNetworkAudit(entry: PluginNetworkAuditEntryInput): void;
  listPluginNetworkAudit(limit?: number): PluginNetworkAuditEntry[];
}

export interface DesktopPersistenceOptions {
  getUserDataPath(): string;
  keytarService: string;
  keychain?: () => Promise<KeychainAdapter>;
  now?: () => Date;
  maxAuditEntries?: number;
}

export function createDesktopPersistence({
  getUserDataPath,
  keytarService,
  keychain = loadDefaultKeychain,
  now = () => new Date(),
  maxAuditEntries = DEFAULT_MAX_AUDIT_ENTRIES,
}: DesktopPersistenceOptions): DesktopPersistence {
  const getUserDataFilePath = (...segments: string[]) => join(getUserDataPath(), ...segments);
  const getPluginFilePath = (fileName: string) => getUserDataFilePath("plugins", fileName);

  const configStore = createJsonFileStore<GitHubConfig | null>(
    () => getUserDataFilePath("github-config.json"),
    () => null,
  );
  const pluginStorageStore = createJsonFileStore<PluginStorageStoreValue>(
    () => getPluginFilePath("storage.json"),
    () => ({}),
  );
  const pluginStateStore = createJsonFileStore<PluginStateStoreValue>(
    () => getPluginFilePath("state.json"),
    () => ({}),
  );
  const pluginConfigStore = createJsonFileStore<PluginConfigStoreValue>(
    () => getPluginFilePath("config.json"),
    () => ({}),
  );
  const pluginLogStore = createJsonFileStore<PluginLogStoreValue>(
    () => getPluginFilePath("logs.json"),
    () => ({}),
  );
  const pluginNetworkAuditStore = createJsonFileStore<PluginNetworkAuditEntry[]>(
    () => getPluginFilePath("network-audit.json"),
    () => [],
  );

  async function loadPluginSecrets(): Promise<PluginSecretStoreValue> {
    const value = await (await keychain()).getPassword(keytarService, PLUGIN_SECRET_ACCOUNT);
    if (!value) return {};

    try {
      return JSON.parse(value) as PluginSecretStoreValue;
    } catch {
      return {};
    }
  }

  async function savePluginSecrets(value: PluginSecretStoreValue): Promise<void> {
    await (await keychain()).setPassword(keytarService, PLUGIN_SECRET_ACCOUNT, JSON.stringify(value));
  }

  return {
    loadConfig: () => configStore.load(),
    saveConfig: (config) => configStore.save(config),
    loadPluginStorage: () => pluginStorageStore.load(),
    savePluginStorage: (value) => pluginStorageStore.save(value),
    loadPluginSecrets,
    savePluginSecrets,
    async hasPluginSecret(pluginId, key) {
      if (!pluginId || !key) return false;
      const secrets = await loadPluginSecrets();
      return typeof secrets[pluginId]?.[key] === "string";
    },
    async mutatePluginSecret(mutation) {
      if (!mutation || !mutation.pluginId || !mutation.key) throw new Error("Invalid secret target");
      const secrets = await loadPluginSecrets();
      const namespace = { ...(secrets[mutation.pluginId] ?? {}) };

      if (mutation.op === "set") {
        if (typeof mutation.value !== "string") throw new Error("Invalid secret value");
        namespace[mutation.key] = mutation.value;
      } else if (mutation.op === "delete") {
        delete namespace[mutation.key];
      } else {
        throw new Error("Invalid secret operation");
      }

      await savePluginSecrets({ ...secrets, [mutation.pluginId]: namespace });
    },
    loadPluginState: () => pluginStateStore.load(),
    savePluginState: (value) => pluginStateStore.save(value),
    loadPluginConfig: () => pluginConfigStore.load(),
    savePluginConfig: (value) => pluginConfigStore.save(value),
    loadPluginLogs: () => pluginLogStore.load(),
    savePluginLogs: (value) => pluginLogStore.save(value),
    appendPluginNetworkAudit(entry) {
      const entries = pluginNetworkAuditStore.load();
      entries.unshift({ ...entry, createdAt: now().toISOString() });
      pluginNetworkAuditStore.save(entries.slice(0, maxAuditEntries));
    },
    listPluginNetworkAudit(limit = 50) {
      const safeLimit = typeof limit === "number" && limit > 0 ? limit : 50;
      return pluginNetworkAuditStore.load().slice(0, safeLimit);
    },
  };
}

async function loadDefaultKeychain(): Promise<KeychainAdapter> {
  const keytar = await import("keytar");
  return keytar.default;
}
