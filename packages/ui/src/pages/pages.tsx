import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataProvider } from "../context/data-provider-context";
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
} from "lucide-react";

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
};

export function PagesPage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [pages, setPages] = useState<Array<{ id: string; title: string; slug: string; path: string; date: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    setLoading(true);
    setError("");
    try {
      const rawPages = await dataProvider.getPages();
      const formattedPages = rawPages
        .filter((page: any) => !page.path.includes("_posts"))
        .map((page: any, index: number) => ({
          id: String(index + 1),
          title: page.title || page.path.split("/").pop()?.replace(".md", "") || "未命名",
          path: "/" + page.path.replace(/^source\//, "").replace(/\.md$/, ""),
          filePath: page.path,
          slug: page.path.replace(/^source\//, "").replace(/\/index\.md$/, "").replace(/\.md$/, ""),
          status: page.frontmatter?.draft ? "draft" : "published",
          updatedAt: page.date || new Date().toISOString().split("T")[0],
          description: page.frontmatter?.description || (page.content || "").slice(0, 50) + "...",
        }));
      setPages(formattedPages);
    } catch (err: any) {
      console.error("Failed to load pages:", err);
      setError(err.message || "加载页面失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePage(page: any) {
    if (!confirm(`确定要删除页面「${page.title}」吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await dataProvider.deletePage(page.filePath);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
    } catch (err: any) {
      console.error("Failed to delete page:", err);
      setError(err.message || "删除失败");
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
          <Button
            variant="outline"
            onClick={loadPages}
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
                      <button
                        onClick={() => navigate({ to: "/pages/$slug", params: { slug: page.slug } })}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer"
                      >
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
        <button
          onClick={() => navigate({ to: "/pages/new" })}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">新建页面</span>
        </button>
      </div>
    </div>
  );
}

