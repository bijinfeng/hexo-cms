import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FilePlus, Rocket, Search } from "lucide-react";
import { useDataProvider } from "../context/data-provider-context";
import type { HexoPost } from "@hexo-cms/core";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command";

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

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentPosts, setRecentPosts] = useState<HexoPost[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
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

  const handleSelect = useCallback(
    (to: string) => {
      navigate({ to } as any);
      onClose();
    },
    [navigate, onClose]
  );

  const handleSelectPost = useCallback(
    (path: string) => {
      navigate({
        to: "/posts/$slug",
        params: { slug: path.replace(/^source\/_posts\//, "").replace(/\.md$/, "") },
      });
      onClose();
    },
    [navigate, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative w-full max-w-lg animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="shadow-2xl">
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="搜索命令或文章..."
          />
          <CommandList>
            <CommandEmpty>无匹配结果</CommandEmpty>

            {filteredActions.length > 0 && (
              <CommandGroup heading="快捷操作">
                {filteredActions.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={a.id}
                    onSelect={() => handleSelect(a.to)}
                  >
                    <a.icon size={15} className="text-[var(--text-tertiary)]" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredNav.length > 0 && (
              <CommandGroup heading="页面导航">
                {filteredNav.map((item) => (
                  <CommandItem
                    key={item.to}
                    value={item.to}
                    onSelect={() => handleSelect(item.to)}
                  >
                    <Search size={15} className="text-[var(--text-tertiary)]" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredPosts.length > 0 && (
              <CommandGroup heading="最近文章">
                {filteredPosts.map((p) => (
                  <CommandItem
                    key={p.path}
                    value={p.path}
                    onSelect={() => handleSelectPost(p.path)}
                  >
                    <Search size={15} className="text-[var(--text-tertiary)]" />
                    {p.title || "无标题"}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
