import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useDeletePost } from "../hooks/use-posts-query";
import { useI18n } from "../i18n/I18nProvider";
import { PostFilters } from "./posts/PostFilters";
import { useBatchOperations } from "./posts/useBatchOperations";
import { usePostsFilter } from "./posts/usePostsFilter";

export function PostsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const isListRoute = location.pathname === "/posts";
  const deletePostMutation = useDeletePost();

  const {
    posts,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    selectedCategory,
    setSelectedCategory,
    dateRange,
    setDateRange,
    allCategories,
    hasActiveFilters,
    clearAllFilters,
    filtered,
    loadPosts,
    statusConfig,
    filterOptions,
    dateRangeOptions,
  } = usePostsFilter({ enabled: isListRoute });

  const {
    selectedPosts,
    setSelectedPosts,
    batchProcessing,
    batchProgress,
    selectedPostsData,
    selectedDrafts,
    selectedPublished,
    toggleSelectAll,
    toggleSelectPost,
    handleBatchDelete,
    handleBatchPublish,
  } = useBatchOperations(posts);

  const [showFilters, setShowFilters] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showBatchPublishDialog, setShowBatchPublishDialog] = useState(false);
  const [showBatchUnpublishDialog, setShowBatchUnpublishDialog] = useState(false);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<(typeof filtered)[number] | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");

  async function confirmSingleDelete() {
    if (!deleteConfirmPost) return;
    try {
      await deletePostMutation.mutateAsync(deleteConfirmPost.path);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setDeleteConfirmPost(null);
    }
  }

  if (!isListRoute) return <Outlet />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Batch toolbar */}
      {selectedPosts.size > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--brand-primary)] text-white shadow-lg animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {t("posts.list.selected", { count: selectedPosts.size })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPosts(new Set())}
                disabled={batchProcessing}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {t("posts.list.deselect")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {batchProgress && (
                <span className="text-sm">
                  {t("posts.list.batchProgress", {
                    current: batchProgress.current,
                    total: batchProgress.total,
                  })}
                </span>
              )}
              {selectedPublished.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchUnpublishDialog(true)}
                  disabled={batchProcessing}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {t("posts.list.batchCancelPublish")}
                </Button>
              )}
              {selectedDrafts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchPublishDialog(true)}
                  disabled={batchProcessing}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {t("posts.list.batchPublish")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteDialog(true)}
                disabled={batchProcessing}
                className="bg-red-500/90 border-red-400/20 text-white hover:bg-red-600"
              >
                {t("posts.list.batchDelete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete dialog */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posts.confirm.batchDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("posts.confirm.batchDeleteMessage", { count: selectedPosts.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">
              {selectedPostsData.map((post) => (
                <li key={post.id} className="text-[var(--text-primary)]">
                  {post.title}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDeleteDialog(false)}
              disabled={batchProcessing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => handleBatchDelete(setDeleteError)}
              disabled={batchProcessing}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("common.deleting")}
                </>
              ) : (
                t("common.confirmDelete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch publish dialog */}
      <Dialog open={showBatchPublishDialog} onOpenChange={setShowBatchPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posts.confirm.batchPublishTitle")}</DialogTitle>
            <DialogDescription>
              {t("posts.confirm.batchPublishMessage", { count: selectedDrafts.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">
              {selectedDrafts.map((post) => (
                <li key={post.id} className="text-[var(--text-primary)]">
                  {post.title}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchPublishDialog(false)}
              disabled={batchProcessing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowBatchPublishDialog(false);
                handleBatchPublish(true, setDeleteError);
              }}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                t("posts.list.batchPublish")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch unpublish dialog */}
      <Dialog open={showBatchUnpublishDialog} onOpenChange={setShowBatchUnpublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posts.confirm.batchUnpublishTitle")}</DialogTitle>
            <DialogDescription>
              {t("posts.confirm.batchUnpublishMessage", { count: selectedPublished.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">
              {selectedPublished.map((post) => (
                <li key={post.id} className="text-[var(--text-primary)]">
                  {post.title}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchUnpublishDialog(false)}
              disabled={batchProcessing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowBatchUnpublishDialog(false);
                handleBatchPublish(false, setDeleteError);
              }}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                t("posts.list.batchCancelPublish")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete dialog */}
      <Dialog open={!!deleteConfirmPost} onOpenChange={(v) => !v && setDeleteConfirmPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posts.confirm.singleDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("posts.confirm.singleDeleteMessage", { title: deleteConfirmPost?.title ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPost(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmSingleDelete}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              {t("common.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("posts.list.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {t("posts.list.subtitle", {
              count: posts.length,
              published: posts.filter((p) => p.status === "published").length,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadPosts} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t("common.loading")}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {t("posts.list.loadingFromGitHub")}
              </>
            )}
          </Button>
          <Button onClick={() => navigate({ to: "/posts/new" })}>
            <Plus size={16} />
            {t("posts.list.createNew")}
          </Button>
        </div>
      </div>

      {(error || deleteError) && <Alert variant="destructive">{error || deleteError}</Alert>}

      {/* Filters */}
      <PostFilters
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        allCategories={allCategories}
        onClearAll={clearAllFilters}
        filteredCount={filtered.length}
        totalCount={posts.length}
        filterOptions={filterOptions}
        dateRangeOptions={dateRangeOptions}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider min-w-[600px]">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={selectedPosts.size === filtered.length && filtered.length > 0}
                onCheckedChange={() => toggleSelectAll(filtered)}
                disabled={filtered.length === 0}
                aria-label={t("posts.list.selectAll")}
              />
            </div>
            <span>{t("posts.list.columnPost")}</span>
            <span className="hidden md:block">{t("posts.list.columnCategory")}</span>
            <span className="hidden sm:block">{t("posts.list.columnDate")}</span>
            <span>{t("posts.list.columnStatus")}</span>
            <span>{t("posts.list.columnActions")}</span>
          </div>

          <div className="divide-y divide-[var(--border-default)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <FileText size={40} className="mb-3 opacity-30" />
                <p className="text-sm">{t("posts.list.noMatch")}</p>
              </div>
            ) : (
              filtered.map((post) => {
                const status = statusConfig[post.status];
                return (
                  <div
                    key={post.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group ${selectedPosts.has(post.id) ? "bg-[var(--brand-primary-subtle)]" : ""}`}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedPosts.has(post.id)}
                        onCheckedChange={() => toggleSelectPost(post.id)}
                        aria-label={t("posts.list.selectAll")}
                      />
                    </div>
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
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-[var(--brand-primary)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {post.category}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                      <Calendar size={11} />
                      {post.date}
                    </span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <div className="relative flex items-center gap-1">
                      <button
                        onClick={() => navigate({ to: `/posts/${post.slug}` })}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmPost(post)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-[var(--border-default)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span>
                {t("posts.list.showing", { count: filtered.length, total: posts.length })}
              </span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                  {t("posts.list.prevPage")}
                </button>
                <span className="px-2 py-1 rounded bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] font-medium">
                  1
                </span>
                <button className="px-2 py-1 rounded hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                  {t("posts.list.nextPage")}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
