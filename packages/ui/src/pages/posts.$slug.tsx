import { useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { Input } from "../components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/skeleton";
import { DiagnosticsPanel } from "../plugin/diagnostics-panel";
import type { HexoPost } from "@hexo-cms/core";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { marked } from "marked";
import { sanitizeHtml } from "../sanitize";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Image,
  Globe,
  FileText,
  Loader2,
  Calendar,
  FolderOpen,
  Tag,
  Upload,
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postPath, setPostPath] = useState("");

  // Build current post for diagnostics
  const currentPost = useMemo<HexoPost>(() => {
    const frontmatter: Record<string, any> = {
      title,
      date: date || new Date().toISOString().split("T")[0],
    };

    if (selectedTags.length > 0) frontmatter.tags = selectedTags;
    if (category) frontmatter.category = category;
    if (status === "draft") frontmatter.draft = true;

    return {
      path: postPath,
      title,
      date: frontmatter.date,
      content,
      frontmatter,
    };
  }, [title, content, date, selectedTags, category, status, postPath]);

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
        <Alert variant="destructive" className="mx-6 mt-3">
          {error}
        </Alert>
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
                  emptyMessage="未发现 SEO 问题"
                />
              </div>
            )}
            {/* Status */}
            <SidebarSection title="发布状态" icon={Globe}>
              <ToggleGroup type="single" value={status} onValueChange={(v) => v && setStatus(v as "draft" | "published")} className="w-full">
                <ToggleGroupItem value="draft" className="flex-1 text-xs">草稿</ToggleGroupItem>
                <ToggleGroupItem value="published" className="flex-1 text-xs">发布</ToggleGroupItem>
              </ToggleGroup>
            </SidebarSection>

            {/* Date */}
            <SidebarSection title="发布日期" icon={Calendar}>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
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
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger className="w-full text-xs" size="sm">
                  <SelectValue placeholder="选择分类..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
