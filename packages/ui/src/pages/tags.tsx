import {
  AlertCircle,
  ChevronRight,
  Edit3,
  FolderOpen,
  GitMerge,
  Hash,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Skeleton } from "../components/skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useDeleteTag, useMergeTag, useRenameTag, useTags } from "../hooks/use-tags-query";
import { useI18n } from "../i18n/I18nProvider";

const tagColors = [
  "#61DAFB",
  "#3178C6",
  "#FF4154",
  "#1572B6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#6B7280",
  "#8B5CF6",
  "#EF4444",
  "#F97316",
  "#84CC16",
];

type DialogType = "rename" | "delete" | "merge" | null;

interface DialogState {
  type: DialogType;
  itemType: "tag" | "category";
  itemName: string;
  itemId: string;
}

export function TagsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("tags");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [newName, setNewName] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const query = useTags();
  const loading = query.isPending;
  const error = query.error?.message ?? "";
  const tags = (query.data?.tags ?? []).map((t, i) => ({
    ...t,
    color: tagColors[i % tagColors.length],
  }));
  const categories = query.data?.categories ?? [];

  const renameMutation = useRenameTag();
  const deleteMutation = useDeleteTag();
  const mergeMutation = useMergeTag();
  const processing =
    renameMutation.isPending || deleteMutation.isPending || mergeMutation.isPending;

  function openRenameDialog(type: "tag" | "category", name: string, id: string) {
    setDialog({ type: "rename", itemType: type, itemName: name, itemId: id });
    setNewName(name);
  }

  function openDeleteDialog(type: "tag" | "category", name: string, id: string) {
    setDialog({ type: "delete", itemType: type, itemName: name, itemId: id });
  }

  function openMergeDialog(type: "tag" | "category", name: string, id: string) {
    setDialog({ type: "merge", itemType: type, itemName: name, itemId: id });
    setMergeTarget("");
  }

  function closeDialog() {
    setDialog(null);
    setNewName("");
  }

  async function handleRename() {
    if (!dialog || !newName.trim()) return;

    try {
      await renameMutation.mutateAsync({
        type: dialog.itemType,
        name: dialog.itemName,
        newName: newName.trim(),
      });
      closeDialog();
    } catch (err) {
      setNotification(err instanceof Error ? err.message : t("common.renameFailed"));
    }
  }

  async function handleDelete() {
    if (!dialog) return;

    try {
      await deleteMutation.mutateAsync({
        type: dialog.itemType,
        name: dialog.itemName,
      });
      closeDialog();
    } catch (err) {
      setNotification(err instanceof Error ? err.message : t("common.deleteFailed"));
    }
  }

  async function handleMerge() {
    if (!dialog || !mergeTarget) return;

    try {
      await mergeMutation.mutateAsync({
        type: dialog.itemType,
        name: dialog.itemName,
        target: mergeTarget,
      });
      closeDialog();
      setNotification(null);
    } catch (err) {
      setNotification(err instanceof Error ? err.message : t("common.mergeFailed"));
    }
  }

  const filteredTags = tags.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCategories = categories.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton width={128} height={28} />
        <Skeleton width={256} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="card" height={80} />
          ))}
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

    const isRename = dialog.type === "rename";
    const isDelete = dialog.type === "delete";
    const isMerge = dialog.type === "merge";

    const titleText = isRename
      ? t("tags.renameDialogTitle")
      : isDelete
        ? t("tags.deleteDialogTitle")
        : t("tags.mergeDialogTitle");
    const typeLabel = dialog.itemType === "tag" ? t("tags.tagItem") : t("tags.categoryItem");
    const itemList = dialog.itemType === "tag" ? filteredTags : filteredCategories;
    const mergeCandidates = itemList.filter((i) => i.name !== dialog.itemName);

    return (
      <Dialog open={!!dialog} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {titleText}
              {typeLabel}
            </DialogTitle>
            <DialogDescription>
              {isRename && t("tags.renameHint", { name: dialog.itemName })}
              {isDelete && (
                <>
                  {t("tags.deleteHint", { name: dialog.itemName })}
                  {t("tags.deleteWarning", { typeLabel })}
                </>
              )}
              {isMerge && (
                <>
                  {t("tags.mergeHint", { name: dialog.itemName, typeLabel })}
                  {t("tags.mergeWarning", { typeLabel })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {isRename && (
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={processing}
              placeholder={t("tags.inputNewName")}
              className="h-10 bg-[var(--bg-base)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  handleRename();
                }
              }}
            />
          )}
          {isMerge && (
            <Select value={mergeTarget} onValueChange={setMergeTarget} disabled={processing}>
              <SelectTrigger>
                <SelectValue placeholder={t("tags.selectTarget")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {mergeCandidates.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name} ({t("tags.postsCountShort", { count: item.count })})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={isRename ? handleRename : isMerge ? handleMerge : handleDelete}
              disabled={processing || (isRename && !newName.trim()) || (isMerge && !mergeTarget)}
              className={
                isDelete ? "bg-[var(--status-error)] hover:bg-[var(--status-error)]/90" : ""
              }
            >
              {processing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("common.processing")}
                </>
              ) : isRename ? (
                t("common.confirmRename")
              ) : isMerge ? (
                t("common.confirmMerge")
              ) : (
                t("common.confirmDelete")
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("tags.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {t("tags.subtitle", { tagCount: tags.length, catCount: categories.length })}
          </p>
        </div>
        <Button>
          <Plus size={16} />
          {activeTab === "tags" ? t("tags.newTag") : t("tags.newCategory")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tags">
            <Tag size={14} />
            {t("tags.tabTags")}
            <span className="text-xs text-[var(--text-tertiary)] ml-1">{tags.length}</span>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen size={14} />
            {t("tags.tabCategories")}
            <span className="text-xs text-[var(--text-tertiary)] ml-1">{categories.length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors max-w-sm">
        <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
        <input
          type="text"
          placeholder={activeTab === "tags" ? t("tags.searchTags") : t("tags.searchCategories")}
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
              <p className="text-sm">{t("tags.emptyTags")}</p>
            </div>
          ) : (
            filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tag.color}20` }}
                >
                  <Hash size={14} style={{ color: tag.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {tag.name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {t("tags.postsCount", { count: tag.count })}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openMergeDialog("tag", tag.name, tag.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-accent-subtle)] transition-colors cursor-pointer"
                    title={t("tags.mergeTo")}
                  >
                    <GitMerge size={12} />
                  </button>
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
            <span className="text-sm font-medium">{t("tags.newTag")}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
              <FolderOpen size={40} className="mb-3 opacity-30" />
              <p className="text-sm">{t("tags.emptyCategories")}</p>
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
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {cat.name}
                        </span>
                        <Badge variant="default">
                          {t("tags.postsCountShort", { count: cat.count })}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openMergeDialog("category", cat.name, cat.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-accent-subtle)] transition-colors cursor-pointer"
                        title={t("tags.mergeTo")}
                      >
                        <GitMerge size={14} />
                      </button>
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
            <span className="text-sm font-medium">{t("tags.newCategory")}</span>
          </button>
        </div>
      )}

      <Dialog open={!!notification} onOpenChange={() => setNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.tip")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">{notification}</p>
          <DialogFooter>
            <Button onClick={() => setNotification(null)}>{t("common.ok")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
