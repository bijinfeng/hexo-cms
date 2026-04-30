import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Palette,
  CheckCircle2,
  Download,
  Star,
  Eye,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function ThemesPage() {
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [installedThemes, setInstalledThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    try {
      setLoading(true);
      setError("");

      const configRes = await fetch("/api/github/config");
      if (!configRes.ok) {
        setError("请先在设置页面配置 GitHub 仓库");
        return;
      }
      const configData = await configRes.json();
      if (!configData.config) {
        setError("请先在设置页面配置 GitHub 仓库");
        return;
      }
      setGithubConfig(configData.config);

      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) {
        setError("无法获取 GitHub 访问令牌");
        return;
      }
      const tokenData = await tokenRes.json();
      if (!tokenData.accessToken) {
        setError("无法获取 GitHub 访问令牌");
        return;
      }
      setAccessToken(tokenData.accessToken);

      const { owner, repo } = configData.config;
      const params = new URLSearchParams({ owner, repo, token: tokenData.accessToken });
      const themesRes = await fetch(`/api/github/themes?${params}`);
      if (!themesRes.ok) {
        const errData = await themesRes.json();
        setError(errData.error || "加载主题失败");
        return;
      }

      const themesData = await themesRes.json();
      setCurrentTheme(themesData.currentTheme);
      setInstalledThemes(themesData.installedThemes || []);
    } catch (err: any) {
      setError(err.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchTheme(themeName: string) {
    if (!githubConfig || !accessToken || switching) return;
    try {
      setSwitching(true);
      const res = await fetch("/api/github/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: githubConfig.owner,
          repo: githubConfig.repo,
          token: accessToken,
          theme: themeName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "切换主题失败");
        return;
      }
      setCurrentTheme(themeName);
      alert(`已切换到主题「${themeName}」，请重新部署站点以生效`);
    } catch (err: any) {
      alert(err.message || "切换主题失败");
    } finally {
      setSwitching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={48} className="text-[var(--status-error)]" />
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">主题管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {currentTheme ? `当前使用：${currentTheme}` : "管理和切换 Hexo 主题"}
          </p>
        </div>
        <Button variant="outline" disabled>
          <Download size={16} />
          安装新主题
        </Button>
      </div>

      {installedThemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Palette size={40} className="mb-3 opacity-30" />
          <p className="text-sm">未检测到已安装的主题</p>
          <p className="text-xs mt-1">请在仓库的 themes/ 目录下安装主题</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {installedThemes.map((themeName) => {
            const isActive = currentTheme === themeName;
            return (
              <Card
                key={themeName}
                className={`transition-all ${
                  isActive ? "border-[var(--brand-primary)] shadow-[var(--shadow-md)]" : "hover:shadow-[var(--shadow-sm)]"
                }`}
              >
                <CardContent className="p-5">
                  <div className="w-full h-32 rounded-lg bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-subtle)] mb-4 flex items-center justify-center relative overflow-hidden">
                    <Palette size={32} className="text-[var(--text-tertiary)] opacity-30" />
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="success">当前使用</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {themeName}
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Hexo 主题
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    已安装在 themes/{themeName} 目录
                  </p>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Button variant="success" size="sm" className="flex-1" disabled>
                        <CheckCircle2 size={14} />
                        已启用
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSwitchTheme(themeName)}
                        disabled={switching}
                      >
                        {switching ? "切换中..." : "切换主题"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
