import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFile } from "./json-file-store";

let tempDir: string | null = null;

function createTempDir(): string {
  tempDir = mkdtempSync(join(tmpdir(), "hexo-cms-json-store-"));
  return tempDir;
}

afterEach(() => {
  if (!tempDir) return;
  rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe("desktop JSON file store", () => {
  it("returns fallback values for missing or invalid JSON files", () => {
    const root = createTempDir();
    const missingPath = join(root, "missing.json");
    const invalidPath = join(root, "invalid.json");
    writeFileSync(invalidPath, "{not-json", "utf-8");

    expect(readJsonFile(missingPath, () => ({ enabled: false }))).toEqual({ enabled: false });
    expect(readJsonFile(invalidPath, () => [])).toEqual([]);
  });

  it("creates parent directories and writes readable JSON", () => {
    const filePath = join(createTempDir(), "plugins", "state.json");

    writeJsonFile(filePath, { plugin: { state: "enabled" } });

    expect(JSON.parse(readFileSync(filePath, "utf-8"))).toEqual({ plugin: { state: "enabled" } });
    expect(readJsonFile(filePath, () => ({}))).toEqual({ plugin: { state: "enabled" } });
  });
});
