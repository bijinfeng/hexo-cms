import { PluginNotFoundError } from "./errors";
import { CommandRegistry } from "./command-registry";
import { createPluginEventAPI, EventBus } from "./event-bus";
import { ExtensionRegistry } from "./extension-registry";
import { validatePluginManifests } from "./manifest";
import { PermissionBroker } from "./permissions";
import { createPluginStorageAPI, MemoryPluginStorageStore, type PluginStorageStore } from "./plugin-storage";
import type {
  PluginCommandExecutionResult,
  PluginCommandHandler,
  PluginConfigStoreValue,
  PluginConfigValue,
  PluginEventAPI,
  PluginEventDispatchResult,
  PluginEventName,
  PluginManifest,
  PluginManagerSnapshot,
  PluginRuntimeErrorInput,
  PluginStorageAPI,
  PluginStateStoreValue,
} from "./types";

export interface PluginStateStore {
  load(): PluginStateStoreValue;
  save(value: PluginStateStoreValue): void;
}

export interface PluginConfigStore {
  load(): PluginConfigStoreValue;
  save(value: PluginConfigStoreValue): void;
}

export class MemoryPluginStateStore implements PluginStateStore {
  constructor(private value: PluginStateStoreValue = {}) {}

  load(): PluginStateStoreValue {
    return { ...this.value };
  }

  save(value: PluginStateStoreValue): void {
    this.value = { ...value };
  }
}

export class BrowserPluginStateStore implements PluginStateStore {
  constructor(private readonly key = "hexo-cms:plugin-state") {}

  load(): PluginStateStoreValue {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(value: PluginStateStoreValue): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}

export class MemoryPluginConfigStore implements PluginConfigStore {
  constructor(private value: PluginConfigStoreValue = {}) {}

  load(): PluginConfigStoreValue {
    return { ...this.value };
  }

  save(value: PluginConfigStoreValue): void {
    this.value = { ...value };
  }
}

export class BrowserPluginConfigStore implements PluginConfigStore {
  constructor(private readonly key = "hexo-cms:plugin-config") {}

  load(): PluginConfigStoreValue {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(value: PluginConfigStoreValue): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}

export interface PluginManagerOptions {
  manifests: unknown[];
  store?: PluginStateStore;
  configStore?: PluginConfigStore;
  storageStore?: PluginStorageStore;
  defaultEnabledPluginIds?: string[];
  commandHandlers?: Record<string, PluginCommandHandler>;
  errorThreshold?: number;
}

export class PluginManager {
  readonly permissionBroker: PermissionBroker;
  private readonly manifests: PluginManifest[];
  private readonly manifestsById = new Map<string, PluginManifest>();
  private readonly extensionRegistry = new ExtensionRegistry();
  private readonly commandRegistry: CommandRegistry;
  private readonly eventBus = new EventBus();
  private readonly store: PluginStateStore;
  private readonly configStore: PluginConfigStore;
  private readonly storageStore: PluginStorageStore;
  private readonly errorThreshold: number;
  private records: PluginStateStoreValue;
  private configs: PluginConfigStoreValue;

  constructor({
    manifests,
    store = new MemoryPluginStateStore(),
    configStore = new MemoryPluginConfigStore(),
    storageStore = new MemoryPluginStorageStore(),
    defaultEnabledPluginIds = [],
    commandHandlers = {},
    errorThreshold = 3,
  }: PluginManagerOptions) {
    this.manifests = validatePluginManifests(manifests);
    this.manifests.forEach((manifest) => this.manifestsById.set(manifest.id, manifest));
    this.permissionBroker = new PermissionBroker(this.manifests);
    this.commandRegistry = new CommandRegistry(this.permissionBroker, commandHandlers);
    this.store = store;
    this.configStore = configStore;
    this.storageStore = storageStore;
    this.errorThreshold = errorThreshold;
    this.records = this.hydrateRecords(defaultEnabledPluginIds);
    this.configs = this.hydrateConfigs();
    this.rebuildExtensions();
  }

  snapshot(): PluginManagerSnapshot {
    return {
      plugins: this.manifests.map((manifest) => ({
        manifest,
        record: this.records[manifest.id],
        config: this.configs[manifest.id] ?? {},
      })),
      extensions: this.extensionRegistry.snapshot(),
    };
  }

  enable(pluginId: string): PluginManagerSnapshot {
    const manifest = this.getManifest(pluginId);
    this.records = {
      ...this.records,
      [pluginId]: {
        id: pluginId,
        version: manifest.version,
        source: manifest.source,
        state: "enabled",
        enabledAt: new Date().toISOString(),
      },
    };
    this.persistAndRebuild();
    return this.snapshot();
  }

  disable(pluginId: string): PluginManagerSnapshot {
    const manifest = this.getManifest(pluginId);
    this.records = {
      ...this.records,
      [pluginId]: {
        ...this.records[pluginId],
        id: pluginId,
        version: manifest.version,
        source: manifest.source,
        state: "disabled",
      },
    };
    this.eventBus.unregisterPlugin(pluginId);
    this.persistAndRebuild();
    return this.snapshot();
  }

  updatePluginConfig(pluginId: string, patch: PluginConfigValue): PluginManagerSnapshot {
    this.getManifest(pluginId);
    this.permissionBroker.assert(pluginId, "pluginConfig.write", "plugin.config.write");
    this.configs = {
      ...this.configs,
      [pluginId]: {
        ...(this.configs[pluginId] ?? {}),
        ...patch,
      },
    };
    this.configStore.save(this.configs);
    return this.snapshot();
  }

  registerCommandHandler(pluginId: string, commandId: string, handler: PluginCommandHandler): void {
    this.getManifest(pluginId);
    this.commandRegistry.registerHandler(pluginId, commandId, handler);
  }

  executeCommand(pluginId: string, commandId: string, args: unknown[] = []): Promise<PluginCommandExecutionResult> {
    this.getManifest(pluginId);
    return this.commandRegistry.execute(pluginId, commandId, args);
  }

  createStorageAPI(pluginId: string): PluginStorageAPI {
    this.getManifest(pluginId);
    return createPluginStorageAPI(pluginId, this.storageStore, this.permissionBroker);
  }

  createEventAPI(pluginId: string): PluginEventAPI {
    this.getEnabledManifest(pluginId);
    return createPluginEventAPI(pluginId, this.eventBus, this.permissionBroker);
  }

  async emitEvent<TPayload = unknown>(
    eventName: PluginEventName,
    payload: TPayload,
  ): Promise<PluginEventDispatchResult[]> {
    const results = await this.eventBus.emit(eventName, payload);

    results.forEach((result) => {
      if (!result.ok && result.error) {
        this.recordPluginError(result.pluginId, {
          contributionId: result.eventName,
          contributionType: "event",
          message: result.error.message,
          code: result.error.code,
          stack: result.error.stack,
        });
      }
    });

    return results;
  }

  recordPluginError(pluginId: string, error: PluginRuntimeErrorInput): PluginManagerSnapshot {
    const manifest = this.getManifest(pluginId);
    const existing = this.records[pluginId];
    const errorCount = (existing?.lastError?.count ?? 0) + 1;
    const state = errorCount >= this.errorThreshold ? "error" : existing?.state ?? "installed";
    if (state === "error") this.eventBus.unregisterPlugin(pluginId);
    this.records = {
      ...this.records,
      [pluginId]: {
        ...existing,
        id: pluginId,
        version: manifest.version,
        source: manifest.source,
        state,
        lastError: {
          message: redactPluginErrorText(error.message),
          code: error.code,
          at: error.at ?? new Date().toISOString(),
          contributionId: error.contributionId,
          contributionType: error.contributionType,
          stack: error.stack ? redactPluginErrorText(error.stack) : undefined,
          count: errorCount,
        },
      },
    };
    this.persistAndRebuild();
    return this.snapshot();
  }

  private getManifest(pluginId: string): PluginManifest {
    const manifest = this.manifestsById.get(pluginId);
    if (!manifest) throw new PluginNotFoundError(pluginId);
    return manifest;
  }

  private getEnabledManifest(pluginId: string): PluginManifest {
    const manifest = this.getManifest(pluginId);
    if (this.records[pluginId]?.state !== "enabled") {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }
    return manifest;
  }

  private hydrateRecords(defaultEnabledPluginIds: string[]): PluginStateStoreValue {
    const stored = this.store.load();
    const defaults = new Set(defaultEnabledPluginIds);
    const records: PluginStateStoreValue = {};

    this.manifests.forEach((manifest) => {
      const existing = stored[manifest.id];
      records[manifest.id] = {
        id: manifest.id,
        version: manifest.version,
        source: manifest.source,
        state: existing?.state ?? (defaults.has(manifest.id) ? "enabled" : "installed"),
        enabledAt: existing?.enabledAt,
        lastError: existing?.lastError,
      };
    });

    return records;
  }

  private hydrateConfigs(): PluginConfigStoreValue {
    const stored = this.configStore.load();
    const configs: PluginConfigStoreValue = {};

    this.manifests.forEach((manifest) => {
      configs[manifest.id] = { ...(stored[manifest.id] ?? {}) };
    });

    return configs;
  }

  private persistAndRebuild(): void {
    this.store.save(this.records);
    this.rebuildExtensions();
  }

  private rebuildExtensions(): void {
    this.manifests.forEach((manifest) => this.extensionRegistry.unregisterPlugin(manifest.id));
    this.manifests.forEach((manifest) => this.commandRegistry.unregisterPlugin(manifest.id));
    this.manifests.forEach((manifest) => {
      if (this.records[manifest.id]?.state === "enabled") {
        this.extensionRegistry.registerPlugin(manifest);
        this.commandRegistry.registerPlugin(manifest);
      }
    });
  }
}

function redactPluginErrorText(value: string): string {
  return value
    .replace(/\b(token|api[-_ ]?key|password|secret|cookie)=([^\s"'`]+)/gi, "$1=[redacted]")
    .replace(/[A-Za-z]:\\(?:[^\\\s"'`]+\\)*[^\\\s"'`]+/g, "[redacted-path]")
    .replace(/\/(?:Users|home)\/[^\s"'`]+/g, "[redacted-path]");
}
