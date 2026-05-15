import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, FilePlus, Rocket, ArrowRight } from "lucide-react";
import { useDataProvider } from "../context/data-provider-context";
import type { HexoPost } from "@hexo-cms/core";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: "数据大盘", to: "/" },
  { label: "文章管理", to: "/posts" },
  { label: "页面管理", to: "/pages" },
  { label: "媒体库", to: "/media" },
  { label: "标签 & 分类", to: "/tags" },
  { label: "主题管理", to: "/themes" },
  { label: "部署管理", to: "/deploy" },
  { label: "站点设置", to: "/settings" },
];

const ACTIONS = [
  { id: "new-post", label: "新建文章", to: "/posts/new", icon: FilePlus },
  { id: "new-page", label: "新建页面", to: "/pages/new", icon: FilePlus },
  { id: "deploy", label: "触发部署", to: "/deploy", icon: Rocket },
];

type ResultItem =
  | { type: "nav"; label: string; to: string }
  | { type: "action"; id: string; label: string; to: string; icon: React.ComponentType<{ size?: number; className?: string }> }
  | { type: "post"; path: string; title: string };

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentPosts, setRecentPosts] = useState<HexoPost[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      dataProvider.getPosts().then((posts) => {
        const sorted = [...posts]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        setRecentPosts(sorted);
      }).catch(() => setRecentPosts([]));
    }
  }, [isOpen, dataProvider]);

  const filteredNav = query
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.to.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  const filteredActions = query
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS;

  const filteredPosts = query
    ? recentPosts.filter((p) =>
        (p.title || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const results: ResultItem[] = [
    ...filteredActions.map((a) => ({ type: "action" as const, ...a })),
    ...filteredNav.map((n) => ({ type: "nav" as const, ...n })),
    ...filteredPosts.map((p) => ({
      type: "post" as const,
      path: p.path,
      title: p.title || "无标题",
    })),
  ];

  const handleSelect = useCallback(
    (index: number) => {
      const item = results[index];
      if (!item) return;
      if (item.type === "post") {
        navigate({ to: "/posts/$slug", params: { slug: item.path.replace(/^source\/_posts\//, "").replace(/\.md$/, "") } });
      } else {
        navigate({ to: item.to });
      }
      onClose();
    },
    [results, navigate, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results.length, selectedIndex, handleSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--border-default)]">
          <Search size={16} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令或文章..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          <kbd className="text-[10px] font-mono bg-[var(--bg-muted)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--text-tertiary)] shrink-0">
            Esc
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-sm text-[var(--text-tertiary)] text-center py-8">
              无匹配结果
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.type === "post" ? item.path : (item.type === "action" ? item.id : item.to)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                  i === selectedIndex
                    ? "bg-[var(--bg-muted)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                }`}
                onClick={() => handleSelect(i)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {item.type === "action" ? (
                  <item.icon size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                ) : item.type === "nav" ? (
                  <ArrowRight size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                ) : (
                  <Search size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                )}
                <span className="truncate">{item.label || item.title}</span>
                {item.type === "nav" && (
                  <span className="ml-auto text-[10px] text-[var(--text-tertiary)] font-mono shrink-0">
                    {item.to}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
