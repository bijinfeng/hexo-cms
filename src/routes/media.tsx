import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
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
} from "lucide-react";

export const Route = createFileRoute("/media")({
  component: MediaPage,
});

const mediaItems = [
  {
    id: "1",
    name: "hero-banner.jpg",
    type: "image",
    size: "2.4 MB",
    dimensions: "1920x1080",
    url: "/images/hero-banner.jpg",
    uploadDate: "2026-04-28",
    usedIn: 3,
  },
  {
    id: "2",
    name: "profile-avatar.png",
    type: "image",
    size: "156 KB",
    dimensions: "400x400",
    url: "/images/avatar.png",
    uploadDate: "2026-04-25",
    usedIn: 1,
  },
  {
    id: "3",
    name: "tutorial-video.mp4",
    type: "video",
    size: "45.2 MB",
    dimensions: "1280x720",
    url: "/videos/tutorial.mp4",
    uploadDate: "2026-04-20",
    usedIn: 2,
  },
  {
    id: "4",
    name: "code-snippet.png",
    type: "image",
    size: "890 KB",
    dimensions: "1600x900",
    url: "/images/code.png",
    uploadDate: "2026-04-18",
    usedIn: 5,
  },
  {
    id: "5",
    name: "architecture-diagram.svg",
    type: "image",
    size: "124 KB",
    dimensions: "800x600",
    url: "/images/diagram.svg",
    uploadDate: "2026-04-15",
    usedIn: 1,
  },
  {
    id: "6",
    name: "background-music.mp3",
    type: "audio",
    size: "3.8 MB",
    dimensions: "—",
    url: "/audio/bg.mp3",
    uploadDate: "2026-04-10",
    usedIn: 0,
  },
  {
    id: "7",
    name: "documentation.pdf",
    type: "document",
    size: "1.2 MB",
    dimensions: "—",
    url: "/docs/guide.pdf",
    uploadDate: "2026-04-08",
    usedIn: 2,
  },
  {
    id: "8",
    name: "thumbnail-01.jpg",
    type: "image",
    size: "345 KB",
    dimensions: "800x450",
    url: "/images/thumb1.jpg",
    uploadDate: "2026-04-05",
    usedIn: 4,
  },
];

const typeConfig = {
  image: { icon: ImageIcon, color: "var(--brand-primary)", label: "图片" },
  video: { icon: Film, color: "var(--brand-accent)", label: "视频" },
  audio: { icon: Music, color: "var(--orange-500)", label: "音频" },
  document: { icon: FileText, color: "var(--text-secondary)", label: "文档" },
};

const filterOptions = ["全部", "图片", "视频", "音频", "文档"];

function MediaPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeFilter, setActiveFilter] = useState("全部");
  const selected: string[] = [];
  const filtered = mediaItems.filter((item) => {
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "图片" && item.type === "image") ||
      (activeFilter === "视频" && item.type === "video") ||
      (activeFilter === "音频" && item.type === "audio") ||
      (activeFilter === "文档" && item.type === "document");
    return matchSearch && matchFilter;
  });

  const totalSize = mediaItems.reduce((acc, item) => {
    const size = parseFloat(item.size);
    const unit = item.size.includes("MB") ? 1 : 0.001;
    return acc + size * unit;
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">媒体库</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {mediaItems.length} 个文件，共 {totalSize.toFixed(1)} MB
          </p>
        </div>
        <Button>
          <Upload size={16} />
          上传文件
        </Button>
      </div>

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

          <Button variant="outline" size="default" className="gap-2">
            <FolderOpen size={14} />
            文件夹
            <ChevronDown size={12} />
          </Button>
        </div>
      </div>

      {/* Selected Actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--brand-primary-subtle)] border border-[var(--brand-primary)]">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            已选择 {selected.length} 个文件
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm">
              <Download size={14} />
              下载
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 size={14} />
              删除
            </Button>
          </div>
        </div>
      )}

      {/* Media Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((item) => {
            const config = typeConfig[item.type as keyof typeof typeConfig];
            const Icon = config.icon;
            return (
              <div
                key={item.id}
                className="group relative rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all overflow-hidden cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-[var(--bg-muted)] flex items-center justify-center relative">
                  {item.type === "image" ? (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--orange-100)] to-[var(--green-100)]" />
                  ) : (
                    <Icon size={32} style={{ color: config.color }} className="opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-6 h-6 rounded bg-[var(--bg-surface)] shadow-sm flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="text-xs font-medium text-[var(--text-primary)] truncate mb-1">
                    {item.name}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span>{item.size}</span>
                    {item.usedIn > 0 && (
                      <Badge variant="default" className="text-xs px-1.5 py-0">
                        {item.usedIn}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Upload placeholder */}
          <button className="aspect-video rounded-xl border-2 border-dashed border-[var(--border-default)] flex flex-col items-center justify-center gap-2 text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
            <Upload size={24} />
            <span className="text-xs font-medium">上传文件</span>
          </button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 border-b border-[var(--border-default)] text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              <span></span>
              <span>文件名</span>
              <span className="hidden md:block">类型</span>
              <span className="hidden sm:block">大小</span>
              <span className="hidden lg:block">使用</span>
              <span>操作</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[var(--border-default)]">
              {filtered.map((item) => {
                const config = typeConfig[item.type as keyof typeof typeConfig];
                const Icon = config.icon;
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3 hover:bg-[var(--bg-muted)] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} style={{ color: config.color }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">{item.uploadDate}</div>
                    </div>
                    <span className="hidden md:block text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {config.label}
                    </span>
                    <span className="hidden sm:block text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                      {item.size}
                    </span>
                    <div className="hidden lg:block">
                      {item.usedIn > 0 ? (
                        <Badge variant="default">{item.usedIn} 篇</Badge>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">未使用</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                        <Download size={14} />
                      </button>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
