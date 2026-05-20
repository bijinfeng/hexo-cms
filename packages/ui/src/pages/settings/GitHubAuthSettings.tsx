import { ArrowRight, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { GithubIcon } from "../../components/ui/github-icon";
import { useI18n } from "../../i18n/I18nProvider";
import type { AuthClient, AuthSession } from "../../types/auth";

interface GitHubAuthSettingsProps {
  authClient: AuthClient;
  onSignedOut?: () => void;
}

export function GitHubAuthSettings({ authClient, onSignedOut }: GitHubAuthSettingsProps) {
  const { t } = useI18n();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"reauthorize" | "signOut" | null>(null);
  const deviceFlow = session?.deviceFlow;

  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch(() => {
        if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authClient]);

  useEffect(() => {
    if (!deviceFlow) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const nextSession = await authClient.getSession();
        if (!active) return;
        setSession(nextSession);
        if (nextSession.state === "authenticated" || nextSession.state === "error")
          window.clearInterval(timer);
      } catch {
        if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" });
      }
    }, Math.max(deviceFlow.interval, 1) * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authClient, deviceFlow]);

  async function handleReauthorize() {
    setPendingAction("reauthorize");
    try {
      setSession(await authClient.reauthorize());
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSignOut() {
    setPendingAction("signOut");
    try {
      await authClient.signOut();
      setSession({ state: "anonymous" });
      onSignedOut?.();
    } finally {
      setPendingAction(null);
    }
  }

  const user = session?.user;
  const displayName = user?.name || user?.login || user?.email || t("settings.auth.githubUser");
  const statusText = loading
    ? t("settings.auth.checkingAuth")
    : session?.state === "authenticated"
      ? t("settings.auth.authed")
      : t("settings.auth.needReauth");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.auth.title")}</CardTitle>
        <CardDescription>{t("settings.auth.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
              <GithubIcon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {loading ? t("settings.auth.reading") : displayName}
            </div>
            <div className="truncate text-xs text-[var(--text-secondary)]">{statusText}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleReauthorize} disabled={pendingAction !== null}>
            <RefreshCw size={16} />
            {pendingAction === "reauthorize"
              ? t("settings.auth.authorizing")
              : t("settings.auth.reauthorize")}
          </Button>
          <Button variant="secondary" onClick={handleSignOut} disabled={pendingAction !== null}>
            <LogOut size={16} />
            {pendingAction === "signOut"
              ? t("settings.auth.signingOut")
              : t("settings.auth.signOut")}
          </Button>
        </div>
        {deviceFlow && (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">{t("settings.auth.enterCode")}</p>
            <div className="mt-2 rounded-md bg-[var(--bg-card)] px-3 py-2 font-mono text-xl font-bold tracking-widest text-[var(--text-primary)]">
              {deviceFlow.userCode}
            </div>
            <a
              href={deviceFlow.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              {t("settings.auth.openGitHub")}
              <ArrowRight size={12} />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
