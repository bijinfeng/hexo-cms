import { join } from "node:path";
import type { UpdateChannel, UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";
import type { BrowserWindow } from "electron";
import { app } from "electron";
import updater from "electron-updater";
import { readJsonFile, writeJsonFile } from "./json-file-store";

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

  updater.autoUpdater.autoDownload = false;
  updater.autoUpdater.allowPrerelease = channel === "beta";

  updater.autoUpdater.on("checking-for-update", () => {
    sendStatus({ status: "checking" });
  });

  updater.autoUpdater.on("update-available", (info) => {
    sendStatus({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  updater.autoUpdater.on("update-not-available", () => {
    sendStatus({ status: "up-to-date" });
  });

  updater.autoUpdater.on("download-progress", (progress) => {
    sendStatus({
      status: "downloading",
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  updater.autoUpdater.on("update-downloaded", (info) => {
    sendStatus({
      status: "downloaded",
      version: info.version,
    });
  });

  updater.autoUpdater.on("error", (error) => {
    sendStatus({
      status: "error",
      message: error.message,
    });
  });
}

export function checkForUpdates(): void {
  updater.autoUpdater.checkForUpdates().catch(() => {
    // Startup check failures are silent
  });
}

export function downloadUpdate(): void {
  updater.autoUpdater.downloadUpdate().catch((error) => {
    sendStatus({ status: "error", message: String(error) });
  });
}

export function quitAndInstall(): void {
  updater.autoUpdater.quitAndInstall();
}

export function setChannel(channel: UpdateChannel): void {
  saveChannel(channel);
  updater.autoUpdater.allowPrerelease = channel === "beta";
}

export function getCurrentChannel(): UpdateChannel {
  return loadChannel();
}
