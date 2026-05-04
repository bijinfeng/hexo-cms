import { CheckCircle2, Clock, Loader2, Rocket, XCircle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type DeployStatus = "idle" | "deploying" | "deployed" | "failed";

interface SaveIndicatorProps {
  status: SaveStatus;
  deployStatus?: DeployStatus;
  onDeploy?: () => void;
}

export function SaveIndicator({ status, deployStatus = "idle", onDeploy }: SaveIndicatorProps) {
  const isActive = status !== "idle" || deployStatus !== "idle";
  if (!isActive) return null;

  const saveConfig: Record<SaveStatus, { icon: typeof Loader2; text: string; className: string }> = {
    idle: { icon: Clock, text: "", className: "" },
    saving: {
      icon: Loader2,
      text: "保存中...",
      className: "text-[var(--status-info)]",
    },
    saved: {
      icon: CheckCircle2,
      text: "已保存",
      className: "text-[var(--status-success)]",
    },
    error: {
      icon: XCircle,
      text: "保存失败",
      className: "text-[var(--status-error)]",
    },
  };

  const deployConfig: Record<DeployStatus, { icon: typeof Loader2; text: string; className: string }> = {
    idle: { icon: Rocket, text: "", className: "" },
    deploying: {
      icon: Loader2,
      text: "部署中...",
      className: "text-[var(--status-info)]",
    },
    deployed: {
      icon: CheckCircle2,
      text: "部署成功",
      className: "text-[var(--status-success)]",
    },
    failed: {
      icon: XCircle,
      text: "部署失败",
      className: "text-[var(--status-error)]",
    },
  };

  const { icon: SaveIcon, text: saveText, className: saveClass } = saveConfig[status];
  const { icon: DeployIcon, text: deployText, className: deployClass } = deployConfig[deployStatus];

  return (
    <div className="flex items-center gap-3 text-xs">
      {status !== "idle" && (
        <div className={`flex items-center gap-1.5 ${saveClass}`}>
          <SaveIcon className={`w-3.5 h-3.5 ${status === "saving" ? "animate-spin" : ""}`} />
          <span>{saveText}</span>
        </div>
      )}
      {deployStatus !== "idle" && (
        <div className={`flex items-center gap-1.5 ${deployClass}`}>
          <DeployIcon className={`w-3.5 h-3.5 ${deployStatus === "deploying" ? "animate-spin" : ""}`} />
          <span>{deployText}</span>
        </div>
      )}
      {status === "saved" && deployStatus === "idle" && onDeploy && (
        <button
          onClick={onDeploy}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer"
        >
          <Rocket size={12} />
          部署站点
        </button>
      )}
    </div>
  );
}
