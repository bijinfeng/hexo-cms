import { useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePage, useSavePage, useDeletePage } from "../hooks/use-pages-query";
import { useI18n } from "../i18n/I18nProvider";
import type { Frontmatter, HexoPost } from "@hexo-cms/core";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { SidebarSection } from "../components/SidebarSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
import { useAutoSave } from "../hooks/use-autosave";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Loader2,
  Trash2,
  Info,
} from "lucide-react";

export function EditPagePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };

  const path = `source/${slug}/index.md`;
  const pageQuery = usePage(path);
  const savePageMutation = useSavePage();
  const deletePageMutation = useDeletePage();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [saveError, setSaveError] = useState("");
  const [postPath, setPostPath] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const autosave = useAutoSave(slug, content);

  const loading = pageQuery.isPending;
  const error = pageQuery.error?.message ?? "";
  const saving = savePageMutation.isPending;

  useEffect(() => {
    if (initialized || !pageQuery.data) return;
    const page = pageQuery.data;
    setTitle(page.title || "");
    const draft = autosave.restore();
    if (draft) {
      setContent(draft);
      setDraftRestored(true);
    } else {
      setContent(page.content || "");
    }
    setPostPath(page.path);
    setStatus(page.frontmatter.draft ? "draft" : "published");
    setInitialized(true);
  }, [pageQuery.data, initialized, autosave]);

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

  async function handleSave() {
    if (!title.trim()) {
      setSaveError(t("pages.editor.titleRequired"));
      return;
    }

    setSaveError("");
    try {
      const frontmatter: Frontmatter = {
        title,
        date: new Date().toISOString().split("T")[0],
      };
      if (status === "draft") frontmatter.draft = true;

      const page: HexoPost = { path: postPath, title, date: frontmatter.date ?? "", content, frontmatter };
      await savePageMutation.mutateAsync(page);
      autosave.clear();
      navigate({ to: "/pages" });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("common.saveFailed"));
    }
  }

  async function handleDelete() {
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    try {
      await deletePageMutation.mutateAsync(postPath);
      navigate({ to: "/pages" });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("common.deleteFailed"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-[var(--text-secondary)]">{error}</p>
        <Button onClick={() => navigate({ to: "/pages" })}>{t("pages.editor.backToList")}</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in -m-6">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0">
        <button
          onClick={() => navigate({ to: "/pages" })}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
            {t("common.back")}
        </button>
        <div className="w-px h-4 bg-[var(--border-default)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">{t("pages.editor.editTitle")}</span>
        <Badge variant={status === "published" ? "success" : "default"}>
          {status === "published" ? t("pages.list.published") : t("pages.list.draft")}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            {preview ? t("pages.editor.editTab") : t("pages.editor.previewTab")}
          </button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 size={14} />
            {t("pages.editor.deletePage")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("common.save")}
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <Alert variant="destructive" className="mx-6 mt-3">
          {error || saveError}
        </Alert>
      )}

      {draftRestored && (
        <Alert className="mx-6 mt-3">
          <Info size={14} />
          {t("pages.editor.draftRestored")}
        </Alert>
      )}

      {autosave.saved && (
        <div className="flex items-center justify-center py-1 bg-[var(--bg-muted)]">
          <span className="text-xs text-[var(--text-tertiary)]">{t("pages.editor.autoSaveNotice")}</span>
        </div>
      )}
      {autosave.error && (
        <div className="flex items-center justify-center py-1 bg-[var(--status-error-bg)]">
          <span className="text-xs text-[var(--status-error)]">{autosave.error}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 pt-6 pb-3 flex-shrink-0">
            <input
              type="text"
              placeholder={t("pages.editor.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-[var(--text-primary)] bg-transparent outline-none placeholder:text-[var(--text-tertiary)] border-none"
            />
          </div>

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
        <div className="w-64 flex-shrink-0 border-l border-[var(--border-default)] overflow-y-auto bg-[var(--bg-surface)]">
          <div className="p-4 space-y-5">
            <SidebarSection title={t("pages.editor.statusLabel")} icon={Globe}>
              <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as "draft" | "published")} className="w-full">
                <ToggleGroupItem value="draft" className="flex-1 text-xs">{t("pages.list.draft")}</ToggleGroupItem>
                <ToggleGroupItem value="published" className="flex-1 text-xs">{t("pages.editor.publishBtn")}</ToggleGroupItem>
              </ToggleGroup>
            </SidebarSection>

            <SidebarSection title={t("pages.editor.urlLabel")} icon={FileText}>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">
                {postPath}
              </p>
            </SidebarSection>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pages.confirm.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("pages.confirm.deleteMessage", { title })}
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
