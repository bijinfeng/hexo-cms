import type { PluginConfigValue } from "@hexo-cms/core";
import { Button, useDataProvider, useI18n, usePluginSystem } from "@hexo-cms/ui";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import type { ComponentType } from "react";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "../manifest";

async function fetchGitHubGraphQL(
  token: string,
  query: string,
  variables: Record<string, unknown>,
) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub GraphQL error: ${res.status} ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(data.errors[0].message);
  }
  return data.data;
}

interface DiscussionNode {
  id: string;
  locked: boolean;
  isAnswered?: boolean;
}

export function CommentsOverviewWidget({ config = {} }: { config?: PluginConfigValue }) {
  const dataProvider = useDataProvider();
  const { executePluginCommand } = usePluginSystem();
  const { t } = useI18n();
  const showPendingAlert = config.showPendingAlert !== false;
  const moderationUrl =
    typeof config.moderationUrl === "string" && config.moderationUrl
      ? config.moderationUrl
      : "/plugins/hexo-cms-comments-overview/comments";

  const isConfigured = Boolean(config.giscusRepo && config.giscusRepoId && config.giscusCategoryId);

  const summaryQuery = useQuery({
    queryKey: ["comments-overview", "widget-summary", config.giscusRepo, config.giscusCategoryId],
    queryFn: async () => {
      const token = await dataProvider.getToken();
      if (!token) throw new Error("Missing GitHub token");

      const [owner, repo] = (config.giscusRepo as string).split("/");
      const query = `
        query($owner: String!, $repo: String!, $categoryId: ID) {
          repository(owner: $owner, name: $repo) {
            discussions(first: 100, categoryId: $categoryId) {
              nodes { locked isAnswered }
              totalCount
            }
          }
        }
      `;

      const data = await fetchGitHubGraphQL(token, query, {
        owner,
        repo,
        categoryId: config.giscusCategoryId || null,
      });

      const nodes: DiscussionNode[] = data.repository.discussions.nodes ?? [];
      const total = data.repository.discussions.totalCount as number;
      const open = nodes.filter((n) => !n.locked && !n.isAnswered).length;
      const answered = nodes.filter((n) => n.isAnswered).length;
      const locked = nodes.filter((n) => n.locked).length;

      return { total, open, answered, locked };
    },
    enabled: isConfigured,
    staleTime: 60_000,
  });

  const summary = summaryQuery.data ?? { total: 0, open: 0, answered: 0, locked: 0 };

  async function openModeration() {
    await executePluginCommand(COMMENTS_OVERVIEW_PLUGIN_ID, "comments.openModeration", [
      moderationUrl,
    ]);
  }

  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {t("comments.widget.manageComments")}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t("comments.widget.notConfigured")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {showPendingAlert && (
          <SummaryTile
            icon={AlertTriangle}
            label={t("comments.widget.pending")}
            value={summary.open}
            tone="warning"
          />
        )}
        <SummaryTile
          icon={CheckCircle2}
          label={t("comments.widget.approved")}
          value={summary.answered}
          tone="success"
        />
        <SummaryTile
          icon={ShieldAlert}
          label={t("comments.widget.spam")}
          value={summary.locked}
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
