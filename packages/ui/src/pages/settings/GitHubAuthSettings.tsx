import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { RefreshCw, LogOut, ArrowRight } from "lucide-react";
import { GithubIcon } from "../../components/ui/github-icon";
import type { AuthClient, AuthSession } from "../../types/auth";

interface GitHubAuthSettingsProps {
  authClient: AuthClient;
  onSignedOut?: () => void;
}

export function GitHubAuthSettings({ authClient, onSignedOut }: GitHubAuthSettingsProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"reauthorize" | "signOut" | null>(null);
  const deviceFlow = session?.deviceFlow;

  useEffect(() => {
    let active = true;
    authClient.getSession()
      .then((nextSession) => { if (active) setSession(nextSession); })
      .catch(() => { if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authClient]);

  useEffect(() => {
    if (!deviceFlow) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const nextSession = await authClient.getSession();
        if (!active) return;
        setSession(nextSession);
        if (nextSession.state === "authenticated" || nextSession.state === "error") window.clearInterval(timer);
      } catch { if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" }); }
    }, Math.max(deviceFlow.interval, 1) * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [authClient, deviceFlow]);

  async function handleReauthorize() {
    setPendingAction("reauthorize");
    try { setSession(await authClient.reauthorize()); }
    finally { setPendingAction(null); }
  }

  async function handleSignOut() {
    setPendingAction("signOut");
    try { await authClient.signOut(); setSession({ state: "anonymous" }); onSignedOut?.(); }
    finally { setPendingAction(null); }
  }

  const user = session?.user;
  const displayName = user?.name || user?.login || user?.email || "GitHub 用户";
  const statusText = loading ? "检查授权状态中" : session?.state === "authenticated" ? "已通过 GitHub OAuth 授权" : "需要重新登录或授权";

  return (
    <Card>
      <CardHeader><CardTitle>GitHub 授权</CardTitle><CardDescription>管理当前 GitHub OAuth 登录状态</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"><GithubIcon size={20} /></div>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">{loading ? "读取中..." : displayName}</div>
            <div className="truncate text-xs text-[var(--text-secondary)]">{statusText}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleReauthorize} disabled={pendingAction !== null}><RefreshCw size={16} />{pendingAction === "reauthorize" ? "授权中..." : "重新授权"}</Button>
          <Button variant="secondary" onClick={handleSignOut} disabled={pendingAction !== null}><LogOut size={16} />{pendingAction === "signOut" ? "退出中..." : "退出登录"}</Button>
        </div>
        {deviceFlow && (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">在 GitHub 页面输入授权码</p>
            <div className="mt-2 rounded-md bg-[var(--bg-card)] px-3 py-2 font-mono text-xl font-bold tracking-widest text-[var(--text-primary)]">{deviceFlow.userCode}</div>
            <a href={deviceFlow.verificationUri} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-medium text-[var(--brand-primary)] hover:underline">打开 GitHub 授权页面<ArrowRight size={12} /></a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
