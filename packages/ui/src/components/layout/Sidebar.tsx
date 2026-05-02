import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "../../utils";
import {
  LayoutDashboard,
  FileText,
  Tags,
  FolderOpen,
  Image,
  MessageSquare,
  Palette,
  Settings,
  GitBranch,
  PanelLeftClose,
  Zap,
} from "lucide-react";

const navItems = [
  {
    group: "内容",
    items: [
      { icon: LayoutDashboard, label: "数据大盘", to: "/" },
      { icon: FileText, label: "文章管理", to: "/posts" },
      { icon: Tags, label: "标签 & 分类", to: "/tags" },
      { icon: Image, label: "媒体管理", to: "/media" },
    ],
  },
  {
    group: "互动",
    items: [
      { icon: MessageSquare, label: "评论管理", to: "/comments" },
    ],
  },
  {
    group: "站点",
    items: [
      { icon: Palette, label: "主题管理", to: "/themes" },
      { icon: FolderOpen, label: "页面管理", to: "/pages" },
      { icon: GitBranch, label: "部署管理", to: "/deploy" },
      { icon: Settings, label: "站点设置", to: "/settings" },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <aside
      className={cn(
        "cms-sidebar flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-12 px-3 border-b border-[var(--sidebar-border)] shrink-0", collapsed && "justify-center")}>
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
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      size={18}
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-[var(--sidebar-item-active-icon)]" : ""
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
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center hover:bg-[var(--bg-muted)] transition-colors cursor-pointer",
            collapsed ? "justify-center py-3" : "px-4 py-2.5 gap-2"
          )}
        >
          <span className={cn(
            "rounded-full bg-[var(--brand-accent)] flex-shrink-0 transition-all duration-200",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-1.5 h-1.5 opacity-100"
          )} />
          <span className={cn(
            "text-xs text-[var(--text-secondary)] whitespace-nowrap transition-all duration-200",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "flex-1 text-left opacity-100"
          )}>已连接 GitHub 仓库</span>
          <PanelLeftClose
            size={14}
            className={cn(
              "flex-shrink-0 transition-transform duration-300 text-[var(--text-tertiary)]",
              collapsed ? "rotate-180" : ""
            )}
          />
        </button>
      </div>
    </aside>
  );
}
