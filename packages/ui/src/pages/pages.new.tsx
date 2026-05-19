import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import type { Frontmatter, HexoPost } from "@hexo-cms/core";
import { useSavePage } from "../hooks/use-pages-query";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { SidebarSection } from "../components/SidebarSection";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
import { useAutoSave } from "../hooks/use-autosave";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Image,
  Upload,
  Globe,
  FileText,
  Loader2,
  Info,
} from "lucide-react";

export function NewPagePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const savePageMutation = useSavePage();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(`# 页面标题\n\n在这里开始写作...\n`);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const saving = savePageMutation.isPending;

  const autosave = useAutoSave("new-page", content);

  useEffect(() => {
    const draft = autosave.restore();
    if (draft) {
      setContent(draft);
      setDraftRestored(true);
    }
  }, []);

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
      setError(t("pages.editor.titleRequired"));
      return;
    }
    setError("");
    try {
      const finalStatus = publish ? "published" : status;
      const finalSlug = slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const filePath = `source/${finalSlug}/index.md`;
      const frontmatter: Frontmatter = {
        title,
        date: new Date().toISOString().split("T")[0],
      };
      if (finalStatus === "draft") frontmatter.draft = true;

      const page: HexoPost = { path: filePath, title, date: frontmatter.date ?? "", content, frontmatter };
      await savePageMutation.mutateAsync(page);
      autosave.clear();
      navigate({ to: "/pages" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.saveFailed"));
    }
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
        <span className="text-sm font-medium text-[var(--text-primary)]">{t("pages.editor.newTitle")}</span>
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
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("pages.editor.saveDraft")}
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            {t("pages.editor.publishBtn")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-6 mt-3">
          {error}
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
              <Input
                type="text"
                placeholder="page-url-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {t("pages.editor.urlHint")}
              </p>
            </SidebarSection>

            <SidebarSection title={t("pages.editor.coverLabel")} icon={Image}>
              <button className="w-full h-20 rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
                <Upload size={16} />
                <span className="text-xs">{t("pages.editor.uploadCover")}</span>
              </button>
            </SidebarSection>
          </div>
        </div>
      </div>
    </div>
  );
}
