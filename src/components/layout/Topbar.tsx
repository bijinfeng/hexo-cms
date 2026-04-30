import { useState, useEffect } from "react";
import { Button } from "#/components/ui/button";
import { Sun, Moon, Bell, Search, Menu } from "lucide-react";

interface TopbarProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] sticky top-0 z-10">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="text-base font-semibold text-[var(--text-primary)] hidden sm:block">
          {title}
        </h1>
      )}

      {/* Search */}
      <div className="flex-1 max-w-sm hidden md:flex items-center gap-2 h-8 px-3 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] text-sm text-[var(--text-tertiary)] cursor-text hover:border-[var(--border-strong)] transition-colors">
        <Search size={14} />
        <span>搜索...</span>
        <kbd className="ml-auto text-[10px] font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--text-tertiary)]">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        {/* Avatar */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity ml-1">
          K
        </button>
      </div>
    </header>
  );
}
