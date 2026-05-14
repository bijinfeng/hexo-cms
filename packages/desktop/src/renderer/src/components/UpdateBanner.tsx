import { ArrowDown, CheckCircle2, Loader2, AlertCircle, RotateCw } from "lucide-react";
import type { UseUpdaterReturn } from "../hooks/useUpdater";

interface UpdateBannerProps {
  updater: UseUpdaterReturn;
}

export function UpdateBanner({ updater }: UpdateBannerProps) {
  const { status, version, progress, error, downloadUpdate, quitAndInstall, checkForUpdates } = updater;

  if (status === "idle" || status === "up-to-date") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5 text-sm font-medium bg-[var(--brand-primary)] text-white shadow-md">
      {status === "checking" && (
        <span className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          Checking for updates...
        </span>
      )}

      {status === "available" && (
        <span className="flex items-center gap-3">
          <span>New version {version} available</span>
          <button
            onClick={downloadUpdate}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            type="button"
          >
            <ArrowDown size={14} />
            Update Now
          </button>
        </span>
      )}

      {status === "downloading" && (
        <span className="flex items-center gap-3 w-full max-w-md">
          <Loader2 size={14} className="animate-spin flex-shrink-0" />
          <span className="flex-shrink-0">Downloading {version}</span>
          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="flex-shrink-0 tabular-nums">{progress}%</span>
        </span>
      )}

      {status === "downloaded" && (
        <span className="flex items-center gap-2">
          <CheckCircle2 size={14} />
          {version} ready to install
          <button
            onClick={quitAndInstall}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            type="button"
          >
            <RotateCw size={14} />
            Restart Now
          </button>
        </span>
      )}

      {status === "error" && (
        <span className="flex items-center gap-3">
          <AlertCircle size={14} />
          <span>Update failed{error ? `: ${error}` : ""}</span>
          <button
            onClick={checkForUpdates}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            type="button"
          >
            <RotateCw size={14} />
            Retry
          </button>
        </span>
      )}
    </div>
  );
}
