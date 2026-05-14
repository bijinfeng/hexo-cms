import { useState, useEffect, useCallback } from "react";
import { getElectronAPI } from "@hexo-cms/ui";
import type { UpdateStatus, UpdateChannel, UpdateStatusPayload } from "@hexo-cms/ui/types/electron-api";

export interface UseUpdaterReturn {
  status: UpdateStatus;
  progress: number;
  version: string | null;
  error: string | null;
  channel: UpdateChannel;
  currentVersion: string;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  quitAndInstall: () => void;
  setChannel: (ch: UpdateChannel) => void;
}

export function useUpdater(): UseUpdaterReturn | null {
  const electronAPI = getElectronAPI();
  const isElectron = electronAPI !== null;

  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannelState] = useState<UpdateChannel>("stable");
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    if (!isElectron || !electronAPI) return;

    electronAPI.getVersion().then((v) => {
      setCurrentVersion(v.version);
      setChannelState(v.channel);
    });

    const unsubscribe = electronAPI.onUpdateStatus((payload: UpdateStatusPayload) => {
      setStatus(payload.status);
      if (payload.version) setVersion(payload.version);
      if (payload.percent !== undefined) setProgress(payload.percent);
      if (payload.message) setError(payload.message);
    });

    return unsubscribe;
  }, []);

  const checkForUpdates = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    setError(null);
    electronAPI.checkForUpdates();
  }, [isElectron, electronAPI]);

  const download = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.downloadUpdate();
  }, [isElectron, electronAPI]);

  const quitAndInstall = useCallback(() => {
    if (!isElectron || !electronAPI) return;
    electronAPI.quitAndInstall();
  }, [isElectron, electronAPI]);

  const handleSetChannel = useCallback(
    (ch: UpdateChannel) => {
      if (!isElectron || !electronAPI) return;
      setChannelState(ch);
      electronAPI.setUpdateChannel(ch);
    },
    [isElectron, electronAPI],
  );

  if (!isElectron) return null;

  return {
    status,
    progress,
    version,
    error,
    channel,
    currentVersion,
    checkForUpdates,
    downloadUpdate: download,
    quitAndInstall,
    setChannel: handleSetChannel,
  };
}
