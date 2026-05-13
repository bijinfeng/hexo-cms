import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { stringifyJsonColumn, tryParseJsonColumn } from "./json-db";
import { pluginStorage } from "./schema";
import type { PluginStorageJsonValue, PluginStorageStoreValue } from "@hexo-cms/core";

export function ensurePluginStorageTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_storage (user_id TEXT NOT NULL, plugin_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT, PRIMARY KEY (user_id, plugin_id, key))",
  );
}

export function loadPluginStorage(userId: string): PluginStorageStoreValue {
  ensurePluginStorageTable();
  const rows = db
    .select({
      pluginId: pluginStorage.pluginId,
      key: pluginStorage.key,
      value: pluginStorage.value,
    })
    .from(pluginStorage)
    .where(eq(pluginStorage.userId, userId))
    .all();
  const value: PluginStorageStoreValue = {};

  rows.forEach((row) => {
    const parsed = tryParseJsonColumn<PluginStorageJsonValue>(row.value);
    if (!parsed.ok) return;

    value[row.pluginId] = {
      ...(value[row.pluginId] ?? {}),
      [row.key]: parsed.value,
    };
  });

  return value;
}

export function savePluginStorage(userId: string, value: PluginStorageStoreValue): void {
  ensurePluginStorageTable();
  db.delete(pluginStorage).where(eq(pluginStorage.userId, userId)).run();

  Object.entries(value).forEach(([pluginId, namespace]) => {
    Object.entries(namespace).forEach(([key, storageValue]) => {
      db.insert(pluginStorage)
        .values({
          userId,
          pluginId,
          key,
          value: stringifyJsonColumn(storageValue),
          updatedAt: new Date().toISOString(),
        })
        .run();
    });
  });
}

export function deletePluginStorageKey(userId: string, pluginId: string, key: string): void {
  ensurePluginStorageTable();
  db.delete(pluginStorage)
    .where(and(eq(pluginStorage.userId, userId), eq(pluginStorage.pluginId, pluginId), eq(pluginStorage.key, key)))
    .run();
}
