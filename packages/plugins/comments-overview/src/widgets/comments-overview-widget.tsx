import type { PluginConfigValue } from "@hexo-cms/core";
import { Button, useI18n, usePluginSystem } from "@hexo-cms/ui";
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import type { ComponentType } from "react";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "../manifest";

const summary = {
  total: 6,
  pending: 2,
  approved: 3,
  spam: 1,
};

export function CommentsOverviewWidget({ config = {} }: { config?: PluginConfigValue }) {
  const { executePluginCommand } = usePluginSystem();
  const { t } = useI18n();
  const showPendingAlert = config.showPendingAlert !== false;
  const moderationUrl =
    typeof config.moderationUrl === "string" && config.moderationUrl
      ? config.moderationUrl
      : "/comments";

  async function openModeration() {
    await executePluginCommand(COMMENTS_OVERVIEW_PLUGIN_ID, "comments.openModeration", [
      moderationUrl,
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {showPendingAlert && (
          <SummaryTile
            icon={AlertTriangle}
            label={t("comments.widget.pending")}
            value={summary.pending}
            tone="warning"
          />
        )}
        <SummaryTile
          icon={CheckCircle2}
          label={t("comments.widget.approved")}
          value={summary.approved}
          tone="success"
        />
        <SummaryTile
          icon={ShieldAlert}
          label={t("comments.widget.spam")}
          value={summary.spam}
          tone="error"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {t("comments.widget.manageComments")}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {t("comments.widget.totalComments", { count: summary.total })}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={openModeration}
          data-plugin-href={moderationUrl}
        >
          <MessageSquare size={14} />
          {t("comments.widget.openModeration")}
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
