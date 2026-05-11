import { eq } from "drizzle-orm";
import { db } from "./db";
import { pluginSecrets } from "./schema";
import type { PluginSecretStoreValue } from "@hexo-cms/core";

export function ensurePluginSecretTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_secrets (user_id TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)",
  );
}

export function loadPluginSecrets(userId: string): PluginSecretStoreValue {
  ensurePluginSecretTable();
  const row = db
    .select({
      value: pluginSecrets.value,
    })
    .from(pluginSecrets)
    .where(eq(pluginSecrets.userId, userId))
    .get();

  if (!row) return {};
  try {
    return JSON.parse(row.value) as PluginSecretStoreValue;
  } catch {
    return {};
  }
}

export function savePluginSecrets(userId: string, value: PluginSecretStoreValue): void {
  ensurePluginSecretTable();
  db.delete(pluginSecrets).where(eq(pluginSecrets.userId, userId)).run();
  db.insert(pluginSecrets)
    .values({
      userId,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    })
    .run();
}
