import { useState, useEffect, useCallback } from "react";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import { Sun, Moon, Bell, Search, Menu } from "lucide-react";
import { WindowControls } from "./WindowControls";
import { UserMenu } from "../user-menu";
import { CommandPalette } from "../command-palette";
import type { AuthClient } from "../../types/auth";

interface TopbarProps {
  title?: string;
  isElectron?: boolean;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  authClient?: AuthClient;
  onSignedOut?: () => void;
}

export function Topbar({ title, isElectron, onMenuToggle, showSearch = true, authClient, onSignedOut }: TopbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMac = /Mac|Darwin/i.test(navigator.userAgent || navigator.platform);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setPaletteOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header
      className={cn(
        "h-12 flex items-center gap-3 px-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] sticky top-0 z-10",
        isElectron && isMac && "pl-20"
      )}
      style={isElectron ? { WebkitAppRegion: "drag" } as React.CSSProperties : undefined}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
        style={isElectron ? { WebkitAppRegion: "no-drag" } as React.CSSProperties : undefined}
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="text-base font-semibold text-[var(--text-primary)] hidden sm:block">
          {title}
        </h1>
      )}

      {showSearch && (
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex-1 max-w-sm hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] text-sm text-[var(--text-tertiary)] cursor-text hover:border-[var(--border-strong)] transition-colors"
          style={isElectron ? { WebkitAppRegion: "no-drag" } as React.CSSProperties : undefined}
        >
          <Search size={14} />
          <span>搜索...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--text-tertiary)]">
            ⌘K
          </kbd>
        </button>
      )}

      <div className="ml-auto flex items-center gap-1" style={isElectron ? { WebkitAppRegion: "no-drag" } as React.CSSProperties : undefined}>
        {/* 
          通知铃铛 — 当前阶段保留代码，功能暂不启用。
          待评论插件（Giscus / Waline webhook）接入后重新激活：
          - 替换静态红点为实时未读数
          - 添加下拉通知列表
          详见 docs/superpowers/specs/2026-05-15-topbar-features-design.md
        */}
        <Button variant="ghost" size="icon" className="relative opacity-50 pointer-events-none" disabled>
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        {/* User avatar / menu */}
        {authClient && onSignedOut ? (
          <UserMenu authClient={authClient} onSignedOut={onSignedOut} />
        ) : (
          <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity ml-1">
            K
          </button>
        )}
      </div>

      {/* Window controls — Electron on Windows/Linux */}
      {isElectron && !isMac && (
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <WindowControls />
        </div>
      )}

      {/* Command palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
