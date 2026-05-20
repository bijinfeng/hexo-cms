import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { usePluginSystem } from "../../plugin";
import type { AuthClient } from "../../types/auth";
import { cn } from "../../utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function CMSLayout({
  children,
  isElectron,
  authClient,
  onSignedOut,
}: {
  children: ReactNode;
  isElectron?: boolean;
  authClient?: AuthClient;
  onSignedOut?: () => void;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { snapshot } = usePluginSystem();
  const { t } = useI18n();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const title = useMemo(() => {
    const titles: Record<string, string> = {
      "/": t("sidebar.dashboard"),
      "/posts": t("sidebar.posts"),
      "/posts/new": t("posts.editor.newTitle"),
      "/pages": t("sidebar.pages"),
      "/pages/new": t("pages.editor.newTitle"),
      "/tags": t("sidebar.tags"),
      "/media": t("sidebar.media"),
      "/comments": t("sidebar.comments"),
      "/themes": t("sidebar.themes"),
      "/deploy": t("sidebar.deploy"),
      "/settings": t("sidebar.settings"),
    };
    return titles[pathname] ?? "";
  }, [pathname, t]);
  const showTopbarSearch =
    pathname !== "/media" ||
    snapshot.extensions.uiFlags.some((flag) => flag.flag === "media.search");
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
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/50 lg:hidden border-none p-0 cursor-pointer"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-30 lg:relative lg:z-auto transition-transform duration-300",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
            pluginItems={snapshot.extensions.sidebarItems}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            title={title}
            isElectron={isElectron}
            onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
            showSearch={showTopbarSearch}
            authClient={authClient}
            onSignedOut={onSignedOut}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
