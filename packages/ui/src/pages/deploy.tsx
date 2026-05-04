import { useState, useEffect } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Zap,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  GitBranch,
  Play,
  Activity,
  Globe,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";

const statusConfig = {
  success: {
    icon: CheckCircle2,
    color: "var(--status-success)",
    bg: "var(--status-success-bg)",
    label: "成功",
    variant: "success" as const,
  },
  failed: {
    icon: XCircle,
    color: "var(--status-error)",
    bg: "var(--status-error-bg)",
    label: "失败",
    variant: "error" as const,
  },
  running: {
    icon: RefreshCw,
    color: "var(--status-info)",
    bg: "var(--status-info-bg)",
    label: "运行中",
    variant: "default" as const,
  },
  pending: {
    icon: Clock,
    color: "var(--status-warning)",
    bg: "var(--status-warning-bg)",
    label: "等待中",
    variant: "warning" as const,
  },
};

function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return date.toLocaleDateString("zh-CN");
}

export function DeployPage() {
  const dataProvider = useDataProvider();
  const [deployments, setDeployments] = useState<Array<{ id: string; status: string; createdAt: string; duration: number; conclusion: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [avgDuration, setAvgDuration] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeployments();
  }, []);

  async function loadDeployments() {
    try {
      setLoading(true);
      setError("");

      const config = await dataProvider.getConfig();
      if (!config) {
        setError("请先在设置页面配置 GitHub 仓库");
        return;
      }

      const runs = await dataProvider.getDeployments();
      const formattedRuns = runs.map((run) => ({
        id: run.id,
        name: run.status,
        message: run.conclusion || run.status,
        branch: "main" as const,
        author: "",
        time: formatRelativeTime(run.createdAt),
        duration: run.duration,
        status: (run.conclusion === "success" ? "success" : run.conclusion === "failure" ? "failed" : run.status === "in_progress" ? "running" : "pending") as "success" | "failed" | "running" | "pending",
        url: `https://github.com/${config.owner}/${config.repo}/actions/runs/${run.id}`,
      }));

      setDeployments(formattedRuns);
      setSiteUrl(`https://${config.owner}.github.io/${config.repo}`);

      const success = formattedRuns.filter((r) => r.status === "success").length;
      const failed = formattedRuns.filter((r) => r.status === "failed").length;
      setSuccessCount(success);
      setFailedCount(failed);

      const durations = formattedRuns.filter((r) => r.duration > 0).map((r) => r.duration);
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        setAvgDuration(`${Math.floor(avg / 60000)}m ${Math.floor((avg % 60000) / 1000)}s`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualDeploy() {
    try {
      setDeploying(true);
      const config = await dataProvider.getConfig();
      if (!config) return;
      await dataProvider.triggerDeploy(config.workflow_file || "pages.yml");
      alert("部署已触发，请稍后刷新查看状态");
      setTimeout(() => loadDeployments(), 3000);
    } catch (err: any) {
      alert(err.message || "触发部署失败");
    } finally {
      setDeploying(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDeployments();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={48} className="text-[var(--status-error)]" />
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">部署管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            GitHub Actions 自动化部署到 GitHub Pages
          </p>
        </div>
        <Button onClick={handleManualDeploy} disabled={deploying}>
          {deploying ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          手动触发部署
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--status-success-bg)] flex items-center justify-center">
              <Globe size={18} className="text-[var(--status-success)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">站点状态</div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--status-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                正常运行
              </div>
            </div>
          </div>
          {siteUrl ? (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline cursor-pointer"
            >
              {siteUrl.replace(/^https?:\/\//, "")}
              <ExternalLink size={10} />
            </a>
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">未配置 Pages</span>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center">
              <Activity size={18} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">成功率</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {deployments.length > 0 ? Math.round((successCount / deployments.length) * 100) : 0}%
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            {successCount} 成功 · {failedCount} 失败
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--brand-accent-subtle)] flex items-center justify-center">
              <Server size={18} className="text-[var(--brand-accent)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">平均耗时</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {avgDuration || "—"}
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">最近 {deployments.length} 次部署</div>
        </div>
      </div>

      {/* Deployment List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap size={16} className="text-[var(--brand-accent)]" />
              部署历史
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-[var(--text-secondary)]"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
              <Zap size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无部署记录</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {deployments.map((deploy) => {
                const config = statusConfig[deploy.status as keyof typeof statusConfig];
                const Icon = config.icon;
                const durationLabel = deploy.duration
                  ? `${Math.floor(deploy.duration / 60000)}m ${Math.floor((deploy.duration % 60000) / 1000)}s`
                  : null;
                return (
                  <div
                    key={deploy.id + deploy.time}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group"
                  >
                    {/* Status Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon
                        size={16}
                        style={{ color: config.color }}
                        className={deploy.status === "running" ? "animate-spin" : ""}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {deploy.message}
                        </span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <GitCommit size={10} />
                          <span className="font-mono">{deploy.id}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch size={10} />
                          {deploy.branch}
                        </span>
                        <span>{deploy.time}</span>
                        {durationLabel && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {durationLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deploy.url && (
                        <a
                          href={deploy.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
