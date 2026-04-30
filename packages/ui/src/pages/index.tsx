import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  FileText,
  Tags,
  Eye,
  TrendingUp,
  GitCommit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap,
  Loader2,
} from "lucide-react";

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
};

const statColorMap: Record<string, string> = {
  orange: "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
  green: "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalTags: 0,
    totalCategories: 0,
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [repoInfo, setRepoInfo] = useState<string>("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const config = await dataProvider.getConfig();
      if (config) {
        setRepoInfo(`${config.owner}/${config.repo}`);
      }

      const [statsData, tagsData, postsData] = await Promise.all([
        dataProvider.getStats(),
        dataProvider.getTags(),
        dataProvider.getPosts(),
      ]);

      setStats({
        totalPosts: statsData.totalPosts,
        publishedPosts: statsData.publishedPosts,
        draftPosts: statsData.draftPosts,
        totalTags: tagsData.tags.length,
        totalCategories: tagsData.categories.length,
      });

      const recent = postsData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((post) => ({
          title: post.title,
          slug: post.path.replace(/^source\/_posts\//, "").replace(/\.md$/, ""),
          date: post.date,
          status: post.frontmatter?.draft ? "draft" : "published",
        }));
      setRecentPosts(recent);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: "文章总数", value: String(stats.totalPosts), change: `${stats.publishedPosts} 已发布`, icon: FileText, color: "orange" },
    { label: "标签 & 分类", value: String(stats.totalTags + stats.totalCategories), change: `${stats.totalTags} 标签 · ${stats.totalCategories} 分类`, icon: Tags, color: "green" },
    { label: "草稿", value: String(stats.draftPosts), change: "待发布", icon: Clock, color: "warning" },
    { label: "已发布", value: String(stats.publishedPosts), change: "公开文章", icon: Eye, color: "info" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">数据大盘</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {repoInfo || "欢迎回来"}
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/posts/new" })}>
          <Plus size={16} />
          新建文章
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statColorMap[stat.color]}`}>
                    <stat.icon size={18} />
                  </div>
                  <TrendingUp
                    size={14}
                    className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {stat.value}
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{stat.label}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Posts */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>最近文章</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--brand-primary)] gap-1"
                    onClick={() => navigate({ to: "/posts" })}
                  >
                    查看全部 <ArrowRight size={14} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                    <FileText size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">暂无文章</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {recentPosts.map((post) => {
                      const status = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
                      return (
                        <div
                          key={post.slug}
                          onClick={() => navigate({ to: "/posts/$slug", params: { slug: post.slug } })}
                          className="flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--bg-muted)] transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-[var(--brand-primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
                              {post.title}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{post.date}</div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Zap size={16} className="text-[var(--brand-accent)]" />
                  快捷操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "新建文章", icon: Plus, to: "/posts/new", color: "orange" },
                  { label: "管理文章", icon: FileText, to: "/posts", color: "info" },
                  { label: "标签 & 分类", icon: Tags, to: "/tags", color: "green" },
                  { label: "媒体库", icon: Eye, to: "/media", color: "warning" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate({ to: action.to as any })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-muted)] transition-colors cursor-pointer text-left"
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${statColorMap[action.color]}`}>
                      <action.icon size={14} />
                    </div>
                    <span className="text-sm text-[var(--text-primary)]">{action.label}</span>
                    <ArrowRight size={14} className="ml-auto text-[var(--text-tertiary)]" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
