import { useEffect, useState } from "react";
import { AlertCircle, Calendar, FileText, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { DRAFT_COACH_PLUGIN_ID } from "./manifest";
import { checkDraft, type DraftIssue } from "./draft-checker";
import type { HexoPost } from "@hexo-cms/core";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, useDataProvider, useI18n, usePluginSystem } from "@hexo-cms/ui";

interface DraftWithIssues {
  post: HexoPost;
  issues: DraftIssue[];
}

export function DraftCoachWidget() {
  const { snapshot } = usePluginSystem();
  const dataProvider = useDataProvider();
  const { t } = useI18n();
  const [draftsWithIssues, setDraftsWithIssues] = useState<DraftWithIssues[]>([]);
  const [loading, setLoading] = useState(true);

  const plugin = snapshot.plugins.find((p) => p.manifest.id === DRAFT_COACH_PLUGIN_ID);
  const isEnabled = plugin?.record.state === "enabled";
  const config = plugin?.config || {};

  useEffect(() => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }

    checkDrafts();
  }, [isEnabled]);

  async function checkDrafts() {
    setLoading(true);
    try {
      const posts = await dataProvider.getPosts();
      const drafts = posts.filter((p) => p.frontmatter?.draft);

      const withIssues: DraftWithIssues[] = [];
      for (const draft of drafts) {
        const issues = checkDraft(draft, config);
        if (issues.length > 0) {
          withIssues.push({ post: draft, issues });
        }
      }

      setDraftsWithIssues(withIssues);
    } catch (err) {
      console.error("Failed to check drafts:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("draft.widget.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("draft.widget.disabled")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("draft.widget.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("draft.widget.loading")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{t("draft.widget.title")}</span>
          <div className="flex items-center gap-2">
            {draftsWithIssues.length > 0 && (
              <Badge variant="warning">{t("draft.widget.reminders", { count: draftsWithIssues.length })}</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={checkDrafts} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {draftsWithIssues.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("draft.widget.allGood")}</p>
        ) : (
          <div className="space-y-3">
            {draftsWithIssues.map((item) => (
              <div
                key={item.post.path}
                className="rounded-lg border border-[var(--border-default)] p-3 space-y-2"
              >
                <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                  {item.post.title || t("draft.widget.unnamed")}
                </h4>
                <ul className="space-y-1.5">
                  {item.issues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2 text-xs">
                      {issue.type === "overdue" && (
                        <Calendar className="h-3.5 w-3.5 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "word-count" && (
                        <FileText className="h-3.5 w-3.5 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "cover" && (
                        <ImageIcon className="h-3.5 w-3.5 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "info" && (
                        <AlertCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-[var(--text-primary)]">{issue.message}</p>
                        {issue.hint && (
                          <p className="text-[var(--text-tertiary)] mt-0.5">{issue.hint}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
