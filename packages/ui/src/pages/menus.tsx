import { useState, useEffect, useCallback } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  Edit3,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Globe,
  Search,
} from "lucide-react";

interface MenuItem {
  id: string;
  key: string;
  label: string;
  url: string;
  icon: string;
}

const COMMON_ICONS = [
  "home", "archive", "tags", "user", "folder", "folder-open",
  "rss", "github", "twitter", "mail", "link", "bookmark",
  "heart", "star", "search", "globe", "calendar", "clock",
  "camera", "image", "video", "music", "file", "file-text",
  "settings", "tool", "coffee", "sun", "moon", "zap",
  "bell", "message-circle", "phone", "map-pin", "briefcase",
  "award", "book", "code", "pen-tool", "terminal",
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

function parseMenuSection(yaml: string): MenuItem[] {
  const menuMatch = yaml.match(/^(?:menu|navigation):\s*\n((?:\s+\w+:.+\n?)+)/m);
  if (!menuMatch) return [];

  const items: MenuItem[] = [];
  const lines = menuMatch[1].split("\n");

  for (const line of lines) {
    const match = line.match(/^\s+(\w+):\s*(.+)$/);
    if (!match) continue;

    const key = match[1];
    const value = match[2].trim();
    const parts = value.split("||").map((s) => s.trim());

    const url = parts[0] || "/";
    const icon = parts[1] || "link";

    items.push({
      id: generateId(),
      key,
      label: key,
      url,
      icon,
    });
  }

  return items;
}

function buildMenuSection(items: MenuItem[]): string {
  if (items.length === 0) return "menu:\n";
  const lines = items.map((item) => `  ${item.key}: ${item.url} || ${item.icon}`);
  return `menu:\n${lines.join("\n")}`;
}

function replaceMenuSection(yaml: string, newMenuSection: string): string {
  const menuRegex = /^(?:menu|navigation):\s*\n((?:\s+\w+:.+\n?)*)/m;
  if (menuRegex.test(yaml)) {
    return yaml.replace(menuRegex, newMenuSection);
  }
  return `${yaml.trimEnd()}\n\n${newMenuSection}`;
}

interface SortableMenuItemProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

function SortableMenuItem({ item, onEdit, onDelete }: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5"
      >
        <GripVertical size={16} />
      </button>

      <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center flex-shrink-0">
        <Globe size={18} className="text-[var(--brand-primary)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-tertiary)] font-mono">{item.url}</span>
          <Badge variant="default" className="text-[10px] py-0 px-1.5">{item.icon}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: Pick<MenuItem, "key" | "label" | "url" | "icon">) => void;
  initial?: MenuItem | null;
  isSaving: boolean;
}

function MenuItemDialog({ open, onOpenChange, onSave, initial, isSaving }: MenuItemDialogProps) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("link");
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setKey(initial.key);
        setLabel(initial.label);
        setUrl(initial.url);
        setIcon(initial.icon);
      } else {
        setKey("");
        setLabel("");
        setUrl("");
        setIcon("link");
      }
      setIconSearch("");
    }
  }, [open, initial]);

  const isEdit = !!initial;
  const canSave = key.trim() && label.trim() && url.trim() && icon.trim();

  const filteredIcons = iconSearch
    ? COMMON_ICONS.filter((i) => i.toLowerCase().includes(iconSearch.toLowerCase()))
    : COMMON_ICONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑菜单项" : "新建菜单项"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改菜单的名称、链接和图标" : "添加一个新的导航菜单项"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">菜单键名</label>
            <Input
              value={key}
              onChange={(e) => { setKey(e.target.value); setLabel(e.target.value); }}
              placeholder="home"
              className="h-10 bg-[var(--bg-base)]"
              disabled={isEdit}
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">YAML 配置中的唯一标识，如 home, archives</p>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">显示名称</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="首页"
              className="h-10 bg-[var(--bg-base)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">链接地址</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
              className="h-10 bg-[var(--bg-base)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
              图标 {icon && <Badge variant="default" className="ml-1 text-[10px] py-0 px-1.5">{icon}</Badge>}
            </label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors mb-2">
              <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索图标..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
            </div>
            <div className="grid grid-cols-8 gap-1.5 max-h-[160px] overflow-y-auto p-1">
              {filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  onClick={() => setIcon(iconName)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    icon === iconName
                      ? "bg-[var(--brand-primary)] text-white"
                      : "bg-[var(--bg-base)] text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  }`}
                  title={iconName}
                >
                  <Globe size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={() => onSave({ key: key.trim(), label: label.trim(), url: url.trim(), icon: icon.trim() })} disabled={!canSave || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : isEdit ? "保存修改" : "添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemLabel,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemLabel: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除菜单项</DialogTitle>
          <DialogDescription>
            确定要删除 <span className="font-medium text-[var(--text-primary)]">{itemLabel}</span> 吗？此操作不可撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isDeleting} className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90">
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MenusPage() {
  const dataProvider = useDataProvider();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [originalYaml, setOriginalYaml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      setError("");
      const content = await dataProvider.readConfigFile("_config.yml");
      setOriginalYaml(content);
      if (content) {
        const parsed = parseMenuSection(content);
        setItems(parsed);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setItems(arrayMove(items, oldIndex, newIndex));
  }

  function openEditDialog(item: MenuItem) {
    setEditingItem(item);
    setEditDialogOpen(true);
  }

  function openAddDialog() {
    setEditingItem(null);
    setEditDialogOpen(true);
  }

  function openDeleteDialog(item: MenuItem) {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  }

  function handleSaveItem(values: Pick<MenuItem, "key" | "label" | "url" | "icon">) {
    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id ? { ...i, ...values } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        { id: generateId(), ...values },
      ]);
    }
    setEditDialogOpen(false);
  }

  function handleDeleteItem() {
    if (!deletingItem) return;
    setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    setDeleteDialogOpen(false);
    setDeletingItem(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const newMenuSection = buildMenuSection(items);
      const updatedYaml = replaceMenuSection(originalYaml, newMenuSection);
      await dataProvider.writeConfigFile("_config.yml", updatedYaml);
      setOriginalYaml(updatedYaml);
      setNotification("菜单配置已保存");
    } catch (err) {
      setNotification(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = useCallback(() => {
    const newMenuSection = buildMenuSection(items);
    const updatedYaml = replaceMenuSection(originalYaml, newMenuSection);
    return updatedYaml !== originalYaml;
  }, [items, originalYaml]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton width={128} height={28} />
        <Skeleton width={256} />
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="card" height={64} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-12 h-12 text-[var(--status-error)]" />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <Button variant="outline" onClick={loadConfig}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <MenuItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveItem}
        initial={editingItem}
        isSaving={false}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteItem}
        itemLabel={deletingItem?.label ?? ""}
        isDeleting={false}
      />

      <Dialog open={!!notification} onOpenChange={() => setNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提示</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">{notification}</p>
          <DialogFooter>
            <Button onClick={() => setNotification(null)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">菜单管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            管理网站导航菜单（{items.length} 个菜单项）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAddDialog}>
            <Plus size={16} />
            添加菜单
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges()}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={16} />
                保存
              </>
            )}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
            <Globe size={40} className="mb-3 opacity-30" />
            <p className="text-sm mb-4">暂无菜单项</p>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus size={14} />
              添加第一个菜单
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableMenuItem
                  key={item.id}
                  item={item}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Card className="border-dashed">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">配置说明</h3>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            菜单配置保存在 Hexo 站点的 <code className="px-1 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)]">_config.yml</code> 文件中。
            每个菜单项包含键名、链接地址和图标名称。拖拽可调整菜单项的顺序。修改后点击"保存"即可更新站点配置。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
