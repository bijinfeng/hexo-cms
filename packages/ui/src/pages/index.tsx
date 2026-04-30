import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  FileText,
  Tags,
  MessageSquare,
  Eye,
  TrendingUp,
  GitCommit,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Zap,
} from "lucide-react";

const stats = [
  { label: "文章总数", value: "42", change: "+3 本月", icon: FileText, color: "orange" },
  { label: "标签 & 分类", value: "18", change: "+2 本月", icon: Tags, color: "green" },
  { label: "待审评论", value: "7", change: "需要处理", icon: MessageSquare, color: "warning" },
  { label: "本月访问", value: "3,284", change: "+12.5%", icon: Eye, color: "info" },
];

const recentPosts = [
  { title: "TanStack Start 入门指南", date: "2026-04-28", status: "published", views: 234 },
  { title: "构建现代化的 CMS 系统", date: "2026-04-25", status: "published", views: 189 },
  { title: "Better Auth 实践经验", date: "2026-04-20", status: "draft", views: 0 },
  { title: "Tailwind CSS v4 新特性", date: "2026-04-18", status: "published", views: 412 },
];

const deployments = [
  { id: "abc1234", message: "更新文章：TanStack Start 入门指南", time: "10 分钟前", status: "success" },
  { id: "def5678", message: "新增标签：React, TypeScript", time: "2 小时前", status: "success" },
  { id: "ghi9012", message: "上传媒体文件 3 张", time: "昨天", status: "success" },
];

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
  archived: { label: "已归档", variant: "warning" as const },
};

const deployStatusIcon = {
  success: <CheckCircle2 size={14} className="text-[var(--status-success)] flex-shrink-0 mt-0.5" />,
  pending: <Clock size={14} className="text-[var(--status-warning)] flex-shrink-0 mt-0.5" />,
  failed: <AlertCircle size={14} className="text-[var(--status-error)] flex-shrink-0 mt-0.5" />,
};

const statColorMap: Record<string, string> = {
  orange: "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
  green: "bg-[var(--brand-accent-subtle)] text-[var(--brand-accent)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
};

export function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">数据大盘</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            欢迎回来，今天是 2026 年 4 月 30 日
          </p>
        </div>
        <Button>
          <Plus size={16} />
          新建文章
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
              <Button variant="ghost" size="sm" className="text-[var(--brand-primary)] gap-1">
                查看全部 <ArrowRight size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border-default)]">
              {recentPosts.map((post) => {
                const status = statusConfig[post.status as keyof typeof statusConfig];
                return (
                  <div
                    key={post.title}
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
                      {post.views > 0 && (
                        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                          <Eye size={12} />
                          {post.views}
                        </span>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Deploy Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap size={16} className="text-[var(--brand-accent)]" />
                部署记录
              </CardTitle>
              <span className="flex items-center gap-1.5 text-xs text-[var(--status-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                正常
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--border-default)]">
              {deployments.map((deploy) => (
                <div key={deploy.id} className="px-6 py-3.5 hover:bg-[var(--bg-muted)] transition-colors">
                  <div className="flex items-start gap-2">
                    {deployStatusIcon[deploy.status as keyof typeof deployStatusIcon]}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                        {deploy.message}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <GitCommit size={10} className="text-[var(--text-tertiary)]" />
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                          {deploy.id}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          · {deploy.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-[var(--border-default)]">
              <Button variant="ghost" size="sm" className="w-full text-[var(--text-secondary)] gap-1">
                查看全部部署 <ArrowRight size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
