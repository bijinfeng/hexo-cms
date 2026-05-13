import type { ElectronIpcChannel } from "../types/electron-api";
import { getElectronAPI } from "../lib/electron-api";

export interface SyncPluginStore<T extends Record<string, unknown>> {
  load(): T;
  save(value: T): void;
}

interface WebBackedPluginStoreOptions<T extends Record<string, unknown>> {
  endpoint: string;
  payloadKey: string;
  fallback: SyncPluginStore<T>;
}

export class WebBackedPluginStore<T extends Record<string, unknown>> implements SyncPluginStore<T> {
  private cache: T;
  private loaded = false;

  constructor(private readonly options: WebBackedPluginStoreOptions<T>) {
    this.cache = options.fallback.load();
  }

  load(): T {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromServer();
    }
    return { ...this.cache };
  }

  save(value: T): void {
    this.cache = { ...value };
    this.options.fallback.save(value);
    this.persistToServer(value);
  }

  private fetchFromServer(): void {
    fetch(this.options.endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, unknown> | null) => {
        const value = data?.[this.options.payloadKey];
        if (hasEntries<T>(value)) {
          this.cache = value;
          this.options.fallback.save(value);
        }
      })
      .catch(() => {});
  }

  private persistToServer(value: T): void {
    fetch(this.options.endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [this.options.payloadKey]: value }),
    }).catch(() => {});
  }
}

interface DesktopBackedPluginStoreOptions<T extends Record<string, unknown>> {
  loadChannel: ElectronIpcChannel;
  saveChannel: ElectronIpcChannel;
  fallback: SyncPluginStore<T>;
}

export class DesktopBackedPluginStore<T extends Record<string, unknown>> implements SyncPluginStore<T> {
  private cache: T;
  private loaded = false;

  constructor(private readonly options: DesktopBackedPluginStoreOptions<T>) {
    this.cache = options.fallback.load();
  }

  load(): T {
    if (!this.loaded) {
      this.loaded = true;
      this.fetchFromIPC();
    }
    return { ...this.cache };
  }

  save(value: T): void {
    this.cache = { ...value };
    this.options.fallback.save(value);
    getElectronAPI()?.invoke(this.options.saveChannel, value).catch(() => {});
  }

  private fetchFromIPC(): void {
    getElectronAPI()
      ?.invoke<T>(this.options.loadChannel)
      .then((value) => {
        if (hasEntries<T>(value)) {
          this.cache = value;
          this.options.fallback.save(value);
        }
      })
      .catch(() => {});
  }
}

function hasEntries<T extends Record<string, unknown>>(value: unknown): value is T {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0;
}
