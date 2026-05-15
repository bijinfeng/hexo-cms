import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AuthClient, AuthSession } from "../types/auth";
import { Settings, LogOut } from "lucide-react";

interface UserMenuProps {
  authClient: AuthClient;
  onSignedOut: () => void;
}

export function UserMenu({ authClient, onSignedOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    authClient.getSession().then(setSession);
  }, [authClient]);

  const user = session?.user;
  const displayName = user?.name || user?.login || "用户";
  const email = user?.email;
  const initial = displayName[0]?.toUpperCase() || "U";

  function handleSignOut() {
    authClient.signOut().then(() => {
      setOpen(false);
      onSignedOut();
    });
  }

  function handleSettings() {
    setOpen(false);
    navigate({ to: "/settings" });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity ml-1"
        aria-label="用户菜单"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-xs font-bold">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg z-50 py-1 animate-fade-in">
            <div className="px-3 py-2.5 flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {displayName}
                </div>
                {email && (
                  <div className="text-xs text-[var(--text-secondary)] truncate">
                    {email}
                  </div>
                )}
              </div>
            </div>

            <div className="mx-3 my-1 border-t border-[var(--border-default)]" />

            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <Settings size={15} className="text-[var(--text-secondary)]" />
              系统设置
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <LogOut size={15} className="text-[var(--text-secondary)]" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
