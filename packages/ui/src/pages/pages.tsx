import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Globe,
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
};

export function PagesPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      if (configRes.ok && tokenRes.ok) {
        await loadPagesFromGitHub();
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPagesFromGitHub() {
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

      const res = await fetch(`/api/github/pages?${params}`);
      const data = await res.json();

      if (res.ok && data.pages) {
        const formattedPages = data.pages
          .filter((page: any) => !page.path.includes("_posts"))
          .map((page: any, index: number) => ({
            id: String(index + 1),
            title: page.title || page.path.split("/").pop()?.replace(".md", "") || "未命名",
            path: "/" + page.path.replace(/^source\//, "").replace(/\.md$/, ""),
            filePath: page.path,
            status: page.frontmatter.draft ? "draft" : "published",
            updatedAt: page.date || new Date().toISOString().split("T")[0],
            description: page.frontmatter.description || page.content.slice(0, 50) + "...",
          }));
        setPages(formattedPages);
      } else {
        setError(data.error || "加载页面失败");
      }
    } catch (err) {
      console.error("Failed to load pages:", err);
      setError("加载页面失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePage(page: any) {
    if (!confirm(`确定要删除页面「${page.title}」吗？此操作不可恢复。`)) {
      return;
    }

    if (!githubConfig || !accessToken) {
      setError("请先在设置页面配置 GitHub 仓库");
      return;
    }

    try {
      const res = await fetch("/api/github/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          token: accessToken,
          path: page.filePath,
          commitMessage: `删除页面: ${page.title}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPages((prev) => prev.filter((p) => p.id !== page.id));
      } else {
        setError(data.error || "删除失败");
      }
    } catch (err) {
      console.error("Failed to delete page:", err);
      setError("删除失败，请检查网络连接");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">页面管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {pages.length} 个页面
          </p>
        </div>
        <div className="flex items-center gap-2">
          {githubConfig && accessToken && (
            <Button
              variant="outline"
              onClick={loadPagesFromGitHub}
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
          <Button onClick={() => navigate({ to: "/pages/new" })}>
            <Plus size={16} />
            新建页面
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
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-[var(--text-primary)] mb-1">未配置 GitHub 仓库</div>
              <div className="text-[var(--text-secondary)]">
                请前往设置页面配置 GitHub 仓库信息后，即可从 GitHub 加载页面数据
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">暂无页面</p>
          </div>
        ) : (
          pages.map((page) => {
            const status = statusConfig[page.status as keyof typeof statusConfig];
            return (
              <Card
                key={page.id}
                className="hover:shadow-[var(--shadow-sm)] transition-shadow group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[var(--brand-primary)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {page.title}
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1 font-mono">
                          <Globe size={10} />
                          {page.path}
                        </span>
                        <span>{page.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer">
                        <Edit3 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePage(page)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Add new page */}
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
          <Plus size={16} />
          <span className="text-sm font-medium">新建页面</span>
        </button>
      </div>
    </div>
  );
}

