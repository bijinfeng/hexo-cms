import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { marked } from "marked";
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
  Globe,
  FileText,
  Loader2,
} from "lucide-react";

export function NewPagePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(`# 页面标题\n\n在这里开始写作...\n`);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [slug, setSlug] = useState("");
  const [isDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGitHubConfig();
  }, []);

  async function loadGitHubConfig() {
    try {
      const [configRes, tokenRes] = await Promise.all([
        fetch("/api/github/config"),
        fetch("/api/auth/token"),
      ]);
      if (configRes.ok) {
        const configData = await configRes.json();
        setGithubConfig(configData.config);
      }
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setAccessToken(tokenData.accessToken);
      }
    } catch (err) {
      console.error("Failed to load GitHub config:", err);
    }
  }

  const onChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  const htmlPreview = useMemo(() => {
    try {
      return marked.parse(content);
    } catch {
      return content;
    }
  }, [content]);

  function insertMarkdown(before: string, after = "", placeholder = "") {
    setContent((prev) => prev + before + placeholder + after);
  }

  async function handleImageUpload(file: File) {
    if (!githubConfig || !accessToken) {
      setError("请先在设置页面配置 GitHub 仓库");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("owner", githubConfig.owner);
      formData.append("repo", githubConfig.repo);
      formData.append("token", accessToken);
      formData.append("dir", githubConfig.media_dir || "source/images");
      const res = await fetch("/api/github/media", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.path) {
        insertMarkdown(`![${file.name}](/${data.path})`);
      } else {
        setError(data.error || "图片上传失败");
      }
    } catch {
      setError("图片上传失败，请检查网络连接");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleSave(publish = false) {
    if (!title.trim()) {
      setError("请输入页面标题");
      return;
    }
    if (!githubConfig || !accessToken) {
      setError("请先在设置页面配置 GitHub 仓库");
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
      const res = await fetch("/api/github/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          token: accessToken,
          page,
          commitMessage: `${publish ? "发布" : "保存"}页面: ${title}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        navigate({ to: "/pages" });
      } else {
        setError(data.error || "保存失败");
      }
    } catch {
      setError("保存失败，请检查网络连接");
    } finally {
      setSaving(false);
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
