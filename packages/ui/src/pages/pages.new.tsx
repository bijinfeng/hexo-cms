import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
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
} from "lucide-react";

export function NewPagePage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(`# 页面标题\n\n在这里开始写作...\n`);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      setError("请输入页面标题");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const finalStatus = publish ? "published" : status;
      const finalSlug = slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const filePath = `source/${finalSlug}/index.md`;
      const frontmatter: Record<string, any> = {
        title,
        date: new Date().toISOString().split("T")[0],
      };
      if (finalStatus === "draft") frontmatter.draft = true;

      const page = { path: filePath, title, date: frontmatter.date, content, frontmatter };
      await dataProvider.savePage(page as any);
      navigate({ to: "/pages" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
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
          返回
        </button>
        <div className="w-px h-4 bg-[var(--border-default)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">新建页面</span>
        <Badge variant={status === "published" ? "success" : "default"}>
          {status === "published" ? "已发布" : "草稿"}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            {preview ? "编辑" : "预览"}
          </button>
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存草稿
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            发布
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-8 pt-6 pb-3 flex-shrink-0">
            <input
              type="text"
              placeholder="页面标题..."
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
            <SidebarSection title="发布状态" icon={Globe}>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus("draft")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    status === "draft"
                      ? "bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  草稿
                </button>
                <button
                  onClick={() => setStatus("published")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    status === "published"
                      ? "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)] border border-[var(--brand-primary-muted)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  发布
                </button>
              </div>
            </SidebarSection>

            <SidebarSection title="URL 路径" icon={FileText}>
              <input
                type="text"
                placeholder="page-url-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="form-input text-xs font-mono"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                留空则自动从标题生成
              </p>
            </SidebarSection>

            <SidebarSection title="封面图片" icon={Image}>
              <button className="w-full h-20 rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
                <Upload size={16} />
                <span className="text-xs">上传封面</span>
              </button>
            </SidebarSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} className="text-[var(--text-tertiary)]" />
        <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
