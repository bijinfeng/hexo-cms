import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ATTACHMENTS_HELPER_PLUGIN_ID } from "@hexo-cms/core";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../../utils";
import { usePluginSystem } from "../../plugin";

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

export function CMSLayout({ children, isElectron }: { children: ReactNode; isElectron?: boolean }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { snapshot } = usePluginSystem();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const title = routeTitles[pathname] ?? "";
  const attachmentsPluginEnabled = snapshot.plugins.some(
    ({ manifest, record }) => manifest.id === ATTACHMENTS_HELPER_PLUGIN_ID && record.state === "enabled",
  );
  const showTopbarSearch = pathname !== "/media" || attachmentsPluginEnabled;
  const isMac = /Mac|Darwin/i.test(navigator.userAgent || navigator.platform);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* Traffic light spacer — macOS Electron */}
      {isElectron && isMac && (
        <div
          className="h-8 w-full shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
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
          <Topbar
            title={title}
            isElectron={isElectron}
            onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
            showSearch={showTopbarSearch}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
