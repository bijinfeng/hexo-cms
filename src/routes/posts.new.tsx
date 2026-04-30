import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
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
  Upload,
  Tag,
  Calendar,
  FolderOpen,
  Globe,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/posts/new")({
  component: NewPostPage,
});

const availableTags = ["React", "TypeScript", "TanStack", "CSS", "Tailwind", "Auth", "DevOps", "GitHub", "架构", "安全"];
const availableCategories = ["前端开发", "后端开发", "系统设计", "运维", "其他"];

function NewPostPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(`# 文章标题\n\n在这里开始写作...\n`);
  const [preview, setPreview] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [slug, setSlug] = useState("");
  const [isDarkMode] = useState(false);

  const onChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  function insertMarkdown(before: string, after = "", placeholder = "") {
    const newContent = content + before + placeholder + after;
    setContent(newContent);
  }

  function handleSave(publish = false) {
    if (publish) setStatus("published");
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
    { icon: Image, label: "图片", action: () => insertMarkdown("![", "](url)", "图片描述") },
    { separator: true },
    { icon: List, label: "无序列表", action: () => insertMarkdown("- ", "", "列表项") },
    { icon: ListOrdered, label: "有序列表", action: () => insertMarkdown("1. ", "", "列表项") },
    { icon: Quote, label: "引用", action: () => insertMarkdown("> ", "", "引用内容") },
    { icon: Minus, label: "分割线", action: () => insertMarkdown("\n---\n") },
  ];

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

        <span className="text-sm font-medium text-[var(--text-primary)]">新建文章</span>

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
          <Button variant="outline" size="sm" onClick={() => handleSave(false)}>
            <Save size={14} />
            保存草稿
          </Button>
          <Button size="sm" onClick={() => handleSave(true)}>
            <Globe size={14} />
            发布
          </Button>
        </div>
      </div>

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
                    className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                  >
                    <action.icon size={14} />
                  </button>
                )
              )}
            </div>
          )}

          {/* Editor / Preview */}
          <div className="flex-1 overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto px-8 py-6">
                <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-secondary)]">
                    {content || "暂无内容"}
                  </pre>
                </div>
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

            {/* Slug */}
            <SidebarSection title="URL 别名" icon={FileText}>
              <input
                type="text"
                placeholder="post-url-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="form-input text-xs font-mono"
              />
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
