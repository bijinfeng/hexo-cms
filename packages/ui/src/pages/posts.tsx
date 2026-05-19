import { useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { Checkbox } from "../components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  FileText, Plus, Eye, Edit3, Trash2, Calendar, Tag, RefreshCw, Loader2,
} from "lucide-react";
import { useDeletePost } from "../hooks/use-posts-query";
import { usePostsFilter, statusConfig } from "./posts/usePostsFilter";
import { useBatchOperations } from "./posts/useBatchOperations";
import { PostFilters } from "./posts/PostFilters";

export function PostsPage() {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const isListRoute = location.pathname === "/posts";
  const deletePostMutation = useDeletePost();

  const {
    posts, loading, error,
    search, setSearch,
    activeFilter, setActiveFilter,
    selectedCategory, setSelectedCategory,
    dateRange, setDateRange,
    allCategories, hasActiveFilters, clearAllFilters,
    filtered, loadPosts,
  } = usePostsFilter({ enabled: isListRoute });

  const {
    selectedPosts, setSelectedPosts,
    batchProcessing, batchProgress,
    selectedPostsData, selectedDrafts, selectedPublished,
    toggleSelectAll, toggleSelectPost,
    handleBatchDelete, handleBatchPublish,
  } = useBatchOperations(posts);

  const [showFilters, setShowFilters] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showBatchPublishDialog, setShowBatchPublishDialog] = useState(false);
  const [showBatchUnpublishDialog, setShowBatchUnpublishDialog] = useState(false);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<(typeof filtered)[number] | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function confirmSingleDelete() {
    if (!deleteConfirmPost) return;
    try {
      await deletePostMutation.mutateAsync(deleteConfirmPost.path);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
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
              <span className="font-medium">已选择 {selectedPosts.size} 篇文章</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedPosts(new Set())} disabled={batchProcessing} className="bg-white/10 border-white/20 text-white hover:bg-white/20">取消选择</Button>
            </div>
            <div className="flex items-center gap-2">
              {batchProgress && <span className="text-sm">处理中: {batchProgress.current} / {batchProgress.total}</span>}
              {selectedPublished.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowBatchUnpublishDialog(true)} disabled={batchProcessing} className="bg-white/10 border-white/20 text-white hover:bg-white/20">批量取消发布</Button>
              )}
              {selectedDrafts.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowBatchPublishDialog(true)} disabled={batchProcessing} className="bg-white/10 border-white/20 text-white hover:bg-white/20">批量发布</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowBatchDeleteDialog(true)} disabled={batchProcessing} className="bg-red-500/90 border-red-400/20 text-white hover:bg-red-600">批量删除</Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete dialog */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认批量删除</DialogTitle><DialogDescription>确定要删除以下 {selectedPosts.size} 篇文章吗？此操作不可恢复。</DialogDescription></DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">{selectedPostsData.map((post) => <li key={post.id} className="text-[var(--text-primary)]">{post.title}</li>)}</ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteDialog(false)} disabled={batchProcessing}>取消</Button>
            <Button onClick={() => handleBatchDelete(setDeleteError)} disabled={batchProcessing} className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90">
              {batchProcessing ? <><Loader2 size={16} className="animate-spin" />删除中...</> : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch publish dialog */}
      <Dialog open={showBatchPublishDialog} onOpenChange={setShowBatchPublishDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认批量发布</DialogTitle><DialogDescription>确定要发布以下 {selectedDrafts.length} 篇草稿文章吗？</DialogDescription></DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">{selectedDrafts.map((post) => <li key={post.id} className="text-[var(--text-primary)]">{post.title}</li>)}</ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchPublishDialog(false)} disabled={batchProcessing}>取消</Button>
            <Button onClick={() => { setShowBatchPublishDialog(false); handleBatchPublish(true, setDeleteError); }} disabled={batchProcessing}>
              {batchProcessing ? <><Loader2 size={16} className="animate-spin" />发布中...</> : "确认发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch unpublish dialog */}
      <Dialog open={showBatchUnpublishDialog} onOpenChange={setShowBatchUnpublishDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认批量取消发布</DialogTitle><DialogDescription>确定要取消发布以下 {selectedPublished.length} 篇文章吗？</DialogDescription></DialogHeader>
          <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <ul className="space-y-1 text-sm">{selectedPublished.map((post) => <li key={post.id} className="text-[var(--text-primary)]">{post.title}</li>)}</ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchUnpublishDialog(false)} disabled={batchProcessing}>取消</Button>
            <Button onClick={() => { setShowBatchUnpublishDialog(false); handleBatchPublish(false, setDeleteError); }} disabled={batchProcessing}>
              {batchProcessing ? <><Loader2 size={16} className="animate-spin" />处理中...</> : "确认取消发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete dialog */}
      <Dialog open={!!deleteConfirmPost} onOpenChange={(v) => !v && setDeleteConfirmPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>确定要删除文章「{deleteConfirmPost?.title}」吗？此操作不可恢复。</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPost(null)}>取消</Button>
            <Button onClick={confirmSingleDelete} className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">文章管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">共 {posts.length} 篇文章，{posts.filter((p) => p.status === "published").length} 篇已发布</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadPosts} disabled={loading}>
            {loading ? <><RefreshCw size={16} className="animate-spin" />加载中...</> : <><RefreshCw size={16} />从 GitHub 加载</>}
          </Button>
          <Button onClick={() => navigate({ to: "/posts/new" })}><Plus size={16} />新建文章</Button>
        </div>
      </div>

      {(error || deleteError) && <Alert variant="destructive">{error || deleteError}</Alert>}

      {/* Filters */}
      <PostFilters
        search={search} onSearchChange={setSearch}
        activeFilter={activeFilter} onActiveFilterChange={setActiveFilter}
        showFilters={showFilters} onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        selectedCategory={selectedCategory} onSelectedCategoryChange={setSelectedCategory}
        dateRange={dateRange} onDateRangeChange={setDateRange}
        allCategories={allCategories} onClearAll={clearAllFilters}
        filteredCount={filtered.length} totalCount={posts.length}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider min-w-[600px]">
            <div className="flex items-center justify-center">
              <Checkbox checked={selectedPosts.size === filtered.length && filtered.length > 0} onCheckedChange={() => toggleSelectAll(filtered)} disabled={filtered.length === 0} aria-label="全选" />
            </div>
            <span>文章</span>
            <span className="hidden md:block">分类</span>
            <span className="hidden sm:block">日期</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <div className="divide-y divide-[var(--border-default)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                <FileText size={40} className="mb-3 opacity-30" />
                <p className="text-sm">没有找到匹配的文章</p>
              </div>
            ) : (
              filtered.map((post) => {
                const status = statusConfig[post.status];
                return (
                  <div key={post.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group ${selectedPosts.has(post.id) ? "bg-[var(--brand-primary-subtle)]" : ""}`}>
                    <div className="flex items-center justify-center">
                      <Checkbox checked={selectedPosts.has(post.id)} onCheckedChange={() => toggleSelectPost(post.id)} aria-label={`选择 ${post.title}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => navigate({ to: `/posts/${post.slug}` })} className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors cursor-pointer text-left">{post.title}</button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1"><Eye size={11} />{post.views > 0 ? post.views : "—"}</span>
                        <div className="flex items-center gap-1 flex-wrap"><Tag size={11} />{post.tags.map((tag) => <span key={tag} className="text-[var(--brand-primary)]">{tag}</span>)}</div>
                      </div>
                    </div>
                    <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">{post.category}</span>
                    <span className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-tertiary)] whitespace-nowrap"><Calendar size={11} />{post.date}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <div className="relative flex items-center gap-1">
                      <button onClick={() => navigate({ to: `/posts/${post.slug}` })} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                      <button onClick={() => setDeleteConfirmPost(post)} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

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
