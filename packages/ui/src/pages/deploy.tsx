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
} from "lucide-react";

const deployments = [
  {
    id: "abc1234",
    message: "更新文章：TanStack Start 入门指南",
    branch: "main",
    author: "kebai",
    time: "10 分钟前",
    duration: "1m 23s",
    status: "success",
    url: "https://kebai.github.io",
  },
  {
    id: "def5678",
    message: "新增标签：React, TypeScript",
    branch: "main",
    author: "kebai",
    time: "2 小时前",
    duration: "1m 18s",
    status: "success",
    url: "https://kebai.github.io",
  },
  {
    id: "ghi9012",
    message: "上传媒体文件 3 张",
    branch: "main",
    author: "kebai",
    time: "昨天 16:30",
    duration: "1m 45s",
    status: "success",
    url: "https://kebai.github.io",
  },
  {
    id: "jkl3456",
    message: "修复文章排版问题",
    branch: "main",
    author: "kebai",
    time: "昨天 10:15",
    duration: "—",
    status: "failed",
    url: null,
  },
  {
    id: "mno7890",
    message: "更新主题配置",
    branch: "main",
    author: "kebai",
    time: "3 天前",
    duration: "2m 01s",
    status: "success",
    url: "https://kebai.github.io",
  },
  {
    id: "pqr1234",
    message: "初始化博客内容",
    branch: "main",
    author: "kebai",
    time: "1 周前",
    duration: "3m 12s",
    status: "success",
    url: "https://kebai.github.io",
  },
];

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

export function DeployPage() {
  const successCount = deployments.filter((d) => d.status === "success").length;
  const failedCount = deployments.filter((d) => d.status === "failed").length;

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
        <Button>
          <Play size={16} />
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
          <a
            href="https://kebai.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline cursor-pointer"
          >
            kebai.github.io
            <ExternalLink size={10} />
          </a>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center">
              <Activity size={18} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">成功率</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {Math.round((successCount / deployments.length) * 100)}%
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
                1m 40s
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">最近 5 次部署</div>
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
            <Button variant="ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]">
              <RefreshCw size={14} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[var(--border-default)]">
            {deployments.map((deploy) => {
              const config = statusConfig[deploy.status as keyof typeof statusConfig];
              const Icon = config.icon;
              return (
                <div
                  key={deploy.id}
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
                      {deploy.duration !== "—" && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {deploy.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {deploy.status === "failed" && (
                      <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--brand-primary)] bg-[var(--brand-primary-subtle)] hover:opacity-80 transition-opacity cursor-pointer">
                        <RefreshCw size={12} />
                        重试
                      </button>
                    )}
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
        </CardContent>
      </Card>
    </div>
  );
}
