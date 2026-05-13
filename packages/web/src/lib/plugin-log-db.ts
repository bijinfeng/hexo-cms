import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { pluginLogs } from "./schema";
import type { PluginLogLevel, PluginLogStoreValue } from "@hexo-cms/core";

const MAX_PLUGIN_LOG_ENTRIES_PER_PLUGIN = 50;

export function ensurePluginLogTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_logs (user_id TEXT NOT NULL, plugin_id TEXT NOT NULL, id TEXT NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL, meta TEXT, created_at TEXT NOT NULL, PRIMARY KEY (user_id, plugin_id, id))",
  );
}

export function loadPluginLogs(userId: string): PluginLogStoreValue {
  ensurePluginLogTable();
  const rows = db
    .select({
      id: pluginLogs.id,
      pluginId: pluginLogs.pluginId,
      level: pluginLogs.level,
      message: pluginLogs.message,
      meta: pluginLogs.meta,
      createdAt: pluginLogs.createdAt,
    })
    .from(pluginLogs)
    .where(eq(pluginLogs.userId, userId))
    .orderBy(asc(pluginLogs.createdAt))
    .all();

  const value: PluginLogStoreValue = {};
  for (const row of rows) {
    value[row.pluginId] = [
      ...(value[row.pluginId] ?? []),
      {
        id: row.id,
        pluginId: row.pluginId,
        level: row.level as PluginLogLevel,
        message: row.message,
        meta: parseLogMeta(row.meta),
        at: row.createdAt,
      },
    ];
  }
  return value;
}

export function savePluginLogs(userId: string, value: PluginLogStoreValue): void {
  ensurePluginLogTable();
  db.delete(pluginLogs).where(eq(pluginLogs.userId, userId)).run();

  for (const [pluginId, entries] of Object.entries(value)) {
    entries.slice(-MAX_PLUGIN_LOG_ENTRIES_PER_PLUGIN).forEach((entry) => {
      db.insert(pluginLogs)
        .values({
          userId,
          pluginId,
          id: entry.id,
          level: entry.level,
          message: entry.message,
          meta: entry.meta ? JSON.stringify(entry.meta) : null,
          createdAt: entry.at,
        })
        .run();
    });
  }
}

function parseLogMeta(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
