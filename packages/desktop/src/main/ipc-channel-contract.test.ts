import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ELECTRON_IPC_CHANNELS } from "@hexo-cms/ui/types/electron-api";
import { describe, expect, it } from "vitest";

function scanIpcChannels(filePath: string): string[] {
  const source = readFileSync(filePath, "utf-8");
  return Array.from(source.matchAll(/ipcMain\.handle\("([^"]+)"/g), (match) => match[1]);
}

describe("desktop IPC channel contract", () => {
  it("keeps main-process handlers aligned with the shared renderer allowlist", () => {
    const mainSourcePath = join(process.cwd(), "src/main/index.ts");
    const handlersSourcePath = join(process.cwd(), "src/main/ipc-handlers.ts");
    const handledChannels = [
      ...scanIpcChannels(mainSourcePath),
      ...scanIpcChannels(handlersSourcePath),
    ].sort();

    expect(handledChannels).toEqual([...ELECTRON_IPC_CHANNELS].sort());
  });
});
