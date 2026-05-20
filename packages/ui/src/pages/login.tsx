import { ArrowRight, GitBranch, Loader2, Shield, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { GithubIcon } from "../components/ui/github-icon";
import { useI18n } from "../i18n/I18nProvider";
import type { AuthClient, AuthSession } from "../types/auth";

const LOGIN_FEATURES = [
  { key: "login.feature1" as const, icon: GitBranch },
  { key: "login.feature2" as const, icon: Shield },
  { key: "login.feature3" as const, icon: Sparkles },
];

export interface LoginPageProps {
  authClient?: AuthClient;
  signIn?: {
    social: (opts: { provider: string; callbackURL: string }) => Promise<unknown>;
  };
  onComplete?: () => void;
}

export function LoginPage({ authClient, signIn, onComplete }: LoginPageProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);

  function getAuthErrorMessage(error?: string) {
    switch (error) {
      case "AUTH_TIMEOUT":
        return t("login.errors.expired");
      case "AUTH_REJECTED":
        return t("login.errors.cancelled");
      case "AUTH_DEVICE_FLOW_DISABLED":
        return t("login.errors.notEnabled");
      case "AUTH_NOT_CONFIGURED":
        return t("login.errors.unavailable");
      case "AUTH_SCOPE_INSUFFICIENT":
        return t("login.errors.missingScope");
      default:
        return t("login.errors.failed");
    }
  }

  async function handleGitHubLogin() {
    setLoading(true);
    setError("");
    try {
      if (authClient) {
        const nextSession = await authClient.startLogin();
        setSession(nextSession);
        if (nextSession.state === "authenticated") {
          onComplete?.();
        } else if (nextSession.state === "error") {
          setError(getAuthErrorMessage(nextSession.error));
        }
      } else if (signIn) {
        await signIn.social({
          provider: "github",
          callbackURL: "/",
        });
        onComplete?.();
      } else {
        setError(t("login.errors.unavailable"));
      }
    } catch {
      setError(t("login.errors.failed"));
    } finally {
      setLoading(false);
    }
  }

  const deviceFlow = session?.deviceFlow;

  useEffect(() => {
    if (!authClient || !deviceFlow) return;

    let active = true;
    const intervalMs = Math.max(deviceFlow.interval, 1) * 1000;

    const timer = window.setInterval(async () => {
      try {
        const nextSession = await authClient.getSession();
        if (!active) return;
        setSession(nextSession);
        if (nextSession.state === "authenticated") {
          window.clearInterval(timer);
          onComplete?.();
        } else if (nextSession.state === "error") {
          setError(getAuthErrorMessage(nextSession.error));
        }
      } catch {
        if (active) setError(t("login.errors.checkFailed"));
      }
    }, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authClient, deviceFlow, onComplete, t]);

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
            {t("login.title")}
            <br />
            {t("login.subtitle")}
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">{t("login.description")}</p>

          <div className="space-y-4">
            {LOGIN_FEATURES.map(({ key, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium">{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-white/60 text-sm">{t("login.techStack")}</div>
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
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              {t("login.welcomeBack")}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">{t("login.loginPrompt")}</p>
          </div>

          {/* GitHub Login Button */}
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 px-6 rounded-xl bg-[#24292e] dark:bg-[#f0f6ff] text-white dark:text-[#24292e] font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <GithubIcon size={18} />}
            {loading ? t("login.redirecting") : t("login.loginBtn")}
            {!loading && <ArrowRight size={16} className="ml-auto" />}
          </button>

          {error && <p className="mt-3 text-sm text-[var(--status-error)] text-center">{error}</p>}

          {deviceFlow && (
            <div className="mt-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">{t("settings.auth.enterCode")}</p>
              <div className="mt-3 rounded-lg bg-[var(--bg-muted)] px-4 py-3 font-mono text-2xl font-bold tracking-widest text-[var(--text-primary)]">
                {deviceFlow.userCode}
              </div>
              <a
                href={deviceFlow.verificationUri}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-[var(--brand-primary)] hover:underline"
              >
                {t("settings.auth.openGitHub")}
                <ArrowRight size={14} />
              </a>
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">{t("login.autoContinue")}</p>
            </div>
          )}

          <p className="mt-6 text-xs text-[var(--text-tertiary)] text-center leading-relaxed">
            {t("login.consent")}
            <br />
            {t("login.dataNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
