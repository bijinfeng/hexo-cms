import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { SettingsPage, type SettingsSectionDef } from "@hexo-cms/ui/pages/settings";
import { desktopAuthClient } from "../lib/desktop-auth-client";
import { RefreshCw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hexo-cms/ui";
import { useUpdater } from "../hooks/useUpdater";

function UpdatesSection() {
  const updater = useUpdater();
  if (!updater) return null;

  const { status, progress, version, error, channel, currentVersion, checkForUpdates, downloadUpdate, quitAndInstall, setChannel } = updater;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>版本信息</CardTitle>
          <p className="text-sm text-[var(--text-secondary)]">当前版本和更新设置</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">当前版本</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">v{currentVersion || "..."}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">更新通道</span>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as "stable" | "beta")}
            >
              <SelectTrigger className="w-28" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button
            onClick={checkForUpdates}
            disabled={status === "checking" || status === "downloading"}
            className="w-full"
          >
            <RefreshCw size={16} className={status === "checking" || status === "downloading" ? "animate-spin" : ""} />
            {status === "checking" ? "检查中..." : status === "downloading" ? "下载中..." : "检查更新"}
          </Button>

          {status === "available" && version && (
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--text-primary)]">发现新版本 v{version}</p>
              <Button onClick={downloadUpdate} variant="default" className="w-full">
                立即更新
              </Button>
            </div>
          )}

          {status === "downloading" && (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-[var(--text-secondary)]">{progress}%</p>
            </div>
          )}

          {status === "downloaded" && (
            <Button onClick={quitAndInstall} variant="default" className="w-full">
              重启安装
            </Button>
          )}

          {status === "up-to-date" && (
            <p className="text-sm text-center text-[var(--text-secondary)]">已是最新版本</p>
          )}

          {status === "error" && (
            <div className="text-center space-y-2">
              <p className="text-sm text-red-500">更新失败{error ? `: ${error}` : ""}</p>
              <Button onClick={checkForUpdates} variant="ghost" className="w-full">
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const updatesSectionDef: SettingsSectionDef = {
  id: "updates",
  label: "自动更新",
  icon: RefreshCw,
  render: () => <UpdatesSection />,
};

function DesktopSettingsPage() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const section = getSearchValue(routerState.location.search, "section");
  return (
    <SettingsPage
      authClient={desktopAuthClient}
      initialSection={section}
      extraSections={[updatesSectionDef]}
      onSignedOut={() => navigate({ to: "/login", replace: true })}
    />
  );
}

export const Route = createFileRoute("/settings")({
  component: DesktopSettingsPage,
});

function getSearchValue(search: unknown, key: string): string | undefined {
  if (typeof search === "string") {
    return new URLSearchParams(search).get(key) ?? undefined;
  }
  if (search && typeof search === "object") {
    const value = (search as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}
