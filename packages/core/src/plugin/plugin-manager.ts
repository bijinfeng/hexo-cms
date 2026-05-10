import { PluginNotFoundError } from "./errors";
import { ExtensionRegistry } from "./extension-registry";
import { validatePluginManifests } from "./manifest";
import { PermissionBroker } from "./permissions";
import type {
  PluginManifest,
  PluginManagerSnapshot,
  PluginStateStoreValue,
} from "./types";

export interface PluginStateStore {
  load(): PluginStateStoreValue;
  save(value: PluginStateStoreValue): void;
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

export interface PluginManagerOptions {
  manifests: unknown[];
  store?: PluginStateStore;
  defaultEnabledPluginIds?: string[];
}

export class PluginManager {
  readonly permissionBroker: PermissionBroker;
  private readonly manifests: PluginManifest[];
  private readonly manifestsById = new Map<string, PluginManifest>();
  private readonly extensionRegistry = new ExtensionRegistry();
  private readonly store: PluginStateStore;
  private records: PluginStateStoreValue;

  constructor({
    manifests,
    store = new MemoryPluginStateStore(),
    defaultEnabledPluginIds = [],
  }: PluginManagerOptions) {
    this.manifests = validatePluginManifests(manifests);
    this.manifests.forEach((manifest) => this.manifestsById.set(manifest.id, manifest));
    this.permissionBroker = new PermissionBroker(this.manifests);
    this.store = store;
    this.records = this.hydrateRecords(defaultEnabledPluginIds);
    this.rebuildExtensions();
  }

  snapshot(): PluginManagerSnapshot {
    return {
      plugins: this.manifests.map((manifest) => ({
        manifest,
        record: this.records[manifest.id],
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
    this.persistAndRebuild();
    return this.snapshot();
  }

  private getManifest(pluginId: string): PluginManifest {
    const manifest = this.manifestsById.get(pluginId);
    if (!manifest) throw new PluginNotFoundError(pluginId);
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

  private persistAndRebuild(): void {
    this.store.save(this.records);
    this.rebuildExtensions();
  }

  private rebuildExtensions(): void {
    this.manifests.forEach((manifest) => this.extensionRegistry.unregisterPlugin(manifest.id));
    this.manifests.forEach((manifest) => {
      if (this.records[manifest.id]?.state === "enabled") {
        this.extensionRegistry.registerPlugin(manifest);
      }
    });
  }
}
