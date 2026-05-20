import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Tags,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { DashboardWidgetGrid } from "../components/dashboard-widgets";
import { Skeleton, SkeletonCard } from "../components/skeleton";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useDashboard } from "../hooks/use-dashboard-queries";
import { useI18n } from "../i18n/I18nProvider";
import { DashboardExtensionOutlet, usePluginSystem } from "../plugin";

const statColorMap: Record<string, string> = {
  orange: "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
  green: "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { snapshot, getDashboardWidgetRenderer } = usePluginSystem();
  const { t } = useI18n();

  const statusConfig = useMemo(
    () => ({
      published: { label: t("common.published"), variant: "success" as const },
      draft: { label: t("common.draft"), variant: "default" as const },
    }),
    [t],
  );

  const query = useDashboard();
  const data = query.data;
  const loading = query.isPending;
  const error = query.error?.message ?? "";

  const stats = data?.stats ?? {
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalTags: 0,
    totalCategories: 0,
  };
  const recentPosts = data?.recentPosts ?? [];
  const repoInfo = data?.repoInfo ?? "";

  const statCards = useMemo(
    () => [
      {
        label: t("dashboard.statsPosts"),
        value: String(stats.totalPosts),
        change: t("dashboard.statsPublished", { count: stats.publishedPosts }),
        icon: FileText,
        color: "orange",
      },
      {
        label: t("dashboard.statsTags"),
        value: String(stats.totalTags + stats.totalCategories),
        change: t("dashboard.statsTagsSub", {
          tags: stats.totalTags,
          categories: stats.totalCategories,
        }),
        icon: Tags,
        color: "green",
      },
      {
        label: t("dashboard.statsDrafts"),
        value: String(stats.draftPosts),
        change: t("dashboard.statsDraftsSub"),
        icon: Clock,
        color: "warning",
      },
      {
        label: t("dashboard.statsPublishedLabel"),
        value: String(stats.publishedPosts),
        change: t("dashboard.statsPublishedSub"),
        icon: Eye,
        color: "info",
      },
    ],
    [stats, t],
  );

  const pluginWidgets = DashboardExtensionOutlet({
    widgets: snapshot.extensions.dashboardWidgets,
    configs: Object.fromEntries(
      snapshot.plugins.map(({ manifest, config }) => [manifest.id, config]),
    ),
    getRenderer: getDashboardWidgetRenderer,
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton width={128} height={28} />
            <Skeleton width={192} className="mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="flex gap-6">
          <Skeleton variant="card" className="flex-1" />
          <Skeleton variant="card" className="hidden lg:block w-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("dashboard.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {repoInfo || t("dashboard.welcome")}
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/posts/new" })}>
          <Plus size={16} />
          {t("dashboard.createPost")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="flex items-center gap-3 p-4">
          <AlertCircle size={18} className="text-[var(--status-error)] flex-shrink-0" />
          <span className="text-sm text-[var(--status-error)] flex-1">{error}</span>
          <button
            onClick={() => query.refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--status-error)] text-white rounded-md hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RefreshCw size={14} />
            {t("common.retry")}
          </button>
        </Alert>
      )}

      <DashboardWidgetGrid
        children={[
          {
            id: "stats",
            content: (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                  <div key={stat.label} className="stat-card group">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${statColorMap[stat.color]}`}
                      >
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
            ),
          },
          {
            id: "recent-posts",
            content: (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("dashboard.recentPosts")}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--brand-primary)] gap-1"
                      onClick={() => navigate({ to: "/posts" })}
                    >
                      {t("dashboard.viewAll")} <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {recentPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                      <FileText size={32} className="mb-2 opacity-30" />
                      <p className="text-sm">{t("dashboard.emptyPosts")}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-default)]">
                      {recentPosts.map((post) => {
                        const status =
                          statusConfig[post.status as keyof typeof statusConfig] ||
                          statusConfig.draft;
                        return (
                          <button
                            type="button"
                            key={post.slug}
                            onClick={() =>
                              navigate({ to: "/posts/$slug", params: { slug: post.slug } })
                            }
                            className="flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--bg-muted)] transition-colors cursor-pointer group w-full text-left border-none bg-transparent"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center flex-shrink-0">
                              <FileText size={14} className="text-[var(--brand-primary)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {post.title}
                              </div>
                              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                {post.date}
                              </div>
                            </div>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "quick-actions",
            content: (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Zap size={16} className="text-[var(--brand-accent)]" />
                    {t("dashboard.quickActions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    {
                      label: t("dashboard.createPost"),
                      icon: Plus,
                      to: "/posts/new",
                      color: "orange",
                    },
                    {
                      label: t("dashboard.managePosts"),
                      icon: FileText,
                      to: "/posts",
                      color: "info",
                    },
                    {
                      label: t("dashboard.tagsCategories"),
                      icon: Tags,
                      to: "/tags",
                      color: "green",
                    },
                    { label: t("dashboard.mediaLib"), icon: Eye, to: "/media", color: "warning" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => navigate({ to: action.to as "/" })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-muted)] transition-colors cursor-pointer text-left"
                    >
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center ${statColorMap[action.color]}`}
                      >
                        <action.icon size={14} />
                      </div>
                      <span className="text-sm text-[var(--text-primary)]">{action.label}</span>
                      <ArrowRight size={14} className="ml-auto text-[var(--text-tertiary)]" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            ),
          },
          ...pluginWidgets,
        ]}
      />
    </div>
  );
}
