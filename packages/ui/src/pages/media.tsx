import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Upload,
  Search,
  Grid3x3,
  List,
  Image as ImageIcon,
  FileText,
  Film,
  Music,
  Download,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  ChevronDown,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";

const typeConfig = {
  image: { icon: ImageIcon, color: "var(--brand-primary)", label: "图片" },
  video: { icon: Film, color: "var(--brand-accent)", label: "视频" },
  audio: { icon: Music, color: "var(--orange-500)", label: "音频" },
  document: { icon: FileText, color: "var(--text-secondary)", label: "文档" },
};

const filterOptions = ["全部", "图片", "视频", "音频", "文档"];

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "avi"];
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac"];

function getFileType(name: string): keyof typeof typeConfig {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  return "document";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");
  const [copiedPath, setCopiedPath] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const [configRes, tokenRes] = await Promise.all([
        fetch("/api/github/config"),
        fetch("/api/auth/token"),
      ]);

      let config = null;
      let token = "";

      if (configRes.ok) {
        const data = await configRes.json();
        config = data.config;
        setGithubConfig(config);
      }

      if (tokenRes.ok) {
        const data = await tokenRes.json();
        token = data.accessToken;
        setAccessToken(token);
      }

      if (config && token) {
        await loadMedia(config, token);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }

  async function loadMedia(config: any, token: string) {
    setLoading(true);
    setError("");
    try {
      const dir = config.media_dir || "source/images";
      const params = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        token,
        dir,
      });
      const res = await fetch(`/api/github/media?${params}`);
      const data = await res.json();
      if (res.ok && data.files) {
        setMediaItems(data.files);
      } else {
        setError(data.error || "加载失败");
      }
    } catch (err) {
      setError("加载失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!githubConfig || !accessToken) {
      setError("请先在设置页面配置 GitHub 仓库");
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("owner", githubConfig.owner);
        formData.append("repo", githubConfig.repo);
        formData.append("token", accessToken);
        formData.append("dir", githubConfig.media_dir || "source/images");

        const res = await fetch("/api/github/media", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `上传 ${file.name} 失败`);
        }
      }
      await loadMedia(githubConfig, accessToken);
    } catch (err) {
      setError("上传失败，请检查网络连接");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(path: string) {
    if (!githubConfig || !accessToken) return;
    try {
      const res = await fetch("/api/github/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          token: accessToken,
          path,
        }),
      });
      if (res.ok) {
        setMediaItems((prev) => prev.filter((item) => item.path !== path));
      }
    } catch (err) {
      setError("删除失败");
    }
  }

  function copyPath(item: any) {
    const mdPath = `![${item.name}](/${item.path})`;
    navigator.clipboard.writeText(mdPath);
    setCopiedPath(item.path);
    setTimeout(() => setCopiedPath(""), 2000);
  }

  const filtered = mediaItems.filter((item) => {
    const type = getFileType(item.name);
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "图片" && type === "image") ||
      (activeFilter === "视频" && type === "video") ||
      (activeFilter === "音频" && type === "audio") ||
      (activeFilter === "文档" && type === "document");
    return matchSearch && matchFilter;
  });

  const totalSize = mediaItems.reduce((acc, item) => acc + (item.size || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">媒体库</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {mediaItems.length} 个文件，共 {formatSize(totalSize)}
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "上传中..." : "上传文件"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]">
          {error}
        </div>
      )}

      {/* GitHub config prompt */}
      {!githubConfig && (
        <div className="p-4 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning)] text-sm">
          <p className="text-[var(--text-primary)] font-medium mb-1">未配置 GitHub 仓库</p>
          <p className="text-[var(--text-secondary)]">
            请先在<a href="/settings" className="text-[var(--brand-primary)] hover:underline">设置页面</a>配置你的 GitHub 仓库信息
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeFilter === opt
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
          <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索文件名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)]">
            <button
              onClick={() => setViewMode("grid")}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={24} className="animate-spin mr-2" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const type = getFileType(item.name);
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <div
                key={item.path}
                className="group relative rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all overflow-hidden cursor-pointer"
              >
                <div className="aspect-video bg-[var(--bg-muted)] flex items-center justify-center relative">
                  {type === "image" ? (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--orange-100)] to-[var(--green-100)]" />
                  ) : (
                    <Icon size={32} style={{ color: config.color }} className="opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyPath(item)}
                      className="w-6 h-6 rounded bg-[var(--bg-surface)] shadow-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
                      title="复制 Markdown 路径"
                    >
                      {copiedPath === item.path ? <CheckCircle2 size={12} className="text-[var(--status-success)]" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.path)}
                      className="w-6 h-6 rounded bg-[var(--bg-surface)] shadow-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] transition-colors cursor-pointer"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate mb-1">
                    {item.name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {formatSize(item.size || 0)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Upload placeholder */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer"
          >
            <Upload size={24} />
            <span className="text-xs font-medium">上传文件</span>
          </button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              <span></span>
              <span>文件名</span>
              <span className="hidden md:block">类型</span>
              <span className="hidden sm:block">大小</span>
              <span>操作</span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
                  <ImageIcon size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">暂无媒体文件</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const type = getFileType(item.name);
                  const config = typeConfig[type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={item.path}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-3 hover:bg-[var(--bg-muted)] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] font-mono truncate">{item.path}</div>
                      </div>
                      <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {config.label}
                      </span>
                      <span className="hidden sm:block text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                        {formatSize(item.size || 0)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyPath(item)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="复制 Markdown 路径"
                        >
                          {copiedPath === item.path ? <CheckCircle2 size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.path)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
