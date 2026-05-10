import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/button";

const summary = {
  total: 6,
  pending: 2,
  approved: 3,
  spam: 1,
};

export function CommentsOverviewWidget() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile icon={AlertTriangle} label="待审核" value={summary.pending} tone="warning" />
        <SummaryTile icon={CheckCircle2} label="已通过" value={summary.approved} tone="success" />
        <SummaryTile icon={ShieldAlert} label="垃圾" value={summary.spam} tone="error" />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">评论管理</div>
          <div className="text-xs text-[var(--text-secondary)]">共 {summary.total} 条示例评论</div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/comments">
            <MessageSquare size={14} />
            打开评论管理
          </a>
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone: "warning" | "success" | "error";
}) {
  const toneClass = {
    warning: "text-[var(--status-warning)] bg-[var(--status-warning-bg)]",
    success: "text-[var(--status-success)] bg-[var(--status-success-bg)]",
    error: "text-[var(--status-error)] bg-[var(--status-error-bg)]",
  }[tone];

  return (
    <div className={`rounded-lg p-3 ${toneClass}`}>
      <Icon size={15} className="mb-2" />
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  );
}
