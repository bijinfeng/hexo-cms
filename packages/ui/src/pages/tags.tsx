import { useState, useEffect } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tag,
  FolderOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Hash,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

const tagColors = [
  "#61DAFB", "#3178C6", "#FF4154", "#1572B6", "#06B6D4", "#10B981",
  "#F59E0B", "#6B7280", "#8B5CF6", "#EF4444", "#F97316", "#84CC16",
];

type DialogType = "rename" | "delete" | null;

interface DialogState {
  type: DialogType;
  itemType: "tag" | "category";
  itemName: string;
  itemId: string;
}

export function TagsPage() {
  const dataProvider = useDataProvider();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("tags");
  const [tags, setTags] = useState<Array<{ id: string; name: string; slug: string; count: number; color?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; count: number; color?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadTagsAndCategories();
  }, []);

  async function loadTagsAndCategories() {
    try {
      setLoading(true);
      setError("");

      const data = await dataProvider.getTags();
      setTags(data.tags.map((t, i) => ({ ...t, color: tagColors[i % tagColors.length] })));
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function openRenameDialog(type: "tag" | "category", name: string, id: string) {
    setDialog({ type: "rename", itemType: type, itemName: name, itemId: id });
    setNewName(name);
  }

  function openDeleteDialog(type: "tag" | "category", name: string, id: string) {
    setDialog({ type: "delete", itemType: type, itemName: name, itemId: id });
  }

  function closeDialog() {
    setDialog(null);
    setNewName("");
  }

  async function handleRename() {
    if (!dialog || !newName.trim()) return;

    try {
      setProcessing(true);
      await dataProvider.renameTag(dialog.itemType, dialog.itemName, newName.trim());
      closeDialog();
      await loadTagsAndCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!dialog) return;

    try {
      setProcessing(true);
      await dataProvider.deleteTag(dialog.itemType, dialog.itemName);
      closeDialog();
      await loadTagsAndCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    } finally {
      setProcessing(false);
    }
  }

  const filteredTags = tags.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCategories = categories.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton width={128} height={28} />
        <Skeleton width={256} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="card" height={80} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-12 h-12 text-[var(--status-error)]" />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  const renderDialog = () => {
    if (!dialog) return null;

    return (
      <Dialog open={!!dialog} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.type === "rename" ? "重命名" : "删除"}
              {dialog.itemType === "tag" ? "标签" : "分类"}
            </DialogTitle>
            <DialogDescription>
              {dialog.type === "rename" ? (
                <>
                  将 <span className="font-medium text-[var(--text-primary)]">{dialog.itemName}</span> 重命名为：
                </>
              ) : (
                <>
                  确定要删除 <span className="font-medium text-[var(--text-primary)]">{dialog.itemName}</span> 吗？
                  此操作将从所有文章中移除该{dialog.itemType === "tag" ? "标签" : "分类"}。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {dialog.type === "rename" && (
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={processing}
              placeholder="输入新名称"
              className="h-10 bg-[var(--bg-base)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  handleRename();
                }
              }}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={processing}
            >
              取消
            </Button>
            <Button
              onClick={dialog.type === "rename" ? handleRename : handleDelete}
              disabled={processing || (dialog.type === "rename" && !newName.trim())}
              className={dialog.type === "delete" ? "bg-[var(--status-error)] hover:bg-[var(--status-error)]/90" : ""}
            >
              {processing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  处理中...
                </>
              ) : dialog.type === "rename" ? (
                "确认重命名"
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {renderDialog()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">标签 & 分类</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {tags.length} 个标签，{categories.length} 个分类
          </p>
        </div>
        <Button>
          <Plus size={16} />
          {activeTab === "tags" ? "新建标签" : "新建分类"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tags">
            <Tag size={14} />
            标签
            <span className="text-xs text-[var(--text-tertiary)] ml-1">{tags.length}</span>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen size={14} />
            分类
            <span className="text-xs text-[var(--text-tertiary)] ml-1">{categories.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors max-w-sm">
        <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
        <input
          type="text"
          placeholder={activeTab === "tags" ? "搜索标签..." : "搜索分类..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
        />
      </div>

      {activeTab === "tags" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTags.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
              <Hash size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无标签</p>
            </div>
          ) : (
            filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: tag.color + "20" }}
                >
                  <Hash size={14} style={{ color: tag.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{tag.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{tag.count} 篇文章</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openRenameDialog("tag", tag.name, tag.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={() => openDeleteDialog("tag", tag.name, tag.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add new tag card */}
          <button className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
            <Plus size={16} />
            <span className="text-sm font-medium">新建标签</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
              <FolderOpen size={40} className="mb-3 opacity-30" />
              <p className="text-sm">暂无分类</p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <Card key={cat.id} className="hover:shadow-[var(--shadow-sm)] transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--brand-accent-subtle)] flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={16} className="text-[var(--brand-accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{cat.name}</span>
                        <Badge variant="default">{cat.count} 篇</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openRenameDialog("category", cat.name, cat.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteDialog("category", cat.name, cat.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-accent-subtle)] transition-all cursor-pointer">
            <Plus size={16} />
            <span className="text-sm font-medium">新建分类</span>
          </button>
        </div>
      )}
    </div>
  );
}