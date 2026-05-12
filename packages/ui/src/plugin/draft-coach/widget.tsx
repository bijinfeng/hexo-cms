import { useEffect, useState } from "react";
import { AlertCircle, Calendar, FileText, Image as ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { usePluginSystem } from "../plugin-provider";
import { useDataProvider } from "../../context/data-provider-context";
import { DRAFT_COACH_PLUGIN_ID } from "@hexo-cms/core";
import { checkDraft, type DraftIssue } from "./draft-checker";
import type { HexoPost } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

interface DraftWithIssues {
  post: HexoPost;
  issues: DraftIssue[];
}

export function DraftCoachWidget() {
  const { snapshot } = usePluginSystem();
  const dataProvider = useDataProvider();
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
          <CardTitle className="text-sm">草稿助手</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            插件未启用。前往设置启用草稿助手以获取草稿提醒。
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">草稿助手</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            检查草稿中...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>草稿助手</span>
          <div className="flex items-center gap-2">
            {draftsWithIssues.length > 0 && (
              <Badge variant="warning">{draftsWithIssues.length} 个提醒</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={checkDrafts} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {draftsWithIssues.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">所有草稿状态良好</p>
        ) : (
          <div className="space-y-3">
            {draftsWithIssues.map((item) => (
              <div
                key={item.post.path}
                className="rounded-lg border border-[var(--border-default)] p-3 space-y-2"
              >
                <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                  {item.post.title || "未命名草稿"}
                </h4>
                <ul className="space-y-1.5">
                  {item.issues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2 text-xs">
                      {issue.type === "overdue" && (
                        <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "word-count" && (
                        <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "cover" && (
                        <ImageIcon className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.type === "info" && (
                        <AlertCircle className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
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
