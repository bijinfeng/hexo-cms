import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { Checkbox } from "../components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  ChevronDown,
  Calendar,
  Tag,
  RefreshCw,
  X,
  ChevronUp,
  Loader2,
} from "lucide-react";


const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
  archived: { label: "已归档", variant: "warning" as const },
};

const filterOptions = ["全部", "已发布", "草稿", "已归档"];

const dateRangeOptions = [
  { label: "全部时间", value: "all" },
  { label: "最近 7 天", value: "7" },
  { label: "最近 30 天", value: "30" },
  { label: "最近 90 天", value: "90" },
];

interface PostDisplayItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  date: string;
  status: "published" | "draft" | "archived";
  views: number;
  tags: string[];
  category: string;
  excerpt: string;
}

export function PostsPage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [posts, setPosts] = useState<PostDisplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [selectedCategory, setSelectedCategory] = useState("全部分类");
  const [dateRange, setDateRange] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // 批量操作状态
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showBatchPublishDialog, setShowBatchPublishDialog] = useState(false);
  const [showBatchUnpublishDialog, setShowBatchUnpublishDialog] = useState(false);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<PostDisplayItem | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const rawPosts = await dataProvider.getPosts();
      const formattedPosts = rawPosts.map((post, index: number) => ({
        id: String(index + 1),
        title: post.title,
        slug: post.path.replace(/^.*\//, "").replace(/\.md$/, ""),
        path: post.path,
        date: post.date || new Date().toISOString().split("T")[0],
        status: (post.frontmatter?.draft ? "draft" : "published") as "published" | "draft" | "archived",
        views: 0,
        tags: Array.isArray(post.frontmatter?.tags) ? post.frontmatter.tags as string[] : [],
        category: typeof post.frontmatter?.category === "string" ? post.frontmatter.category : "未分类",
        excerpt: (post.content || "").slice(0, 100) + "...",
      }));
      setPosts(formattedPosts);
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError(err instanceof Error ? err.message : "加载文章失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePost(post: PostDisplayItem) {
    setDeleteConfirmPost(post);
  }

  async function confirmSingleDelete() {
    if (!deleteConfirmPost) return;
    try {
      await dataProvider.deletePost(deleteConfirmPost.path);
      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirmPost.id));
    } catch (err) {
      console.error("Failed to delete post:", err);
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleteConfirmPost(null);
    }
  }

  // 批量操作：全选/取消全选
  function toggleSelectAll() {
    if (selectedPosts.size === filtered.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filtered.map((p) => p.id)));
    }
  }

  // 批量操作：切换单个文章选择
  function toggleSelectPost(postId: string) {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  }

  // 批量删除
  async function handleBatchDelete() {
    const postsToDelete = posts.filter((p) => selectedPosts.has(p.id));
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: postsToDelete.length });
    setError("");

    let successCount = 0;
    let failedPosts: string[] = [];

    for (let i = 0; i < postsToDelete.length; i++) {
      const post = postsToDelete[i];
      try {
        await dataProvider.deletePost(post.path);
        successCount++;
      } catch {
        failedPosts.push(post.title);
      }

      setBatchProgress({ current: i + 1, total: postsToDelete.length });
    }

    await loadPosts();

    setBatchProcessing(false);
    setBatchProgress(null);
    setSelectedPosts(new Set());
    setShowBatchDeleteDialog(false);

    if (failedPosts.length > 0) {
      setError(`删除完成，${successCount} 篇成功，${failedPosts.length} 篇失败：${failedPosts.join(", ")}`);
    }
  }

  // 批量发布/取消发布
  async function handleBatchPublish(publish: boolean) {
    const postsToUpdate = posts.filter((p) => selectedPosts.has(p.id));
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: postsToUpdate.length });
    setError("");

    let successCount = 0;
    let failedPosts: string[] = [];

    for (let i = 0; i < postsToUpdate.length; i++) {
      const post = postsToUpdate[i];
      try {
        // 先获取完整文章内容
        const fullPost = await dataProvider.getPost(post.path);

        // 更新 draft 状态
        const updatedPost = {
          ...fullPost,
          frontmatter: {
            ...fullPost.frontmatter,
            draft: !publish,
          },
        };

        await dataProvider.savePost(updatedPost);
        successCount++;
      } catch {
        failedPosts.push(post.title);
      }

      setBatchProgress({ current: i + 1, total: postsToUpdate.length });
    }

    await loadPosts();

    setBatchProcessing(false);
    setBatchProgress(null);
    setSelectedPosts(new Set());
    setShowBatchPublishDialog(false);
    setShowBatchUnpublishDialog(false);

    if (failedPosts.length > 0) {
      setError(`操作完成，${successCount} 篇成功，${failedPosts.length} 篇失败：${failedPosts.join(", ")}`);
    }
  }

  // 提取所有分类
  const allCategories = ["全部分类", ...Array.from(new Set(posts.map((p) => p.category)))];

  // 清除所有过滤器
  const clearAllFilters = () => {
    setSearch("");
    setActiveFilter("全部");
    setSelectedCategory("全部分类");
    setDateRange("all");
  };

  // 检查是否有激活的过滤器
  const hasActiveFilters =
    search !== "" ||
    activeFilter !== "全部" ||
    selectedCategory !== "全部分类" ||
    dateRange !== "all";

  // 获取选中文章的详细信息
  const selectedPostsData = posts.filter((p) => selectedPosts.has(p.id));
  const selectedDrafts = selectedPostsData.filter((p) => p.status === "draft");
  const selectedPublished = selectedPostsData.filter((p) => p.status === "published");

  // 过滤逻辑
  const filtered = posts.filter((p) => {
    // 高级搜索：标题、标签、内容、分类
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    // 状态过滤
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "已发布" && p.status === "published") ||
      (activeFilter === "草稿" && p.status === "draft") ||
      (activeFilter === "已归档" && p.status === "archived");

    // 分类过滤
    const matchCategory =
      selectedCategory === "全部分类" || p.category === selectedCategory;

    // 日期范围过滤
    const matchDateRange = (() => {
      if (dateRange === "all") return true;
      const postDate = new Date(p.date);
      const now = new Date();
      const daysAgo = parseInt(dateRange);
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      return postDate >= cutoffDate;
    })();

    return matchSearch && matchFilter && matchCategory && matchDateRange;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 批量操作工具栏 */}
      {selectedPosts.size > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--brand-primary)] text-white shadow-lg animate-fade-in">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                已选择 {selectedPosts.size} 篇文章
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPosts(new Set())}
                disabled={batchProcessing}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                取消选择
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {batchProgress && (
                <span className="text-sm">
                  处理中: {batchProgress.current} / {batchProgress.total}
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
                  批量取消发布
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
                  批量发布
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteDialog(true)}
                disabled={batchProcessing}
                className="bg-red-500/90 border-red-400/20 text-white hover:bg-red-600"
              >
                批量删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认对话框 */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除以下 {selectedPosts.size} 篇文章吗？此操作不可恢复。
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
              取消
            </Button>
            <Button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量发布确认对话框 */}
      <Dialog open={showBatchPublishDialog} onOpenChange={setShowBatchPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量发布</DialogTitle>
            <DialogDescription>
              确定要发布以下 {selectedDrafts.length} 篇草稿文章吗？
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
              取消
            </Button>
            <Button
              onClick={() => handleBatchPublish(true)}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  发布中...
                </>
              ) : (
                "确认发布"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量取消发布确认对话框 */}
      <Dialog open={showBatchUnpublishDialog} onOpenChange={setShowBatchUnpublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量取消发布</DialogTitle>
            <DialogDescription>
              确定要取消发布以下 {selectedPublished.length} 篇文章吗？
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
              取消
            </Button>
            <Button
              onClick={() => handleBatchPublish(false)}
              disabled={batchProcessing}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  处理中...
                </>
              ) : (
                "确认取消发布"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 单篇删除确认对话框 */}
      <Dialog open={!!deleteConfirmPost} onOpenChange={(v) => !v && setDeleteConfirmPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文章「{deleteConfirmPost?.title}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmPost(null)}>
              取消
            </Button>
            <Button
              onClick={confirmSingleDelete}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">文章管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            共 {posts.length} 篇文章，{posts.filter((p) => p.status === "published").length} 篇已发布
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadPosts}
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
          <Button onClick={() => navigate({ to: "/posts/new" })}>
            <Plus size={16} />
            新建文章
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}


      {/* Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <ToggleGroup type="single" value={activeFilter} onValueChange={(v) => v && setActiveFilter(v)}>
            {filterOptions.map((opt) => (
              <ToggleGroupItem key={opt} value={opt} size="default">
                {opt}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
            <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="text"
              placeholder="搜索标题、标签、内容、分类..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="default"
            className="gap-2 flex-shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} className={hasActiveFilters ? "text-[var(--brand-primary)]" : ""} />
            高级筛选
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Category Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                      分类
                    </label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {allCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filter */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                      日期范围
                    </label>
                    <ToggleGroup type="single" value={dateRange} onValueChange={(v) => v && setDateRange(v)}>
                      {dateRangeOptions.map((opt) => (
                        <ToggleGroupItem key={opt.value} value={opt.value} size="sm" className="flex-1 text-xs">
                          {opt.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>

                {/* Active Filters & Clear Button */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[var(--text-tertiary)]">激活的过滤器:</span>
                      {search && (
                        <Badge variant="default" className="gap-1">
                          搜索: {search.slice(0, 20)}
                          {search.length > 20 && "..."}
                        </Badge>
                      )}
                      {activeFilter !== "全部" && (
                        <Badge variant="default">状态: {activeFilter}</Badge>
                      )}
                      {selectedCategory !== "全部分类" && (
                        <Badge variant="default">分类: {selectedCategory}</Badge>
                      )}
                      {dateRange !== "all" && (
                        <Badge variant="default">
                          日期: {dateRangeOptions.find((o) => o.value === dateRange)?.label}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="gap-1 flex-shrink-0"
                    >
                      <X size={12} />
                      清除所有
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Results Count */}
        {(hasActiveFilters || filtered.length !== posts.length) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-secondary)]">
              显示 <span className="font-semibold text-[var(--brand-primary)]">{filtered.length}</span> / {posts.length} 篇文章
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer text-xs underline"
              >
                清除过滤
              </button>
            )}
          </div>
        )}
      </div>

      {/* Posts Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider min-w-[600px]">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={selectedPosts.size === filtered.length && filtered.length > 0}
                onCheckedChange={() => toggleSelectAll()}
                disabled={filtered.length === 0}
                aria-label="全选"
              />
            </div>
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
                const isSelected = selectedPosts.has(post.id);
                return (
                  <div
                    key={post.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-[var(--bg-muted)] transition-colors group ${
                      isSelected ? "bg-[var(--brand-primary-subtle)]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectPost(post.id)}
                        aria-label={`选择 ${post.title}`}
                      />
                    </div>

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
                      <button
                        onClick={() => handleDeletePost(post)}
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
