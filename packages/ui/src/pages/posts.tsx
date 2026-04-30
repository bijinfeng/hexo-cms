import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  MoreHorizontal,
  ChevronDown,
  Calendar,
  Tag,
  RefreshCw,
} from "lucide-react";

const STATIC_POSTS = [
  {
    id: "1",
    title: "TanStack Start 入门指南",
    slug: "tanstack-start-guide",
    date: "2026-04-28",
    status: "published",
    views: 234,
    tags: ["React", "TanStack"],
    category: "前端开发",
    excerpt: "TanStack Start 是一个基于 Vite 的全栈 React 框架，本文介绍如何快速上手...",
  },
  {
    id: "2",
    title: "构建现代化的 CMS 系统",
    slug: "modern-cms-system",
    date: "2026-04-25",
    status: "published",
    views: 189,
    tags: ["CMS", "架构"],
    category: "系统设计",
    excerpt: "探讨如何使用现代前端技术栈构建一个高效的内容管理系统...",
  },
  {
    id: "3",
    title: "Better Auth 实践经验",
    slug: "better-auth-practice",
    date: "2026-04-20",
    status: "draft",
    views: 0,
    tags: ["Auth", "安全"],
    category: "后端开发",
    excerpt: "Better Auth 是一个现代化的认证库，本文分享在实际项目中的使用经验...",
  },
  {
    id: "4",
    title: "Tailwind CSS v4 新特性",
    slug: "tailwind-v4-features",
    date: "2026-04-18",
    status: "published",
    views: 412,
    tags: ["CSS", "Tailwind"],
    category: "前端开发",
    excerpt: "Tailwind CSS v4 带来了全新的 @theme 指令和更强大的 CSS 变量支持...",
  },
  {
    id: "5",
    title: "GitHub Actions 自动化部署",
    slug: "github-actions-deploy",
    date: "2026-04-15",
    status: "published",
    views: 567,
    tags: ["DevOps", "GitHub"],
    category: "运维",
    excerpt: "使用 GitHub Actions 实现博客的自动化构建和部署到 GitHub Pages...",
  },
  {
    id: "6",
    title: "TypeScript 高级类型技巧",
    slug: "typescript-advanced-types",
    date: "2026-04-10",
    status: "archived",
    views: 891,
    tags: ["TypeScript"],
    category: "前端开发",
    excerpt: "深入探讨 TypeScript 中的条件类型、映射类型和模板字面量类型...",
  },
];

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
  archived: { label: "已归档", variant: "warning" as const },
};

const filterOptions = ["全部", "已发布", "草稿", "已归档"];

export function PostsPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>(STATIC_POSTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");

  useEffect(() => {
    loadGitHubConfig();
  }, []);

  async function loadGitHubConfig() {
    try {
      const [configRes, tokenRes] = await Promise.all([
        fetch("/api/github/config"),
        fetch("/api/auth/token"),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setGithubConfig(configData.config);
      }

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setAccessToken(tokenData.accessToken);
      }
    } catch (err) {
      console.error("Failed to load GitHub config:", err);
    }
  }

  async function loadPostsFromGitHub() {
    if (!githubConfig || !accessToken) {
      setError("请先在设置页面配置 GitHub 仓库");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        owner: githubConfig.owner,
        repo: githubConfig.repo,
        token: accessToken,
      });

      const res = await fetch(`/api/github/posts?${params}`);
      const data = await res.json();

      if (res.ok && data.posts) {
        const formattedPosts = data.posts.map((post: any, index: number) => ({
          id: String(index + 1),
          title: post.title,
          slug: post.path.replace(/^.*\//, "").replace(/\.md$/, ""),
          date: post.date || new Date().toISOString().split("T")[0],
          status: post.frontmatter.draft ? "draft" : "published",
          views: 0,
          tags: Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags : [],
          category: post.frontmatter.category || "未分类",
          excerpt: post.content.slice(0, 100) + "...",
        }));
        setPosts(formattedPosts);
      } else {
        setError(data.error || "加载文章失败");
      }
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("加载文章失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  const filtered = posts.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "已发布" && p.status === "published") ||
      (activeFilter === "草稿" && p.status === "draft") ||
      (activeFilter === "已归档" && p.status === "archived");
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">文章管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            共 {posts.length} 篇文章，{posts.filter((p) => p.status === "published").length} 篇已发布
          </p>
        </div>
        <div className="flex items-center gap-2">
          {githubConfig && accessToken && (
            <Button
              variant="outline"
              onClick={loadPostsFromGitHub}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  从 GitHub 加载
                </>
              )}
            </Button>
          )}
          <Button onClick={() => navigate({ to: "/posts/new" })}>
            <Plus size={16} />
            新建文章
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]">
          {error}
        </div>
      )}

      {/* GitHub config prompt */}
      {!githubConfig && (
        <div className="p-4 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning)] text-sm">
          <p className="text-[var(--text-primary)] font-medium mb-1">未配置 GitHub 仓库</p>
          <p className="text-[var(--text-secondary)]">
            请先在<a href="/settings" className="text-[var(--brand-primary)] hover:underline">设置页面</a>配置你的 GitHub 仓库信息
          </p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeFilter === opt
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
          <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索文章标题、标签..."
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

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            <span>文章</span>
            <span className="hidden md:block">分类</span>
            <span className="hidden sm:block">日期</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[var(--border-default)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <FileText size={40} className="mb-3 opacity-30" />
                <p className="text-sm">没有找到匹配的文章</p>
              </div>
            ) : (
              filtered.map((post) => {
                const status = statusConfig[post.status as keyof typeof statusConfig];
                return (
                  <div
                    key={post.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group"
                  >
                    {/* Title + meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => navigate({ to: `/posts/${post.slug}` })}
                          className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors cursor-pointer text-left"
                        >
                          {post.title}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <Eye size={11} />
                          {post.views > 0 ? post.views : "—"}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag size={11} />
                          {post.tags.map((tag: string) => (
                            <span key={tag} className="text-[var(--brand-primary)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Category */}
                    <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {post.category}
                    </span>

                    {/* Date */}
                    <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                      <Calendar size={11} />
                      {post.date}
                    </span>

                    {/* Status */}
                    <Badge variant={status.variant}>{status.label}</Badge>

                    {/* Actions */}
                    <div className="relative flex items-center gap-1">
                      <button
                        onClick={() => navigate({ to: `/posts/${post.slug}` })}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span>显示 {filtered.length} / {posts.length} 篇</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">上一页</button>
                <span className="px-2 py-1 rounded bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] font-medium">1</span>
                <button className="px-2 py-1 rounded hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">下一页</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
