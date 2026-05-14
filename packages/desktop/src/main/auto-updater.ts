import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";
import type { UpdateChannel, UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";
import { readJsonFile, writeJsonFile } from "./json-file-store";
import { join } from "path";
import { app } from "electron";

const UPDATE_CONFIG_FILENAME = "update-config.json";

function getUpdateConfigPath(): string {
  return join(app.getPath("userData"), UPDATE_CONFIG_FILENAME);
}

interface UpdateConfig {
  channel: UpdateChannel;
}

function loadChannel(): UpdateChannel {
  return readJsonFile<UpdateConfig>(getUpdateConfigPath(), () => ({ channel: "stable" })).channel;
}

function saveChannel(channel: UpdateChannel): void {
  writeJsonFile(getUpdateConfigPath(), { channel });
}

let mainWindow: BrowserWindow | null = null;

function sendStatus(payload: UpdateStatusPayload): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update:status", payload);
  }
}

export function initUpdater(window: BrowserWindow, channel: UpdateChannel): void {
  mainWindow = window;

  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = channel === "beta";

  autoUpdater.on("checking-for-update", () => {
    sendStatus({ status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendStatus({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({ status: "up-to-date" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({
      status: "downloading",
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendStatus({
      status: "downloaded",
      version: info.version,
    });
  });

  autoUpdater.on("error", (error) => {
    sendStatus({
      status: "error",
      message: error.message,
    });
  });
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(() => {
    // Startup check failures are silent
  });
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((error) => {
    sendStatus({ status: "error", message: String(error) });
  });
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function setChannel(channel: UpdateChannel): void {
  saveChannel(channel);
  autoUpdater.allowPrerelease = channel === "beta";
}

export function getCurrentChannel(): UpdateChannel {
  return loadChannel();
}
