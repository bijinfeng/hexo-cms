import { useState, useEffect, useRef, useMemo } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { useMediaFiles, useDeleteMedia } from "../hooks/use-media-query";
import { useI18n } from "../i18n/I18nProvider";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { usePluginSystem } from "../plugin";
import {
  Upload,
  Search,
  Grid3x3,
  List,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Trash2,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";

const typeConfig = {
  image: { icon: ImageIcon, color: "var(--brand-primary)" },
  video: { icon: Film, color: "var(--brand-accent)" },
  audio: { icon: Music, color: "var(--orange-500)" },
  document: { icon: FileText, color: "var(--text-secondary)" },
};

const CORE_FILTER_OPTIONS = ["全部", "图片", "视频", "音频"];
const ATTACHMENT_FILTER_OPTION = "文档";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "avi"];
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac"];

function getFileType(name: string): keyof typeof typeConfig {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  return "document";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPage() {
  const { t } = useI18n();
  const dataProvider = useDataProvider();
  const { snapshot } = usePluginSystem();
  const hasDocumentFilter = snapshot.extensions.uiFlags.some(
    (flag) => flag.flag === "media.documentFilter",
  );
  const hasMediaSearch = snapshot.extensions.uiFlags.some(
    (flag) => flag.flag === "media.search",
  );
  const filterOptions = hasDocumentFilter
    ? [...CORE_FILTER_OPTIONS, ATTACHMENT_FILTER_OPTION]
    : CORE_FILTER_OPTIONS;
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copiedPath, setCopiedPath] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterLabels = useMemo<Record<string, string>>(() => ({
    "全部": t("media.all"),
    "图片": t("media.typeImage"),
    "视频": t("media.typeVideo"),
    "音频": t("media.typeAudio"),
    "文档": t("media.typeDocument"),
  }), [t]);

  const typeLabels = useMemo<Record<keyof typeof typeConfig, string>>(() => ({
    image: t("media.typeImage"),
    video: t("media.typeVideo"),
    audio: t("media.typeAudio"),
    document: t("media.typeDocument"),
  }), [t]);

  const mediaQuery = useMediaFiles();
  const deleteMediaMutation = useDeleteMedia();
  const mediaItems = mediaQuery.data ?? [];
  const loading = mediaQuery.isPending;
  const error = mediaQuery.error?.message ?? "";

  useEffect(() => {
    if (!hasDocumentFilter && activeFilter === ATTACHMENT_FILTER_OPTION) {
      setActiveFilter("全部");
    }
    if (!hasMediaSearch && search) {
      setSearch("");
    }
  }, [activeFilter, hasDocumentFilter, hasMediaSearch, search]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setActionError("");

    try {
      const config = await dataProvider.getConfig();
      if (!config) {
        setActionError(t("media.noConfig"));
        return;
      }

      const dir = config.media_dir || "source/images";
      for (const file of Array.from(files)) {
        const path = `${dir}/${file.name}`;
        await dataProvider.uploadMedia(file, path);
      }
      await mediaQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("media.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(path: string) {
    try {
      await deleteMediaMutation.mutateAsync(path);
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("common.deleteFailed"));
    }
  }

  function toggleSelect(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelectAll() {
    const allPaths = new Set(filtered.map((item) => item.path));
    if (selectedPaths.size === allPaths.size && allPaths.size > 0) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(allPaths);
    }
  }

  async function handleBatchDelete() {
    if (selectedPaths.size === 0) return;
    setBatchDeleting(true);
    setActionError("");
    try {
      for (const path of selectedPaths) {
        await dataProvider.deleteMedia(path);
      }
      setSelectedPaths(new Set());
      await mediaQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("media.batchDeleteFailed"));
    } finally {
      setBatchDeleting(false);
    }
  }

  function copyPath(item: any) {
    const mdPath = `![${item.name}](/${item.path})`;
    navigator.clipboard.writeText(mdPath);
    setCopiedPath(item.path);
    setTimeout(() => setCopiedPath(""), 2000);
  }

  const filtered = mediaItems.filter((item) => {
    const type = getFileType(item.name);
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "图片" && type === "image") ||
      (activeFilter === "视频" && type === "video") ||
      (activeFilter === "音频" && type === "audio") ||
      (hasDocumentFilter && activeFilter === ATTACHMENT_FILTER_OPTION && type === "document");
    return matchSearch && matchFilter;
  });

  const totalSize = mediaItems.reduce((acc, item) => acc + (item.size || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("media.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {t("media.subtitle", { count: mediaItems.length, size: formatSize(totalSize) })}
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? t("media.uploading") : t("media.uploadFile")}
        </Button>
      </div>

      {/* Error */}
      {(error || actionError) && (
        <Alert variant="destructive">
          {error || actionError}
        </Alert>
      )}


      {/* Batch actions */}
      {selectedPaths.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--brand-primary-subtle)] border border-[var(--brand-primary-muted)]">
          <span className="text-sm font-medium text-[var(--brand-primary)]">
            {t("media.selected", { count: selectedPaths.size })}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-[var(--status-error)] border-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
            onClick={handleBatchDelete}
            disabled={batchDeleting}
          >
            {batchDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {t("media.batchDelete")}
          </Button>
          <button
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            onClick={() => setSelectedPaths(new Set())}
          >
            {t("media.deselect")}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={activeFilter} onValueChange={setActiveFilter}>
          <TabsList>
            {filterOptions.map((opt) => (
              <TabsTrigger key={opt} value={opt}>
                {filterLabels[opt] ?? opt}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {hasMediaSearch && (
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
            <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="text"
              placeholder={t("media.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")}>
            <ToggleGroupItem value="grid" size="sm" className="w-7 h-7">
              <Grid3x3 size={14} />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" size="sm" className="w-7 h-7">
              <List size={14} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span className="text-sm">{t("common.loading")}</span>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const type = getFileType(item.name);
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <div
                key={item.path}
                className="group relative rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all overflow-hidden cursor-pointer"
              >
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={selectedPaths.has(item.path)}
                    onCheckedChange={() => toggleSelect(item.path)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="aspect-video bg-[var(--bg-muted)] flex items-center justify-center relative">
                  {type === "image" ? (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--orange-100)] to-[var(--green-100)]" />
                  ) : (
                    <Icon size={32} style={{ color: config.color }} className="opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyPath(item)}
                      className="w-6 h-6 rounded bg-[var(--bg-surface)] shadow-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
                          title={t("media.copyMarkdown")}
                    >
                      {copiedPath === item.path ? <CheckCircle2 size={12} className="text-[var(--status-success)]" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.path)}
                      className="w-6 h-6 rounded bg-[var(--bg-surface)] shadow-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] transition-colors cursor-pointer"
                      title={t("media.delete")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate mb-1">
                    {item.name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {formatSize(item.size || 0)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Upload placeholder */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer"
          >
            <Upload size={24} />
            <span className="text-xs font-medium">{t("media.uploadFile")}</span>
          </button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              <div className="flex items-center">
                <Checkbox
                  checked={filtered.length > 0 && selectedPaths.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </div>
              <span>{t("media.columnName")}</span>
              <span className="hidden md:block">{t("media.columnType")}</span>
              <span className="hidden sm:block">{t("media.columnSize")}</span>
              <span>{t("media.columnActions")}</span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                  <ImageIcon size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">{t("media.empty")}</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const type = getFileType(item.name);
                  const config = typeConfig[type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={item.path}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-3 hover:bg-[var(--bg-muted)] transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPaths.has(item.path)}
                          onCheckedChange={() => toggleSelect(item.path)}
                        />
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                          <Icon size={16} style={{ color: config.color }} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] font-mono truncate">{item.path}</div>
                      </div>
                      <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {typeLabels[type]}
                      </span>
                      <span className="hidden sm:block text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                        {formatSize(item.size || 0)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyPath(item)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title={t("media.copyMarkdown")}
                        >
                          {copiedPath === item.path ? <CheckCircle2 size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.path)}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
