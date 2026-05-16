import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
  Calendar,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";

const comments = [
  {
    id: "1",
    author: "张三",
    email: "zhangsan@example.com",
    avatar: "Z",
    content: "这篇文章写得非常好！TanStack Start 的介绍很详细，帮助我快速上手了这个框架。",
    post: "TanStack Start 入门指南",
    postSlug: "tanstack-start-guide",
    date: "2026-04-29 14:32",
    status: "pending",
    ip: "192.168.1.1",
  },
  {
    id: "2",
    author: "李四",
    email: "lisi@example.com",
    avatar: "L",
    content: "请问有没有关于 TanStack Router 的更多教程？",
    post: "TanStack Start 入门指南",
    postSlug: "tanstack-start-guide",
    date: "2026-04-29 10:15",
    status: "approved",
    ip: "10.0.0.1",
  },
  {
    id: "3",
    author: "王五",
    email: "wangwu@example.com",
    avatar: "W",
    content: "CMS 系统的架构设计很有参考价值，特别是 GitHub 集成的部分。",
    post: "构建现代化的 CMS 系统",
    postSlug: "modern-cms-system",
    date: "2026-04-28 16:45",
    status: "approved",
    ip: "172.16.0.1",
  },
  {
    id: "4",
    author: "Spam Bot",
    email: "spam@spam.com",
    avatar: "S",
    content: "Buy cheap products at www.spam-site.com! Click here for amazing deals!!!",
    post: "Tailwind CSS v4 新特性",
    postSlug: "tailwind-v4-features",
    date: "2026-04-28 09:00",
    status: "spam",
    ip: "1.2.3.4",
  },
  {
    id: "5",
    author: "赵六",
    email: "zhaoliu@example.com",
    avatar: "Z",
    content: "Better Auth 的配置确实比较复杂，希望能有更详细的示例代码。",
    post: "Better Auth 实践经验",
    postSlug: "better-auth-practice",
    date: "2026-04-27 20:30",
    status: "pending",
    ip: "192.168.0.100",
  },
  {
    id: "6",
    author: "孙七",
    email: "sunqi@example.com",
    avatar: "S",
    content: "GitHub Actions 的自动化部署方案很实用，已经在我的项目中应用了。",
    post: "GitHub Actions 自动化部署",
    postSlug: "github-actions-deploy",
    date: "2026-04-26 11:20",
    status: "approved",
    ip: "10.10.10.1",
  },
];

const statusConfig = {
  pending: { label: "待审核", variant: "warning" as const },
  approved: { label: "已通过", variant: "success" as const },
  spam: { label: "垃圾", variant: "error" as const },
  rejected: { label: "已拒绝", variant: "default" as const },
};

const filterOptions = ["全部", "待审核", "已通过", "垃圾"];

const avatarColors = [
  "from-[var(--orange-400)] to-[var(--orange-500)]",
  "from-[var(--green-400)] to-[var(--green-500)]",
  "from-blue-400 to-blue-500",
  "from-purple-400 to-purple-500",
];

export function CommentsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");

  const filtered = comments.filter((c) => {
    const matchSearch =
      !search ||
      c.content.toLowerCase().includes(search.toLowerCase()) ||
      c.author.toLowerCase().includes(search.toLowerCase()) ||
      c.post.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "待审核" && c.status === "pending") ||
      (activeFilter === "已通过" && c.status === "approved") ||
      (activeFilter === "垃圾" && c.status === "spam");
    return matchSearch && matchFilter;
  });

  const pendingCount = comments.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">评论管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            共 {comments.length} 条评论
            {pendingCount > 0 && (
              <span className="ml-2 text-[var(--status-warning)]">
                · {pendingCount} 条待审核
              </span>
            )}
          </p>
        </div>
        {pendingCount > 0 && (
          <Button variant="success">
            <CheckCircle2 size={16} />
            批量通过
          </Button>
        )}
      </div>

      {/* Integration notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--status-info-bg)] border border-[var(--status-info)]">
        <Info size={16} className="text-[var(--status-info)] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-[var(--text-primary)] mb-1">评论系统集成说明</div>
          <div className="text-[var(--text-secondary)]">
            评论管理需要在博客中集成第三方评论系统（如 Giscus、Gitalk、Waline 等）。
            下方展示的是示例数据，实际评论数据需通过对应评论系统的 API 获取。
          </div>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--status-warning-bg)] border border-[var(--status-warning)]">
          <AlertTriangle size={16} className="text-[var(--status-warning)] flex-shrink-0" />
          <p className="text-sm text-[var(--text-primary)]">
            有 <strong>{pendingCount}</strong> 条评论等待审核，请及时处理。
          </p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList>
            {filterOptions.map((opt) => (
              <TabsTrigger key={opt} value={opt}>
                {opt}
                {opt === "待审核" && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--status-warning)] text-white">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
          <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索评论内容、作者..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
        </div>

        <Button variant="outline" size="default" className="gap-2 flex-shrink-0">
          <Filter size={14} />
          筛选
          <ChevronDown size={12} />
        </Button>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">没有找到匹配的评论</p>
          </div>
        ) : (
          filtered.map((comment, i) => {
            const status = statusConfig[comment.status as keyof typeof statusConfig];
            const colorClass = avatarColors[i % avatarColors.length];
            return (
              <Card
                key={comment.id}
                className={`transition-shadow hover:shadow-[var(--shadow-sm)] ${
                  comment.status === "pending" ? "border-[var(--status-warning)]" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                    >
                      {comment.avatar}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {comment.author}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">{comment.email}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                        {comment.content}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <FileText size={11} />
                          <span className="text-[var(--brand-primary)] cursor-pointer hover:underline">
                            {comment.post}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {comment.date}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {comment.status === "pending" && (
                        <>
                          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--status-success)] bg-[var(--status-success-bg)] hover:opacity-80 transition-opacity cursor-pointer">
                            <CheckCircle2 size={12} />
                            通过
                          </button>
                          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--status-error)] bg-[var(--status-error-bg)] hover:opacity-80 transition-opacity cursor-pointer">
                            <XCircle size={12} />
                            拒绝
                          </button>
                        </>
                      )}
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
