import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { ELECTRON_IPC_CHANNELS } from "@hexo-cms/ui/types/electron-api";

describe("desktop IPC channel contract", () => {
  it("keeps main-process handlers aligned with the shared renderer allowlist", () => {
    const mainSourcePath = join(process.cwd(), "src/main/index.ts");
    const mainSource = readFileSync(mainSourcePath, "utf-8");
    const handledChannels = Array.from(mainSource.matchAll(/ipcMain\.handle\("([^"]+)"/g), (match) => match[1]).sort();

    expect(handledChannels).toEqual([...ELECTRON_IPC_CHANNELS].sort());
  });
});
