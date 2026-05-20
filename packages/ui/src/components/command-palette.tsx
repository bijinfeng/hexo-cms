import type { HexoPost } from "@hexo-cms/core";
import { useNavigate } from "@tanstack/react-router";
import { FilePlus, Rocket, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { useI18n } from "../i18n/I18nProvider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentPosts, setRecentPosts] = useState<HexoPost[]>([]);

  const NAV_ITEMS = useMemo(
    () => [
      { label: t("sidebar.dashboard"), to: "/" },
      { label: t("sidebar.posts"), to: "/posts" },
      { label: t("sidebar.pages"), to: "/pages" },
      { label: t("sidebar.media"), to: "/media" },
      { label: t("sidebar.tags"), to: "/tags" },
      { label: t("sidebar.themes"), to: "/themes" },
      { label: t("sidebar.menus"), to: "/menus" },
      { label: t("sidebar.deploy"), to: "/deploy" },
      { label: t("sidebar.settings"), to: "/settings" },
    ],
    [t],
  );

  const ACTIONS = useMemo(
    () => [
      { id: "new-post", label: t("posts.editor.newTitle"), to: "/posts/new", icon: FilePlus },
      { id: "new-page", label: t("pages.editor.newTitle"), to: "/pages/new", icon: FilePlus },
      { id: "deploy", label: t("deploy.triggerDeploy"), to: "/deploy", icon: Rocket },
    ],
    [t],
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
      dataProvider
        .getPosts()
        .then((posts) => {
          const sorted = [...posts]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
          setRecentPosts(sorted);
        })
        .catch(() => setRecentPosts([]));
    }
  }, [isOpen, dataProvider]);

  const filteredNav = query
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.to.toLowerCase().includes(query.toLowerCase()),
      )
    : NAV_ITEMS;

  const filteredActions = query
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS;

  const filteredPosts = query
    ? recentPosts.filter((p) => (p.title || "").toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = useCallback(
    (to: string) => {
      navigate({ to: to as "/" });
      onClose();
    },
    [navigate, onClose],
  );

  const handleSelectPost = useCallback(
    (path: string) => {
      navigate({
        to: "/posts/$slug",
        params: { slug: path.replace(/^source\/_posts\//, "").replace(/\.md$/, "") },
      });
      onClose();
    },
    [navigate, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
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
            placeholder={t("components.commandPalette.searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>{t("components.commandPalette.noResults")}</CommandEmpty>

            {filteredActions.length > 0 && (
              <CommandGroup heading={t("components.commandPalette.quickActions")}>
                {filteredActions.map((a) => (
                  <CommandItem key={a.id} value={a.id} onSelect={() => handleSelect(a.to)}>
                    <a.icon size={15} className="text-[var(--text-tertiary)]" />
                    {a.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredNav.length > 0 && (
              <CommandGroup heading={t("components.commandPalette.pageNav")}>
                {filteredNav.map((item) => (
                  <CommandItem key={item.to} value={item.to} onSelect={() => handleSelect(item.to)}>
                    <Search size={15} className="text-[var(--text-tertiary)]" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredPosts.length > 0 && (
              <CommandGroup heading={t("components.commandPalette.recentPosts")}>
                {filteredPosts.map((p) => (
                  <CommandItem
                    key={p.path}
                    value={p.path}
                    onSelect={() => handleSelectPost(p.path)}
                  >
                    <Search size={15} className="text-[var(--text-tertiary)]" />
                    {p.title || t("components.commandPalette.untitled")}
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
