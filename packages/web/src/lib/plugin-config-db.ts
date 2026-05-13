import { eq } from "drizzle-orm";
import { db } from "./db";
import { parseJsonColumn, stringifyJsonColumn } from "./json-db";
import { pluginConfig } from "./schema";
import type { PluginConfigStoreValue } from "@hexo-cms/core";

export function ensurePluginConfigTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_config (user_id TEXT NOT NULL, plugin_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, plugin_id, key))",
  );
}

export function loadPluginConfig(userId: string): PluginConfigStoreValue {
  ensurePluginConfigTable();
  const rows = db
    .select({
      pluginId: pluginConfig.pluginId,
      key: pluginConfig.key,
      value: pluginConfig.value,
    })
    .from(pluginConfig)
    .where(eq(pluginConfig.userId, userId))
    .all();

  const result: PluginConfigStoreValue = {};
  for (const row of rows) {
    if (!result[row.pluginId]) result[row.pluginId] = {};
    result[row.pluginId][row.key] = parseJsonColumn(row.value, row.value);
  }
  return result;
}

export function savePluginConfig(userId: string, value: PluginConfigStoreValue): void {
  ensurePluginConfigTable();
  db.delete(pluginConfig).where(eq(pluginConfig.userId, userId)).run();

  for (const [pluginId, config] of Object.entries(value)) {
    for (const [key, fieldValue] of Object.entries(config)) {
      db.insert(pluginConfig)
        .values({
          userId,
          pluginId,
          key,
          value: stringifyJsonColumn(fieldValue),
          updatedAt: new Date().toISOString(),
        })
        .run();
    }
  }
}
