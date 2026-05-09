import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ListPage } from "../components/list-page";
import {
  Plus,
  Edit3,
  Trash2,
  Globe,
} from "lucide-react";

interface PageItem {
  id: string;
  title: string;
  path: string;
  filePath: string;
  slug: string;
  status: string;
  description: string;
}

export function PagesPage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [pages, setPages] = useState<PageItem[]>([]);
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
        .filter((page) => !page.path.includes("_posts"))
        .map((page, index) => ({
          id: String(index + 1),
          title: page.title || page.path.split("/").pop()?.replace(".md", "") || "未命名",
          path: "/" + page.path.replace(/^source\//, "").replace(/\.md$/, ""),
          filePath: page.path,
          slug: page.path.replace(/^source\//, "").replace(/\/index\.md$/, "").replace(/\.md$/, ""),
          status: page.frontmatter?.draft ? "draft" : "published",
          description: page.frontmatter?.description || (page.content || "").slice(0, 50) + "...",
        }));
      setPages(formattedPages);
    } catch (err) {
      console.error("Failed to load pages:", err);
      setError(err instanceof Error ? err.message : "加载页面失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePage(page: PageItem) {
    if (!confirm(`确定要删除页面「${page.title}」吗？此操作不可恢复。`)) return;
    try {
      await dataProvider.deletePage(page.filePath);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
    } catch (err) {
      console.error("Failed to delete page:", err);
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <ListPage<PageItem>
      title="页面管理"
      description="管理独立页面"
      loading={loading}
      error={error}
      items={pages}
      searchFields={["title", "path"]}
      searchPlaceholder="搜索页面..."
      onRetry={loadPages}
      emptyMessage="还没有页面"
      headerExtra={
        <Button onClick={() => navigate({ to: "/pages/new" })}>
          <Plus size={16} />
          新建页面
        </Button>
      }
      renderItem={(page) => (
        <Card key={page.id} className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center">
                <Globe size={18} className="text-[var(--brand-primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">{page.title}</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{page.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={page.status === "published" ? "success" : "default"}>
                {page.status === "published" ? "已发布" : "草稿"}
              </Badge>
              <button
                onClick={() => navigate({ to: `/pages/${page.slug}` })}
                className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                title="编辑"
              >
                <Edit3 size={14} className="text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={() => handleDeletePage(page)}
                className="p-2 rounded-lg hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                title="删除"
              >
                <Trash2 size={14} className="text-[var(--status-error)]" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
