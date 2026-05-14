import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopPersistence, type KeychainAdapter } from "./desktop-persistence";

let tempDir: string | null = null;

function createTempDir(): string {
  tempDir = mkdtempSync(join(tmpdir(), "hexo-cms-desktop-persistence-"));
  return tempDir;
}

function createMemoryKeychain(initial: Record<string, string> = {}): KeychainAdapter {
  const values = new Map(Object.entries(initial));

  return {
    async getPassword(_service, account) {
      return values.get(account) ?? null;
    },
    async setPassword(_service, account, password) {
      values.set(account, password);
    },
  };
}

afterEach(() => {
  if (!tempDir) return;
  rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe("desktop persistence", () => {
  it("persists config and plugin stores under the user data path", () => {
    const root = createTempDir();
    const persistence = createDesktopPersistence({
      getUserDataPath: () => root,
      keytarService: "hexo-cms-test",
      keychain: async () => createMemoryKeychain(),
    });

    persistence.saveConfig({ owner: "hexo", repo: "blog", branch: "main" });
    persistence.savePluginStorage({ pluginA: { count: 2 } });
    persistence.savePluginState({ pluginA: { id: "pluginA", version: "1.0.0", source: "builtin", state: "enabled" } });

    expect(persistence.loadConfig()).toEqual({ owner: "hexo", repo: "blog", branch: "main" });
    expect(persistence.loadPluginStorage()).toEqual({ pluginA: { count: 2 } });
    expect(JSON.parse(readFileSync(join(root, "plugins", "state.json"), "utf-8"))).toEqual({
      pluginA: { id: "pluginA", version: "1.0.0", source: "builtin", state: "enabled" },
    });
  });

  it("stores plugin secrets in the injected keychain without exposing invalid payloads", async () => {
    const root = createTempDir();
    const keychain = createMemoryKeychain({ "plugin-secrets": "{not-json" });
    const persistence = createDesktopPersistence({
      getUserDataPath: () => root,
      keytarService: "hexo-cms-test",
      keychain: async () => keychain,
    });

    await expect(persistence.loadPluginSecrets()).resolves.toEqual({});
    await expect(persistence.hasPluginSecret("pluginA", "token")).resolves.toBe(false);

    await persistence.mutatePluginSecret({ op: "set", pluginId: "pluginA", key: "token", value: "secret" });
    await expect(persistence.hasPluginSecret("pluginA", "token")).resolves.toBe(true);

    await persistence.mutatePluginSecret({ op: "delete", pluginId: "pluginA", key: "token" });
    await expect(persistence.hasPluginSecret("pluginA", "token")).resolves.toBe(false);
  });

  it("keeps newest plugin network audit entries first and trims old entries", () => {
    const root = createTempDir();
    const now = vi
      .fn()
      .mockReturnValueOnce(new Date("2026-05-14T10:00:00.000Z"))
      .mockReturnValueOnce(new Date("2026-05-14T10:01:00.000Z"))
      .mockReturnValueOnce(new Date("2026-05-14T10:02:00.000Z"));
    const persistence = createDesktopPersistence({
      getUserDataPath: () => root,
      keytarService: "hexo-cms-test",
      keychain: async () => createMemoryKeychain(),
      now,
      maxAuditEntries: 2,
    });

    persistence.appendPluginNetworkAudit({ pluginId: "pluginA", url: "https://a.test", method: "GET", status: 200 });
    persistence.appendPluginNetworkAudit({ pluginId: "pluginA", url: "https://b.test", method: "POST", status: 201 });
    persistence.appendPluginNetworkAudit({ pluginId: "pluginB", url: "https://c.test", method: "GET", status: 500, error: "boom" });

    expect(persistence.listPluginNetworkAudit()).toEqual([
      {
        pluginId: "pluginB",
        url: "https://c.test",
        method: "GET",
        status: 500,
        error: "boom",
        createdAt: "2026-05-14T10:02:00.000Z",
      },
      {
        pluginId: "pluginA",
        url: "https://b.test",
        method: "POST",
        status: 201,
        createdAt: "2026-05-14T10:01:00.000Z",
      },
    ]);
  });
});
