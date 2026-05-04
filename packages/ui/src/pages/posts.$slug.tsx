import { useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/skeleton";
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
  Trash2,
} from "lucide-react";

const availableTags = ["React", "TypeScript", "TanStack", "CSS", "Tailwind", "Auth", "DevOps", "GitHub", "架构", "安全"];
const availableCategories = ["前端开发", "后端开发", "系统设计", "运维", "其他"];

export function EditPostPage() {
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const dataProvider = useDataProvider();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [date, setDate] = useState("");
  const [isDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postPath, setPostPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPost();
  }, [slug]);

  async function loadPost() {
    setLoading(true);
    try {
      const path = `source/_posts/${slug}.md`;
      setPostPath(path);

      const post = await dataProvider.getPost(path);
      setTitle(post.title || "");
      setContent(post.content || "");
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
    } catch (err) {
      console.error("Failed to load post:", err);
      setError(err instanceof Error ? err.message : "文章不存在或加载失败");
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

  async function handleSave(publish = false) {
    if (!title.trim()) {
      setError("请输入文章标题");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const finalStatus = publish ? "published" : status;
      const frontmatter: Record<string, any> = {
        title,
        date: date || new Date().toISOString().split("T")[0],
      };

      if (selectedTags.length > 0) frontmatter.tags = selectedTags;
      if (category) frontmatter.category = category;
      if (finalStatus === "draft") frontmatter.draft = true;

      const post = {
        path: postPath,
        title,
        date: frontmatter.date,
        content,
        frontmatter,
      };

      await dataProvider.savePost(post);
      navigate({ to: "/posts" });
    } catch (err) {
      console.error("Failed to save post:", err);
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleDelete() {
    if (!confirm(`确定要删除文章「${title}」吗？此操作不可恢复。`)) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await dataProvider.deletePost(postPath);
      navigate({ to: "/posts" });
    } catch (err) {
      console.error("Failed to delete post:", err);
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const path = `source/images/${file.name}`;
      const result = await dataProvider.uploadMedia(file, path);
      insertMarkdown(`![${file.name}](${result.url})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
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
      <div className="h-full flex flex-col animate-fade-in -m-6 p-6 space-y-4">
        <Skeleton width={200} height={28} />
        <Skeleton height={40} />
        <Skeleton variant="card" height={400} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in -m-6">
      {/* Hidden file input for image upload */}
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

      {/* Editor Topbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex-shrink-0">
        <button
          onClick={() => navigate({ to: "/posts" })}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          返回
        </button>

        <div className="w-px h-4 bg-[var(--border-default)]" />

        <span className="text-sm font-medium text-[var(--text-primary)]">编辑文章</span>

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
            保存
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            发布
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-6 mt-3 p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-8 pt-6 pb-3 flex-shrink-0">
            <input
              type="text"
              placeholder="文章标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-[var(--text-primary)] bg-transparent outline-none placeholder:text-[var(--text-tertiary)] border-none"
            />
          </div>

          {/* Markdown Toolbar */}
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
                    className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Editor / Preview */}
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
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightSpecialChars: true,
                    foldGutter: true,
                    drawSelection: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    rectangularSelection: true,
                    crosshairCursor: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    closeBracketsKeymap: true,
                    searchKeymap: true,
                    foldKeymap: true,
                    completionKeymap: true,
                    lintKeymap: true,
                  }}
                  style={{
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-[var(--border-default)] overflow-y-auto bg-[var(--bg-surface)]">
          <div className="p-4 space-y-5">
            {/* Status */}
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

            {/* Date */}
            <SidebarSection title="发布日期" icon={Calendar}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input text-xs"
              />
            </SidebarSection>

            {/* File path */}
            <SidebarSection title="文件路径" icon={FileText}>
              <div className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-muted)] px-2 py-1.5 rounded-lg break-all">
                {postPath || "—"}
              </div>
            </SidebarSection>

            {/* Category */}
            <SidebarSection title="分类" icon={FolderOpen}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input text-xs"
              >
                <option value="">选择分类...</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </SidebarSection>

            {/* Tags */}
            <SidebarSection title="标签" icon={Tag}>
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
            <SidebarSection title="封面图片" icon={Image}>
              <button className="w-full h-20 rounded-lg border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
                <Upload size={16} />
                <span className="text-xs">上传封面</span>
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
                {saving ? "删除中..." : "删除文章"}
              </button>
            </div>
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
