import { describe, expect, it } from "vitest";
import { ELECTRON_IPC_CHANNELS, isElectronIpcChannel } from "../types/electron-api";

describe("Electron IPC channel contract", () => {
  it("keeps the shared channel allowlist unique and searchable", () => {
    expect(new Set(ELECTRON_IPC_CHANNELS).size).toBe(ELECTRON_IPC_CHANNELS.length);
    expect(isElectronIpcChannel("plugin-logs:load")).toBe(true);
    expect(isElectronIpcChannel("shell:openExternal")).toBe(false);
  });
});
