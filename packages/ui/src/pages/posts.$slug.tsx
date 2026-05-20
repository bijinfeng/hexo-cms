import type { Frontmatter, HexoPost } from "@hexo-cms/core";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Globe,
  Image,
  Info,
  Loader2,
  Save,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { SidebarSection } from "../components/SidebarSection";
import { Skeleton } from "../components/skeleton";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { useAutoSave } from "../hooks/use-autosave";
import { useDeletePost, usePost, useSavePost } from "../hooks/use-posts-query";
import { useI18n } from "../i18n/I18nProvider";
import { DiagnosticsPanel } from "../plugin/diagnostics-panel";
import { sanitizeHtml } from "../sanitize";

const availableTags = [
  "React",
  "TypeScript",
  "TanStack",
  "CSS",
  "Tailwind",
  "Auth",
  "DevOps",
  "GitHub",
  "架构",
  "安全",
];
const availableCategories = ["前端开发", "后端开发", "系统设计", "运维", "其他"];

export function EditPostPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };

  const path = `source/_posts/${slug}.md`;
  const postQuery = usePost(path);
  const savePostMutation = useSavePost();
  const deletePostMutation = useDeletePost();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [date, setDate] = useState("");
  const [saveError, setSaveError] = useState("");
  const [postPath, setPostPath] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const autosave = useAutoSave(slug, content);

  const loading = postQuery.isPending;
  const error = postQuery.error?.message ?? "";
  const saving = savePostMutation.isPending;

  // Build current post for diagnostics
  const currentPost = useMemo<HexoPost>(() => {
    const frontmatter: Frontmatter = {
      title,
      date: date || new Date().toISOString().split("T")[0],
    };

    if (selectedTags.length > 0) frontmatter.tags = selectedTags;
    if (category) frontmatter.category = category;
    if (status === "draft") frontmatter.draft = true;

    return {
      path: postPath,
      title,
      date: frontmatter.date ?? "",
      content,
      frontmatter,
    };
  }, [title, content, date, selectedTags, category, status, postPath]);

  useEffect(() => {
    if (initialized || !postQuery.data) return;
    const post = postQuery.data;
    setPostPath(post.path);
    setTitle(post.title || "");

    const draft = autosave.restore();
    if (draft) {
      setContent(draft);
      setDraftRestored(true);
    } else {
      setContent(post.content || "");
    }

    setDate(post.date || new Date().toISOString().split("T")[0]);
    setStatus(post.frontmatter?.draft ? "draft" : "published");

    const tags = post.frontmatter?.tags;
    if (Array.isArray(tags)) {
      setSelectedTags(tags);
    } else if (typeof tags === "string") {
      setSelectedTags([tags]);
    }

    if (post.frontmatter?.category) {
      setCategory(post.frontmatter.category);
    }
    setInitialized(true);
  }, [postQuery.data, initialized, autosave]);

  const onChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  const htmlPreview = useMemo(() => {
    try {
      return sanitizeHtml(marked.parse(content) as string);
    } catch {
      return sanitizeHtml(content);
    }
  }, [content]);

  async function handleSave(publish = false) {
    if (!title.trim()) {
      setSaveError(t("posts.editor.titleRequired"));
      return;
    }

    setSaveError("");

    try {
      const finalStatus = publish ? "published" : status;
      const frontmatter: Frontmatter = {
        title,
        date: date || new Date().toISOString().split("T")[0],
      };

      if (selectedTags.length > 0) frontmatter.tags = selectedTags;
      if (category) frontmatter.category = category;
      if (finalStatus === "draft") frontmatter.draft = true;

      const post = {
        path: postPath,
        title,
        date: frontmatter.date ?? "",
        content,
        frontmatter,
      };

      await savePostMutation.mutateAsync(post);
      autosave.clear();
      navigate({ to: "/posts" });
    } catch (err) {
      console.error("Failed to save post:", err);
      setSaveError(err instanceof Error ? err.message : t("common.saveFailed"));
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    setSaveError("");

    try {
      await deletePostMutation.mutateAsync(postPath);
      navigate({ to: "/posts" });
    } catch (err) {
      console.error("Failed to delete post:", err);
      setSaveError(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col animate-fade-in -m-6 p-6 space-y-4">
        <Skeleton width={200} height={28} />
        <Skeleton height={40} />
        <Skeleton variant="card" height={400} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in -m-6">
      {/* Editor Topbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0">
        <button
          onClick={() => navigate({ to: "/posts" })}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          {t("common.back")}
        </button>

        <div className="w-px h-4 bg-[var(--border-default)]" />

        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t("posts.editor.editTitle")}
        </span>

        <Badge variant={status === "published" ? "success" : "default"}>
          {status === "published" ? t("posts.editor.publishStatus") : t("posts.editor.draftStatus")}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            {preview ? t("posts.editor.editTab") : t("posts.editor.previewTab")}
          </button>
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("common.save")}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {t("posts.editor.publishBtn")}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {(error || saveError) && (
        <Alert variant="destructive" className="mx-6 mt-3">
          {error || saveError}
        </Alert>
      )}

      {/* Draft restored banner */}
      {draftRestored && (
        <Alert className="mx-6 mt-3">
          <Info size={14} />
          {t("posts.editor.draftRestored")}
        </Alert>
      )}

      {/* Auto-save indicator */}
      {autosave.saved && (
        <div className="flex items-center justify-center py-1 bg-[var(--bg-muted)]">
          <span className="text-xs text-[var(--text-tertiary)]">
            {t("posts.editor.autoSaveNotice")}
          </span>
        </div>
      )}
      {autosave.error && (
        <div className="flex items-center justify-center py-1 bg-[var(--status-error-bg)]">
          <span className="text-xs text-[var(--status-error)]">{autosave.error}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-8 pt-6 pb-3 flex-shrink-0">
            <input
              type="text"
              placeholder={t("posts.editor.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-[var(--text-primary)] bg-transparent outline-none placeholder:text-[var(--text-tertiary)] border-none"
            />
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto px-8 py-6">
                <div
                  className="prose prose-sm max-w-none text-[var(--text-primary)]"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              </div>
            ) : (
              <MarkdownEditor value={content} onChange={onChange} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-l border-[var(--border-default)] overflow-y-auto bg-[var(--bg-surface)]">
          <div className="p-4 space-y-5">
            {/* SEO Diagnostics */}
            {!loading && title && (
              <div className="mb-4">
                <DiagnosticsPanel
                  target={{
                    scope: "post",
                    post: currentPost,
                    path: postPath,
                  }}
                  autoRun={true}
                  emptyMessage={t("posts.editor.noSeoIssues")}
                />
              </div>
            )}
            {/* Status */}
            <SidebarSection title={t("posts.editor.statusLabel")} icon={Globe}>
              <ToggleGroup
                type="single"
                value={status}
                onValueChange={(v) => v && setStatus(v as "draft" | "published")}
                className="w-full"
              >
                <ToggleGroupItem value="draft" className="flex-1 text-xs">
                  {t("posts.editor.draftStatus")}
                </ToggleGroupItem>
                <ToggleGroupItem value="published" className="flex-1 text-xs">
                  {t("posts.editor.publishBtn")}
                </ToggleGroupItem>
              </ToggleGroup>
            </SidebarSection>

            {/* Date */}
            <SidebarSection title={t("posts.editor.dateLabel")} icon={Calendar}>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
              />
            </SidebarSection>

            {/* File path */}
            <SidebarSection title={t("posts.editor.filePath")} icon={FileText}>
              <div className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-muted)] px-2 py-1.5 rounded-lg break-all">
                {postPath || "—"}
              </div>
            </SidebarSection>

            {/* Category */}
            <SidebarSection title={t("posts.editor.categoryLabel")} icon={FolderOpen}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full text-xs" size="sm">
                  <SelectValue placeholder={t("posts.editor.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </SidebarSection>

            {/* Tags */}
            <SidebarSection title={t("posts.editor.tagLabel")} icon={Tag}>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedTags.includes(tag)
                        ? "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border border-[var(--brand-primary-muted)]"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </SidebarSection>

            {/* Cover Image */}
            <SidebarSection title={t("posts.editor.coverLabel")} icon={Image}>
              <button className="w-full h-20 rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
                <Upload size={16} />
                <span className="text-xs">{t("posts.editor.uploadCover")}</span>
              </button>
            </SidebarSection>

            {/* Danger zone */}
            <div className="pt-2 border-t border-[var(--border-default)]">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} />
                {saving ? t("common.deleting") : t("posts.editor.deletePost")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("posts.confirm.singleDeleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("posts.confirm.singleDeleteMessage", { title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-[var(--status-error)] hover:bg-[var(--status-error)]/90"
            >
              {t("common.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
