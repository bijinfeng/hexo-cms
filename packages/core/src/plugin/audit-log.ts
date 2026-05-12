export interface PluginHttpAuditEntry {
  id: string;
  pluginId: string;
  timestamp: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseStatus?: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  error?: string;
  durationMs?: number;
}

export interface PluginAuditLogStore {
  append(entry: PluginHttpAuditEntry): void;
  read(pluginId?: string, limit?: number): PluginHttpAuditEntry[];
  clear(pluginId?: string): void;
}

export class MemoryPluginAuditLogStore implements PluginAuditLogStore {
  private entries: PluginHttpAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  append(entry: PluginHttpAuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  read(pluginId?: string, limit = 50): PluginHttpAuditEntry[] {
    let filtered = this.entries;
    if (pluginId) {
      filtered = filtered.filter((e) => e.pluginId === pluginId);
    }
    return filtered.slice(-limit).reverse();
  }

  clear(pluginId?: string): void {
    if (pluginId) {
      this.entries = this.entries.filter((e) => e.pluginId !== pluginId);
    } else {
      this.entries = [];
    }
  }
}

export class BrowserPluginAuditLogStore implements PluginAuditLogStore {
  private readonly key: string;
  private readonly maxEntries: number;

  constructor(key = "hexo-cms:plugin-audit-log", maxEntries = 100) {
    this.key = key;
    this.maxEntries = maxEntries;
  }

  append(entry: PluginHttpAuditEntry): void {
    if (typeof window === "undefined") return;
    try {
      const entries = this.loadEntries();
      entries.push(entry);
      if (entries.length > this.maxEntries) {
        entries.shift();
      }
      window.localStorage.setItem(this.key, JSON.stringify(entries));
    } catch (err) {
      console.error("Failed to append audit log entry:", err);
    }
  }

  read(pluginId?: string, limit = 50): PluginHttpAuditEntry[] {
    if (typeof window === "undefined") return [];
    try {
      let entries = this.loadEntries();
      if (pluginId) {
        entries = entries.filter((e) => e.pluginId === pluginId);
      }
      return entries.slice(-limit).reverse();
    } catch (err) {
      console.error("Failed to read audit log:", err);
      return [];
    }
  }

  clear(pluginId?: string): void {
    if (typeof window === "undefined") return;
    try {
      if (pluginId) {
        const entries = this.loadEntries().filter((e) => e.pluginId !== pluginId);
        window.localStorage.setItem(this.key, JSON.stringify(entries));
      } else {
        window.localStorage.removeItem(this.key);
      }
    } catch (err) {
      console.error("Failed to clear audit log:", err);
    }
  }

  private loadEntries(): PluginHttpAuditEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
