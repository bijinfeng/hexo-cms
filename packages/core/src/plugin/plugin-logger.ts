import { redactPluginRuntimeText, redactPluginRuntimeValue } from "./redaction";
import type { PluginLogEntry, PluginLogLevel, PluginLogStoreValue, PluginLogger } from "./types";

export interface PluginLogStore {
  load(): PluginLogStoreValue;
  save(value: PluginLogStoreValue): void;
}

export class MemoryPluginLogStore implements PluginLogStore {
  constructor(private value: PluginLogStoreValue = {}) {}

  load(): PluginLogStoreValue {
    return cloneLogStoreValue(this.value);
  }

  save(value: PluginLogStoreValue): void {
    this.value = cloneLogStoreValue(value);
  }
}

export class BrowserPluginLogStore implements PluginLogStore {
  constructor(private readonly key = "hexo-cms:plugin-logs") {}

  load(): PluginLogStoreValue {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save(value: PluginLogStoreValue): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key, JSON.stringify(value));
  }
}

export interface PluginLogAppendOptions {
  maxEntries?: number;
}

export function createPluginLogger(
  pluginId: string,
  store: PluginLogStore,
  options: PluginLogAppendOptions = {},
): PluginLogger {
  return {
    debug: (message, meta) => appendPluginLogEntry(pluginId, "debug", message, meta, store, options),
    info: (message, meta) => appendPluginLogEntry(pluginId, "info", message, meta, store, options),
    warn: (message, meta) => appendPluginLogEntry(pluginId, "warn", message, meta, store, options),
    error: (message, meta) => appendPluginLogEntry(pluginId, "error", message, meta, store, options),
  };
}

export function appendPluginLogEntry(
  pluginId: string,
  level: PluginLogLevel,
  message: string,
  meta: Record<string, unknown> | undefined,
  store: PluginLogStore,
  { maxEntries = 50 }: PluginLogAppendOptions = {},
): PluginLogEntry {
  const current = store.load();
  const entry: PluginLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    pluginId,
    level,
    message: redactPluginRuntimeText(message),
    meta: sanitizePluginLogMeta(meta),
    at: new Date().toISOString(),
  };
  const entries = [...(current[pluginId] ?? []), entry].slice(-maxEntries);

  store.save({
    ...current,
    [pluginId]: entries,
  });

  return entry;
}

export function readPluginLogs(pluginId: string, store: PluginLogStore, limit?: number): PluginLogEntry[] {
  const entries = store.load()[pluginId] ?? [];
  return typeof limit === "number" ? entries.slice(-limit) : entries;
}

function sanitizePluginLogMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  return redactPluginRuntimeValue(meta) as Record<string, unknown>;
}

function cloneLogStoreValue(value: PluginLogStoreValue): PluginLogStoreValue {
  return JSON.parse(JSON.stringify(value)) as PluginLogStoreValue;
}
