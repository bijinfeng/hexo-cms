import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
const mockOn = vi.fn();
const mockCheckForUpdates = vi.fn();
const mockDownloadUpdate = vi.fn();
const mockQuitAndInstall = vi.fn();

let mockAllowPrerelease = false;

vi.mock("electron-updater", () => ({
  autoUpdater: {
    get autoDownload() {
      return false;
    },
    set autoDownload(_v: boolean) {},
    get allowPrerelease() {
      return mockAllowPrerelease;
    },
    set allowPrerelease(v: boolean) {
      mockAllowPrerelease = v;
    },
    on: mockOn,
    checkForUpdates: mockCheckForUpdates,
    downloadUpdate: mockDownloadUpdate,
    quitAndInstall: mockQuitAndInstall,
  },
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/tmp/test-user-data"),
    getVersion: vi.fn(() => "0.0.1"),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock("../json-file-store", () => ({
  readJsonFile: vi.fn((_path: string, fallback: () => unknown) => fallback()),
  writeJsonFile: vi.fn(),
}));

describe("auto-updater", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAllowPrerelease = false;
  });

  it("initializes with stable channel by default", async () => {
    const { getCurrentChannel } = await import("../auto-updater");
    expect(getCurrentChannel()).toBe("stable");
  });

  it("registers electron-updater event handlers on init", async () => {
    const { initUpdater } = await import("../auto-updater");
    const mockWindow = { webContents: { send: mockSend }, isDestroyed: () => false } as any;

    initUpdater(mockWindow, "stable");

    expect(mockOn).toHaveBeenCalledWith("checking-for-update", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-available", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-not-available", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("download-progress", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("update-downloaded", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("sets allowPrerelease for beta channel", async () => {
    const { initUpdater } = await import("../auto-updater");
    const mockWindow = { webContents: { send: mockSend }, isDestroyed: () => false } as any;

    initUpdater(mockWindow, "beta");

    expect(mockAllowPrerelease).toBe(true);
  });

  it("calls checkForUpdates and swallows errors", async () => {
    const { checkForUpdates } = await import("../auto-updater");
    mockCheckForUpdates.mockRejectedValueOnce(new Error("network error"));

    checkForUpdates();

    // Wait for the promise rejection to settle
    await vi.waitFor(() => {
      expect(mockCheckForUpdates).toHaveBeenCalled();
    });
  });

  it("calls downloadUpdate and sends error on failure", async () => {
    const { initUpdater, downloadUpdate } = await import("../auto-updater");
    const mockWindow = { webContents: { send: mockSend }, isDestroyed: () => false } as any;
    initUpdater(mockWindow, "stable");

    mockDownloadUpdate.mockRejectedValueOnce(new Error("download failed"));

    await downloadUpdate();

    expect(mockSend).toHaveBeenCalledWith(
      "update:status",
      expect.objectContaining({
        status: "error",
        message: expect.stringContaining("download failed"),
      }),
    );
  });
});
