import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../../utils";

const routeTitles: Record<string, string> = {
  "/": "数据大盘",
  "/posts": "文章管理",
  "/posts/new": "新建文章",
  "/tags": "标签 & 分类",
  "/media": "媒体库",
  "/comments": "评论管理",
  "/themes": "主题管理",
  "/pages": "页面管理",
  "/deploy": "部署管理",
  "/settings": "站点设置",
};

export function CMSLayout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const title = routeTitles[pathname] ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 lg:relative lg:z-auto transition-transform duration-300",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={title} onMenuToggle={() => setMobileSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
