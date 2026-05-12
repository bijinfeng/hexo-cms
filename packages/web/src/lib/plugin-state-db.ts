import { eq } from "drizzle-orm";
import { db } from "./db";
import { pluginState } from "./schema";
import type { PluginStateStoreValue } from "@hexo-cms/core";

export function ensurePluginStateTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_state (user_id TEXT NOT NULL, plugin_id TEXT NOT NULL, state TEXT NOT NULL, enabled_at TEXT, last_error TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, plugin_id))",
  );
}

export function loadPluginState(userId: string): PluginStateStoreValue {
  ensurePluginStateTable();
  const rows = db
    .select({
      pluginId: pluginState.pluginId,
      state: pluginState.state,
      enabledAt: pluginState.enabledAt,
      lastError: pluginState.lastError,
    })
    .from(pluginState)
    .where(eq(pluginState.userId, userId))
    .all();

  const value: PluginStateStoreValue = {};
  for (const row of rows) {
    value[row.pluginId] = {
      state: row.state as "enabled" | "disabled" | "error",
      enabledAt: row.enabledAt ?? undefined,
      lastError: row.lastError ? JSON.parse(row.lastError) : undefined,
    };
  }
  return value;
}

export function savePluginState(userId: string, value: PluginStateStoreValue): void {
  ensurePluginStateTable();
  db.delete(pluginState).where(eq(pluginState.userId, userId)).run();

  for (const [pluginId, record] of Object.entries(value)) {
    db.insert(pluginState)
      .values({
        userId,
        pluginId,
        state: record.state,
        enabledAt: record.enabledAt ?? null,
        lastError: record.lastError ? JSON.stringify(record.lastError) : null,
        updatedAt: new Date().toISOString(),
      })
      .run();
  }
}
