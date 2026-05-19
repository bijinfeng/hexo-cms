import { useMemo, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { usePages, useDeletePage } from "../hooks/use-pages-query";
import { useI18n } from "../i18n/I18nProvider";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ListPage } from "../components/list-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const isListRoute = location.pathname === "/pages";
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<PageItem | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const query = usePages({ enabled: isListRoute });
  const deletePageMutation = useDeletePage();
  const loading = isListRoute && query.isPending;
  const error = query.error?.message ?? "";

  const pages = useMemo<PageItem[]>(() => {
    if (!isListRoute || !query.data) return [];
    return query.data
      .filter((page) => !page.path.includes("_posts"))
      .map((page, index) => ({
        id: String(index + 1),
        title: page.title || page.path.split("/").pop()?.replace(".md", "") || t("pages.list.unnamed"),
        path: "/" + page.path.replace(/^source\//, "").replace(/\.md$/, ""),
        filePath: page.path,
        slug: page.path.replace(/^source\//, "").replace(/\/index\.md$/, "").replace(/\.md$/, ""),
        status: page.frontmatter?.draft ? "draft" : "published",
        description: page.frontmatter?.description || (page.content || "").slice(0, 50) + "...",
      }));
  }, [query.data, isListRoute, t]);

  function handleDeletePage(page: PageItem) {
    setDeleteConfirmPage(page);
  }

  async function confirmDeletePage() {
    if (!deleteConfirmPage) return;
    try {
      await deletePageMutation.mutateAsync(deleteConfirmPage.filePath);
    } catch (err) {
      console.error("Failed to delete page:", err);
      setDeleteError(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setDeleteConfirmPage(null);
    }
  }

  if (!isListRoute) {
    return <Outlet />;
  }

  return (
    <>
      <ListPage<PageItem>
        title={t("pages.list.title")}
        description={t("pages.list.subtitle")}
        loading={loading}
        error={error || deleteError}
        items={pages}
        searchFields={["title", "path"]}
        searchPlaceholder={t("pages.list.searchPlaceholder")}
        onRetry={() => query.refetch()}
        emptyMessage={t("pages.list.empty")}
        headerExtra={
          <Button onClick={() => navigate({ to: "/pages/new" })}>
            <Plus size={16} />
            {t("pages.list.createNew")}
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
                  {page.status === "published" ? t("pages.list.published") : t("pages.list.draft")}
                </Badge>
                <button
                  onClick={() => navigate({ to: `/pages/${page.slug}` })}
                  className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                  title={t("pages.list.edit")}
                >
                  <Edit3 size={14} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={() => handleDeletePage(page)}
                  className="p-2 rounded-lg hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                  title={t("pages.list.delete")}
                >
                  <Trash2 size={14} className="text-[var(--status-error)]" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      />

      <Dialog open={!!deleteConfirmPage} onOpenChange={(v) => !v && setDeleteConfirmPage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.confirm.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("pages.confirm.deleteMessage", { title: deleteConfirmPage?.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPage(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmDeletePage}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              {t("common.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
