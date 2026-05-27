import type { RegisteredSidebarItem } from "@hexo-cms/core";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  FolderOpen,
  GitBranch,
  Image,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  MessageSquare,
  Palette,
  PanelLeftClose,
  Puzzle,
  Settings,
  Tags,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { cn } from "../../utils";

const PLUGIN_ICON_MAP: Record<string, LucideIcon> = {
  "message-square": MessageSquare,
  puzzle: Puzzle,
  "file-text": FileText,
  tags: Tags,
  image: Image,
  settings: Settings,
  "layout-dashboard": LayoutDashboard,
  "folder-open": FolderOpen,
  "git-branch": GitBranch,
  palette: Palette,
  menu: Menu,
  zap: Zap,
  "panel-left-close": PanelLeftClose,
};

function resolvePluginIcon(iconName: string | undefined): LucideIcon {
  if (!iconName) return Puzzle;
  const normalized = iconName.toLowerCase().replace(/_/g, "-");
  return PLUGIN_ICON_MAP[normalized] ?? Puzzle;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  pluginItems?: RegisteredSidebarItem[];
}

export function Sidebar({ collapsed = false, onToggle, pluginItems = [] }: SidebarProps) {
  const { t } = useI18n();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();

  const navItems = useMemo(
    () => [
      {
        group: t("sidebar.content"),
        items: [
          { icon: LayoutDashboard, label: t("sidebar.dashboard"), to: "/" },
          { icon: FileText, label: t("sidebar.posts"), to: "/posts" },
          { icon: Tags, label: t("sidebar.tags"), to: "/tags" },
          { icon: Image, label: t("sidebar.media"), to: "/media" },
        ],
      },
      {
        group: t("sidebar.site"),
        items: [
          { icon: Palette, label: t("sidebar.themes"), to: "/themes" },
          { icon: Menu, label: t("sidebar.menus"), to: "/menus" },
          { icon: FolderOpen, label: t("sidebar.pages"), to: "/pages" },
          { icon: GitBranch, label: t("sidebar.deploy"), to: "/deploy" },
          { icon: Settings, label: t("sidebar.settings"), to: "/settings" },
        ],
      },
    ],
    [t],
  );

  const pluginGroups = useMemo(() => {
    const grouped = new Map<string, RegisteredSidebarItem[]>();
    const defaultGroup = t("sidebar.plugins");
    for (const item of pluginItems) {
      const section = item.section ?? defaultGroup;
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(item);
    }
    return [...grouped.entries()];
  }, [pluginItems, t]);

  return (
    <aside
      className={cn(
        "cms-sidebar flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-12 px-3 border-b border-[var(--sidebar-border)] shrink-0",
          collapsed && "justify-center",
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] flex items-center justify-center shadow-sm">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 font-bold text-sm text-[var(--text-primary)] truncate">HexoCMS</div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navItems.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer no-underline",
                      isActive
                        ? "bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon
                      size={18}
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-[var(--sidebar-item-active-icon)]" : "",
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {pluginGroups.map(([section, items]) => (
          <div key={section}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                {section}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const isPluginSettings = item.target === "plugin.settings";
                const pluginPageMatch = item.target.match(/^\/plugins\/([^/]+)\/(.+)$/);
                const isPluginPage = pluginPageMatch !== null;
                const isActive = isPluginSettings
                  ? pathname === "/settings"
                  : pathname === item.target;
                const Icon = resolvePluginIcon(item.icon);
                const displayName = item.title;

                if (isPluginSettings) {
                  return (
                    <button
                      key={`${item.pluginId}:${item.id}`}
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/settings",
                          search: { section: "plugins", plugin: item.pluginId } as any,
                        })
                      }
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border-none bg-transparent w-full text-left",
                        isActive
                          ? "bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]",
                        collapsed && "justify-center px-2",
                      )}
                      title={collapsed ? displayName : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          "flex-shrink-0",
                          isActive ? "text-[var(--sidebar-item-active-icon)]" : "",
                        )}
                      />
                      {!collapsed && <span className="truncate">{displayName}</span>}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                      )}
                    </button>
                  );
                }

                if (isPluginPage) {
                  return (
                    <Link
                      key={`${item.pluginId}:${item.id}`}
                      to="/plugins/$pluginId/$pageId"
                      params={{ pluginId: pluginPageMatch[1], pageId: pluginPageMatch[2] }}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer no-underline",
                        isActive
                          ? "bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]",
                        collapsed && "justify-center px-2",
                      )}
                      title={collapsed ? displayName : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          "flex-shrink-0",
                          isActive ? "text-[var(--sidebar-item-active-icon)]" : "",
                        )}
                      />
                      {!collapsed && <span className="truncate">{displayName}</span>}
                      {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={`${item.pluginId}:${item.id}`}
                    to={item.target as any}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer no-underline",
                      isActive
                        ? "bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-item-hover)]",
                      collapsed && "justify-center px-2",
                    )}
                    title={collapsed ? displayName : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      size={18}
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-[var(--sidebar-item-active-icon)]" : "",
                      )}
                    />
                    {!collapsed && <span className="truncate">{displayName}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center hover:bg-[var(--bg-muted)] transition-colors cursor-pointer",
            collapsed ? "justify-center py-3" : "px-4 py-2.5 gap-2",
          )}
        >
          <span
            className={cn(
              "rounded-full bg-[var(--brand-accent)] flex-shrink-0 transition-all duration-200",
              collapsed ? "w-0 opacity-0 overflow-hidden" : "w-1.5 h-1.5 opacity-100",
            )}
          />
          <span
            className={cn(
              "text-xs text-[var(--text-secondary)] whitespace-nowrap transition-all duration-200",
              collapsed ? "w-0 opacity-0 overflow-hidden" : "flex-1 text-left opacity-100",
            )}
          >
            {t("sidebar.connected")}
          </span>
          <PanelLeftClose
            size={14}
            className={cn(
              "flex-shrink-0 transition-transform duration-300 text-[var(--text-tertiary)]",
              collapsed ? "rotate-180" : "",
            )}
          />
        </button>
      </div>
    </aside>
  );
}
