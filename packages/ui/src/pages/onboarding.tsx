import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDataProvider } from "../context/data-provider-context";
import { Button } from "../components/ui/button";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { GithubIcon } from "../components/ui/github-icon";

const STEPS = ["GitHub Token", "仓库配置", "完成"];

type ElectronTokenAPI = {
  setToken: (token: string) => Promise<unknown>;
};

function getElectronTokenAPI(): ElectronTokenAPI | null {
  if (typeof window === "undefined") return null;
  const api = (window as typeof globalThis & { electronAPI?: ElectronTokenAPI }).electronAPI;
  return api ?? null;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const electronAPI = getElectronTokenAPI();
  const isDesktop = Boolean(electronAPI);

  async function handleValidateToken() {
    if (!token.trim()) return;
    setValidating(true);
    setError("");
    try {
      if (isDesktop) {
        await electronAPI?.setToken(token);
      }
      setStep(1);
    } catch {
      setError("Token 验证失败，请检查");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!owner.trim() || !repo.trim()) return;
    setSaving(true);
    setError("");
    try {
      await dataProvider.saveConfig({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch || "main",
        postsDir: "source/_posts",
        mediaDir: "source/images",
      });
      if (isDesktop) {
        await electronAPI?.setToken(token);
      }
      setStep(2);
    } catch {
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <GithubIcon className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">连接你的博客</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">配置 GitHub 仓库即可开始管理博客</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= step ? "bg-primary-500 text-white" : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]"
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= step ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{label}</span>
              {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
            </div>
          ))}
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">GitHub Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={isDesktop ? "输入 GitHub Token" : "在网页端由 OAuth 自动管理"}
                  disabled={!isDesktop}
                  className="form-input w-full"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  创建一个有 repo 权限的 token：Settings → Developer settings → Personal access tokens
                </p>
              </div>
              {error && <p className="text-sm text-[var(--status-error)]">{error}</p>}
              <Button onClick={handleValidateToken} disabled={!token.trim() || validating} className="w-full">
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                验证并继续
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">仓库所有者</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="your-username"
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">仓库名称</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="your-hexo-blog"
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">分支（可选）</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="form-input w-full"
                />
              </div>
              {error && <p className="text-sm text-[var(--status-error)]">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">上一步</Button>
                <Button onClick={handleSave} disabled={!owner.trim() || !repo.trim() || saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  完成设置
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-[var(--status-success)] mx-auto" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">设置完成！</h2>
              <p className="text-sm text-[var(--text-secondary)]">你的博客已经连接成功，开始管理内容吧。</p>
              <Button onClick={() => navigate({ to: "/" })} className="w-full">
                进入仪表板
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
