import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { pluginNetworkAudit } from "./schema";

const MAX_AUDIT_ENTRIES_PER_USER = 200;

export interface PluginNetworkAuditEntryInput {
  pluginId: string;
  url: string;
  method: string;
  status: number;
  error?: string;
}

export interface PluginNetworkAuditEntry extends PluginNetworkAuditEntryInput {
  id: number;
  createdAt: string;
}

export function ensurePluginNetworkAuditTable(): void {
  db.run(
    "CREATE TABLE IF NOT EXISTS plugin_network_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, plugin_id TEXT NOT NULL, url TEXT NOT NULL, method TEXT NOT NULL, status INTEGER NOT NULL, error TEXT, created_at TEXT NOT NULL)",
  );
}

export function appendPluginNetworkAudit(userId: string, entry: PluginNetworkAuditEntryInput): void {
  ensurePluginNetworkAuditTable();
  db.insert(pluginNetworkAudit)
    .values({
      userId,
      pluginId: entry.pluginId,
      url: entry.url,
      method: entry.method,
      status: entry.status,
      error: entry.error,
      createdAt: new Date().toISOString(),
    })
    .run();

  trimPluginNetworkAudit(userId);
}

export function listPluginNetworkAudit(userId: string, limit = 50): PluginNetworkAuditEntry[] {
  ensurePluginNetworkAuditTable();
  const rows = db
    .select()
    .from(pluginNetworkAudit)
    .where(eq(pluginNetworkAudit.userId, userId))
    .orderBy(desc(pluginNetworkAudit.id))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    pluginId: row.pluginId,
    url: row.url,
    method: row.method,
    status: row.status,
    error: row.error ?? undefined,
    createdAt: row.createdAt,
  }));
}

function trimPluginNetworkAudit(userId: string): void {
  const rows = db
    .select({ id: pluginNetworkAudit.id })
    .from(pluginNetworkAudit)
    .where(eq(pluginNetworkAudit.userId, userId))
    .orderBy(desc(pluginNetworkAudit.id))
    .all();

  if (rows.length <= MAX_AUDIT_ENTRIES_PER_USER) return;

  const idsToKeep = new Set(rows.slice(0, MAX_AUDIT_ENTRIES_PER_USER).map((row) => row.id));
  for (const row of rows) {
    if (!idsToKeep.has(row.id)) {
      db.delete(pluginNetworkAudit)
        .where(and(eq(pluginNetworkAudit.userId, userId), eq(pluginNetworkAudit.id, row.id)))
        .run();
    }
  }
}
