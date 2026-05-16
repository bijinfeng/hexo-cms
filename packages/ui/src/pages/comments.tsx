import { useState, useEffect } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { usePluginSystem } from "../plugin";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "@hexo-cms/core";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import {
  MessageSquare,
  Search,
  EyeOff,
  Eye,
  ChevronDown,
  ExternalLink,
  Settings,
  AlertTriangle,
  Puzzle,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface DiscussionAuthor {
  login: string;
  avatarUrl: string;
}

interface DiscussionComment {
  id: string;
  discussionId: string;
  body: string;
  createdAt: string;
  author: DiscussionAuthor;
  isAnswer: boolean;
  isHidden: boolean;
}

interface DiscussionThread {
  id: string;
  number: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  state: "OPEN" | "LOCKED" | "ANSWERED";
  category: string;
  author: DiscussionAuthor;
  comments: DiscussionComment[];
}

const stateConfig: Record<string, { label: string; variant: "default" | "warning" | "success" }> = {
  OPEN: { label: "", variant: "default" },
  LOCKED: { label: "已锁定", variant: "warning" },
  ANSWERED: { label: "已解决", variant: "success" },
};

const filterOptions = [
  { id: "all", label: "全部" },
  { id: "OPEN", label: "开放" },
  { id: "LOCKED", label: "已锁定" },
  { id: "ANSWERED", label: "已解决" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return dateStr.slice(0, 10);
}

function truncateBody(body: string, maxLen = 150): string {
  if (!body) return "";
  const cleaned = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "..." : cleaned;
}

async function fetchGitHubGraphQL(token: string, query: string, variables: Record<string, unknown>) {
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

export function CommentsPage() {
  const dataProvider = useDataProvider();
  const { snapshot, enablePlugin } = usePluginSystem();

  const commentsPlugin = snapshot.plugins.find((p) => p.manifest.id === COMMENTS_OVERVIEW_PLUGIN_ID);
  const isPluginEnabled = commentsPlugin?.record.state === "enabled";
  const pluginConfig = commentsPlugin?.config ?? {};

  const isConfigured = Boolean(
    pluginConfig.giscusRepo &&
    pluginConfig.giscusRepoId &&
    pluginConfig.giscusCategoryId
  );

  const [discussions, setDiscussions] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [commentCache, setCommentCache] = useState<Record<string, DiscussionComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [moderatingIds, setModeratingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isPluginEnabled || !isConfigured) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await dataProvider.getToken();
        if (!token) {
          setError("未获取到 GitHub Token，请重新授权");
          setLoading(false);
          return;
        }

        const [owner, repo] = (pluginConfig.giscusRepo as string).split("/");
        const query = `
          query($owner: String!, $repo: String!, $categoryId: ID) {
            repository(owner: $owner, name: $repo) {
              discussions(first: 50, categoryId: $categoryId, orderBy: { field: UPDATED_AT, direction: DESC }) {
                nodes {
                  id number title body createdAt updatedAt locked
                  category { name }
                  author { login avatarUrl }
                }
              }
            }
          }
        `;

        const data = await fetchGitHubGraphQL(token, query, {
          owner,
          repo,
          categoryId: pluginConfig.giscusCategoryId || null,
        });

        const nodes = data.repository.discussions.nodes.map((n: Record<string, unknown>) => {
          let state: DiscussionThread["state"] = "OPEN";
          if (n.locked) state = "LOCKED";
          const isAnswered = (n as { isAnswered?: boolean }).isAnswered;
          if (isAnswered) state = "ANSWERED";
          return {
            id: n.id as string,
            number: n.number as number,
            title: n.title as string,
            body: n.body as string,
            createdAt: n.createdAt as string,
            updatedAt: n.updatedAt as string,
            state,
            category: ((n.category as { name: string })?.name) ?? "",
            author: (n.author as DiscussionAuthor) ?? { login: "unknown", avatarUrl: "" },
            comments: [],
          };
        });
        setDiscussions(nodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载讨论失败");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isPluginEnabled, isConfigured]);

  async function loadComments(discussionId: string) {
    if (commentCache[discussionId]) return;
    setLoadingComments((prev) => new Set(prev).add(discussionId));
    try {
      const token = await dataProvider.getToken();
      if (!token) return;
      const query = `
        query($discussionId: ID!) {
          node(id: $discussionId) {
            ... on Discussion {
              comments(first: 100) {
                nodes {
                  id body createdAt isAnswer isHidden
                  author { login avatarUrl }
                }
              }
            }
          }
        }
      `;
      const data = await fetchGitHubGraphQL(token, query, { discussionId });
      const comments = data.node.comments.nodes.map((n: Record<string, unknown>) => ({
        id: n.id as string,
        discussionId,
        body: n.body as string,
        createdAt: n.createdAt as string,
        isAnswer: (n.isAnswer as boolean) ?? false,
        isHidden: (n.isHidden as boolean) ?? false,
        author: (n.author as DiscussionAuthor) ?? { login: "unknown", avatarUrl: "" },
      }));
      setCommentCache((prev) => ({ ...prev, [discussionId]: comments }));
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments((prev) => {
        const next = new Set(prev);
        next.delete(discussionId);
        return next;
      });
    }
  }

  async function handleToggleExpand(discussionId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(discussionId)) {
        next.delete(discussionId);
      } else {
        next.add(discussionId);
        loadComments(discussionId);
      }
      return next;
    });
  }

  async function handleModerateComment(commentId: string, action: "hide" | "unhide") {
    setModeratingIds((prev) => new Set(prev).add(commentId));
    try {
      const token = await dataProvider.getToken();
      if (!token) return;
      const mutation = action === "hide"
        ? `mutation($id: ID!) { hideDiscussionComment(input: { commentId: $id }) { clientMutationId } }`
        : `mutation($id: ID!) { unhideDiscussionComment(input: { commentId: $id }) { clientMutationId } }`;
      await fetchGitHubGraphQL(token, mutation, { id: commentId });
      setCommentCache((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].map((c) =>
            c.id === commentId ? { ...c, isHidden: action === "hide" } : c
          );
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to moderate comment:", err);
    } finally {
      setModeratingIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  }

  const filtered = discussions.filter((d) => {
    const matchSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.body.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "all" || d.state === activeFilter;
    return matchSearch && matchFilter;
  });

  if (!isPluginEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
              <Puzzle size={24} className="text-[var(--text-tertiary)]" />
            </div>
            <div>
              <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">评论插件未启用</div>
              <p className="text-sm text-[var(--text-secondary)]">
                评论管理功能由 Comments Overview 插件提供，请在插件设置中启用。
              </p>
            </div>
            <Button onClick={() => enablePlugin(COMMENTS_OVERVIEW_PLUGIN_ID)}>
              <Puzzle size={16} />
              启用评论插件
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
              <Settings size={24} className="text-[var(--text-tertiary)]" />
            </div>
            <div>
              <div className="text-lg font-semibold text-[var(--text-primary)] mb-1">尚未配置评论系统</div>
              <p className="text-sm text-[var(--text-secondary)]">
                请在插件设置中配置 Giscus 参数（仓库、Repository ID、Category ID）后开始使用。
              </p>
            </div>
            <Link to="/settings" search={{ section: "plugins", plugin: COMMENTS_OVERVIEW_PLUGIN_ID }}>
              <Button variant="secondary">
                <Settings size={16} />
                配置评论系统
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">评论管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            共 {discussions.length} 个 Discussion
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw size={14} />
          刷新
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索讨论..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
          />
        </div>
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList>
            {filterOptions.map((opt) => (
              <TabsTrigger key={opt.id} value={opt.id}>
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading && (
        <div className="text-center py-20 text-[var(--text-tertiary)]">加载中...</div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-500" />
            <div>
              <div className="text-sm font-medium text-red-700">加载失败</div>
              <div className="text-xs text-red-500 mt-0.5">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((discussion) => {
          const isExpanded = expandedIds.has(discussion.id);
          const comments = commentCache[discussion.id] ?? [];
          const isLoadingComments = loadingComments.has(discussion.id);

          return (
            <Card key={discussion.id}>
              <Collapsible open={isExpanded}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={`https://github.com/${pluginConfig.giscusRepo}/discussions/${discussion.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] truncate"
                        >
                          {discussion.title}
                        </a>
                        {discussion.state !== "OPEN" && (
                          <Badge variant={stateConfig[discussion.state]?.variant ?? "default"}>
                            {stateConfig[discussion.state]?.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] line-clamp-1 mb-2">
                        {truncateBody(discussion.body, 100)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        {discussion.author && (
                          <span className="flex items-center gap-1">
                            <img src={discussion.author.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                            {discussion.author.login}
                          </span>
                        )}
                        <span>{timeAgo(discussion.createdAt)}</span>
                        {discussion.category && <Badge variant="default" className="text-[10px]">{discussion.category}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <a
                        href={`https://github.com/${pluginConfig.giscusRepo}/discussions/${discussion.number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <CollapsibleTrigger asChild>
                        <button
                          onClick={() => handleToggleExpand(discussion.id)}
                          className="p-1.5 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <ChevronDown size={14} className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardContent>
                <CollapsibleContent>
                  <div className="border-t border-[var(--border-secondary)] px-4 py-2">
                    {isLoadingComments && (
                      <div className="text-center py-3 text-xs text-[var(--text-tertiary)]">加载评论中...</div>
                    )}
                    {!isLoadingComments && comments.length === 0 && (
                      <div className="text-center py-3 text-xs text-[var(--text-tertiary)]">暂无评论</div>
                    )}
                    {comments.map((comment) => (
                      <div key={comment.id} className="py-2.5 border-b border-[var(--border-secondary)] last:border-0">
                        <div className="flex items-start gap-2.5">
                          <img src={comment.author.avatarUrl} alt="" className="w-5 h-5 rounded-full mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-[var(--text-primary)]">{comment.author.login}</span>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(comment.createdAt)}</span>
                              {comment.isAnswer && (
                                <Badge variant="success" className="text-[10px] h-4 px-1.5">已解决</Badge>
                              )}
                              {comment.isHidden && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5">已隐藏</Badge>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">{comment.body}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleModerateComment(comment.id, comment.isHidden ? "unhide" : "hide")}
                              disabled={moderatingIds.has(comment.id)}
                              className="p-1 rounded hover:bg-[var(--bg-muted)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                              title={comment.isHidden ? "取消隐藏" : "隐藏"}
                            >
                              {comment.isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mb-3">
            <MessageSquare size={20} className="text-[var(--text-tertiary)]" />
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">
            {search || activeFilter !== "all" ? "没有匹配的讨论" : "暂无评论"}
          </div>
        </div>
      )}
    </div>
  );
}
