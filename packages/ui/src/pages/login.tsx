import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "../auth-client";
import { Github, Zap, ArrowRight, Shield, GitBranch, Sparkles } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGitHubLogin() {
    setLoading(true);
    setError("");
    try {
      await signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (e) {
      setError("登录失败，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">HexoCMS</span>
        </div>

        {/* Features */}
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            专为 Hexo 博客
            <br />
            打造的内容管理平台
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            连接你的 GitHub 仓库，通过直观的界面管理博客内容，所有改动自动转化为 Git 提交。
          </p>

          <div className="space-y-4">
            {[
              { icon: GitBranch, text: "所有改动自动提交到 GitHub" },
              { icon: Shield, text: "GitHub OAuth 安全认证" },
              { icon: Sparkles, text: "现代化编辑器，支持 Markdown" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-white/60 text-sm">
          基于 TanStack Start · Better Auth · GitHub API
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">HexoCMS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">欢迎回来</h2>
            <p className="text-[var(--text-secondary)] text-sm">
              使用 GitHub 账号登录，开始管理你的博客
            </p>
          </div>

          {/* GitHub Login Button */}
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 px-6 rounded-xl bg-[#24292e] dark:bg-[#f0f6ff] text-white dark:text-[#24292e] font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Github size={18} />
            )}
            {loading ? "正在跳转..." : "使用 GitHub 登录"}
            {!loading && <ArrowRight size={16} className="ml-auto" />}
          </button>

          {error && (
            <p className="mt-3 text-sm text-[var(--status-error)] text-center">{error}</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-xs text-[var(--text-tertiary)]">或者</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
          </div>

          {/* Dev bypass */}
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full flex items-center justify-center gap-2 h-10 px-6 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            开发模式（跳过登录）
          </button>

          <p className="mt-6 text-xs text-[var(--text-tertiary)] text-center leading-relaxed">
            登录即表示你同意我们的服务条款。
            <br />
            你的数据仅存储在你自己的 GitHub 仓库中。
          </p>
        </div>
      </div>
    </div>
  );
}
