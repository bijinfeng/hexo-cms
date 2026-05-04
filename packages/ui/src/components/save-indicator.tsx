import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const config: Record<SaveStatus, { icon: typeof Loader2; text: string; className: string }> = {
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

  const { icon: Icon, text, className } = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${status === "saving" ? "animate-spin" : ""}`} />
      <span>{text}</span>
    </div>
  );
}
