import { useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Link,
  Image,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
  Minus,
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
  const [isDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postPath, setPostPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err: any) {
      setError(err.message || "加载失败");
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

  function insertMarkdown(before: string, after = "", placeholder = "") {
    setContent((prev) => prev + before + placeholder + after);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const config = await dataProvider.getConfig();
      if (!config) return;
      const dir = config.media_dir || "source/images";
      const path = `${dir}/${file.name}`;
      const result = await dataProvider.uploadMedia(file, path);
      insertMarkdown(`![${file.name}](${result.url})`);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

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
    } catch (err: any) {
      setError(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`确定要删除页面「${title}」吗？此操作不可恢复。`)) return;

    try {
      await dataProvider.deletePage(postPath);
      navigate({ to: "/pages" });
    } catch (err: any) {
      setError(err.message || "删除失败");
    }
  }

  const toolbarActions = [
    { icon: Heading1, label: "H1", action: () => insertMarkdown("# ", "", "标题") },
    { icon: Heading2, label: "H2", action: () => insertMarkdown("## ", "", "标题") },
    { separator: true },
    { icon: Bold, label: "粗体", action: () => insertMarkdown("**", "**", "粗体文字") },
    { icon: Italic, label: "斜体", action: () => insertMarkdown("*", "*", "斜体文字") },
    { icon: Code, label: "代码", action: () => insertMarkdown("`", "`", "代码") },
    { separator: true },
    { icon: Link, label: "链接", action: () => insertMarkdown("[", "](url)", "链接文字") },
    { icon: Image, label: "图片", action: () => imageInputRef.current?.click() },
    { separator: true },
    { icon: List, label: "无序列表", action: () => insertMarkdown("- ", "", "列表项") },
    { icon: ListOrdered, label: "有序列表", action: () => insertMarkdown("1. ", "", "列表项") },
    { icon: Quote, label: "引用", action: () => insertMarkdown("> ", "", "引用内容") },
    { icon: Minus, label: "分割线", action: () => insertMarkdown("\n---\n") },
  ];

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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />

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
        <div className="mx-6 mt-3 p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]">
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

          {!preview && (
            <div className="flex items-center gap-0.5 px-8 py-2 border-b border-[var(--border-default)] flex-shrink-0 flex-wrap">
              {toolbarActions.map((action, i) =>
                "separator" in action ? (
                  <div key={i} className="w-px h-4 bg-[var(--border-default)] mx-1" />
                ) : (
                  <button
                    key={i}
                    onClick={action.action}
                    title={action.label}
                    disabled={action.label === "图片" && uploading}
                    className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {action.label === "图片" && uploading
                      ? <Loader2 size={14} className="animate-spin" />
                      : <action.icon size={14} />
                    }
                  </button>
                )
              )}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto px-8 py-6">
                <div
                  className="prose prose-sm max-w-none text-[var(--text-primary)]"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              </div>
            ) : (
              <div className="h-full overflow-hidden">
                <CodeMirror
                  value={content}
                  height="100%"
                  extensions={[markdown({ base: markdownLanguage })]}
                  onChange={onChange}
                  theme={isDarkMode ? oneDark : undefined}
                  basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true, autocompletion: true }}
                  style={{ fontSize: "14px", fontFamily: "var(--font-mono)" }}
                />
              </div>
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
