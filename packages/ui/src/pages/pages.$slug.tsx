import { useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";

export function EditPagePage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const { slug } = useParams({ strict: false }) as { slug: string };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postPath, setPostPath] = useState("");

  useEffect(() => {
    loadPage();
  }, [slug]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const path = `source/${slug}/index.md`;
      const page = await dataProvider.getPage(path);

      setTitle(page.title || "");
      setContent(page.content || "");
      setPostPath(page.path);
      setStatus(page.frontmatter.draft ? "draft" : "published");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

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
      setError("请输入页面标题");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const frontmatter: Record<string, any> = {
        title,
        date: new Date().toISOString().split("T")[0],
      };
      if (status === "draft") frontmatter.draft = true;

      const page = { path: postPath, title, date: frontmatter.date, content, frontmatter };
      await dataProvider.savePage(page as any);
      navigate({ to: "/pages" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`确定要删除页面「${title}」吗？此操作不可恢复。`)) return;

    try {
      await dataProvider.deletePage(postPath);
      navigate({ to: "/pages" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
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
        <Button onClick={() => navigate({ to: "/pages" })}>返回页面列表</Button>
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
          返回
        </button>
        <div className="w-px h-4 bg-[var(--border-default)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">编辑页面</span>
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
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 size={14} />
            删除
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-6 mt-3">
          {error}
        </Alert>
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
              <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as "draft" | "published")} className="w-full">
                <ToggleGroupItem value="draft" className="flex-1 text-xs">草稿</ToggleGroupItem>
                <ToggleGroupItem value="published" className="flex-1 text-xs">发布</ToggleGroupItem>
              </ToggleGroup>
            </SidebarSection>

            <SidebarSection title="页面路径" icon={FileText}>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">
                {postPath}
              </p>
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
