# Topbar Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Topbar 的 ⌘K 命令面板和用户头像下拉菜单，保留通知铃铛代码并注释为评论插件预留。

**Architecture:** Topbar 通过 `authClient` prop 获取用户信息（遵循 SettingsPage 的既有模式）；命令面板为独立 Modal 组件，通过 `useDataProvider` 获取最近文章；CMSLayout 透传 `authClient` 给 Topbar。

**Tech Stack:** React, TanStack Router, lucide-react, Tailwind CSS v4, useDataProvider hook

**Design Spec:** `docs/superpowers/specs/2026-05-15-topbar-features-design.md`

---

## Task 0: 准备工作 — 阅读相关源文件

- [ ] 确保理解以下文件的当前实现：
  - `packages/ui/src/components/layout/Topbar.tsx:1-89`
  - `packages/ui/src/components/layout/CMSLayout.tsx:1-83`
  - `packages/web/src/routes/__root.tsx:1-142`
  - `packages/desktop/src/renderer/src/routes/__root.tsx:1-103`
  - `packages/ui/src/types/auth.ts:1-35`
  - `packages/ui/src/__tests__/topbar.test.tsx:1-17`

---

### Task 1: 创建 UserMenu 组件

**Files:**
- Create: `packages/ui/src/components/user-menu.tsx`

- [ ] **Step 1: 创建 UserMenu 组件**

```tsx
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
            {/* User info */}
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

            {/* Settings */}
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <Settings size={15} className="text-[var(--text-secondary)]" />
              系统设置
            </button>

            {/* Sign out */}
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
```

- [ ] **Step 2: 编写 UserMenu 测试**

```tsx
// File: packages/ui/src/__tests__/user-menu.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "@tanstack/react-router";
import { UserMenu } from "../components/user-menu";
import type { AuthClient, AuthSession } from "../types/auth";

function createMockAuthClient(overrides?: Partial<AuthSession>): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({
      state: "authenticated",
      user: {
        id: "1",
        name: "Kebai",
        email: "kebai@example.com",
        login: "kebai",
        avatarUrl: null,
        ...overrides?.user,
      },
      ...overrides,
    }),
    startLogin: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    reauthorize: vi.fn(),
  };
}

function renderUserMenu(authClient?: AuthClient, onSignedOut = vi.fn()) {
  return render(
    <MemoryRouter>
      <UserMenu authClient={authClient ?? createMockAuthClient()} onSignedOut={onSignedOut} />
    </MemoryRouter>
  );
}

describe("UserMenu", () => {
  it("renders avatar with initial when no avatarUrl", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByText("K")).toBeInTheDocument();
    });
  });

  it("renders avatar image when avatarUrl is available", async () => {
    const client = createMockAuthClient({
      user: { avatarUrl: "https://example.com/avatar.png" },
    });
    renderUserMenu(client);
    await waitFor(() => {
      const img = screen.getByAltText("Kebai");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
    });
  });

  it("shows dropdown on click and displays user info", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByText("K")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("Kebai")).toBeInTheDocument();
    expect(screen.getByText("kebai@example.com")).toBeInTheDocument();
    expect(screen.getByText("系统设置")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("calls signOut and onSignedOut on click", async () => {
    const client = createMockAuthClient();
    const onSignedOut = vi.fn();
    renderUserMenu(client, onSignedOut);
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    fireEvent.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(client.signOut).toHaveBeenCalled();
      expect(onSignedOut).toHaveBeenCalled();
    });
  });

  it("closes dropdown on outside click", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("系统设置")).toBeInTheDocument();
    fireEvent.click(screen.getByText("系统设置").closest(".fixed.inset-0")!);
    await waitFor(() => {
      expect(screen.queryByText("系统设置")).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: 运行测试，确认失败（组件尚未导出）**

```bash
pnpm --filter @hexo-cms/ui test -- user-menu
```

Expected: FAIL — 无法找到 UserMenu 模块

- [ ] **Step 4: 从 ui/index.ts 导出 UserMenu**

Edit `packages/ui/src/index.ts` — 在 Layout 区添加：

```ts
export { UserMenu } from "./components/user-menu";
```

- [ ] **Step 5: 再次运行测试，确认通过**

```bash
pnpm --filter @hexo-cms/ui test -- user-menu
```

Expected: 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/user-menu.tsx packages/ui/src/__tests__/user-menu.test.tsx packages/ui/src/index.ts
git commit -m "feat: add UserMenu component with avatar dropdown"
```

---

### Task 2: 创建 CommandPalette 命令面板组件

**Files:**
- Create: `packages/ui/src/components/command-palette.tsx`

- [ ] **Step 1: 创建 CommandPalette 组件**

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, FilePlus, Rocket, ArrowRight } from "lucide-react";
import { useDataProvider } from "../context/data-provider-context";
import type { HexoPost } from "@hexo-cms/core";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: "数据大盘", to: "/" },
  { label: "文章管理", to: "/posts" },
  { label: "页面管理", to: "/pages" },
  { label: "媒体库", to: "/media" },
  { label: "标签 & 分类", to: "/tags" },
  { label: "主题管理", to: "/themes" },
  { label: "部署管理", to: "/deploy" },
  { label: "站点设置", to: "/settings" },
];

const ACTIONS = [
  { id: "new-post", label: "新建文章", to: "/posts/new", icon: FilePlus },
  { id: "new-page", label: "新建页面", to: "/pages/new", icon: FilePlus },
  { id: "deploy", label: "触发部署", to: "/deploy", icon: Rocket },
];

type ResultItem =
  | { type: "nav"; label: string; to: string }
  | { type: "action"; id: string; label: string; to: string; icon: React.ComponentType<{ size?: number; className?: string }> }
  | { type: "post"; path: string; title: string };

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recentPosts, setRecentPosts] = useState<HexoPost[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      dataProvider.getPosts().then((posts) => {
        const sorted = [...posts]
          .filter((p) => p.date)
          .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
          .slice(0, 5);
        setRecentPosts(sorted);
      }).catch(() => setRecentPosts([]));
    }
  }, [isOpen, dataProvider]);

  const filteredNav = query
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.to.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  const filteredActions = query
    ? ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : ACTIONS;

  const filteredPosts = query
    ? recentPosts.filter((p) =>
        (p.title || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const results: ResultItem[] = [
    ...filteredActions.map((a) => ({ type: "action" as const, ...a })),
    ...filteredNav.map((n) => ({ type: "nav" as const, ...n })),
    ...filteredPosts.map((p) => ({
      type: "post" as const,
      path: p.path,
      title: p.title || "无标题",
    })),
  ];

  const handleSelect = useCallback(
    (index: number) => {
      const item = results[index];
      if (!item) return;
      if (item.type === "post") {
        navigate({ to: "/posts/$slug", params: { slug: item.path.replace(/^source\/_posts\//, "").replace(/\.md$/, "") } });
      } else {
        navigate({ to: item.to });
      }
      onClose();
    },
    [results, navigate, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results.length, selectedIndex, handleSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-[var(--border-default)]">
          <Search size={16} className="text-[var(--text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令或文章..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          <kbd className="text-[10px] font-mono bg-[var(--bg-muted)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[var(--text-tertiary)] shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-sm text-[var(--text-tertiary)] text-center py-8">
              无匹配结果
            </div>
          ) : (
            results.map((item, i) => (
              <button
                key={item.type === "post" ? item.path : (item.type === "action" ? item.id : item.to)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                  i === selectedIndex
                    ? "bg-[var(--bg-muted)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                }`}
                onClick={() => handleSelect(i)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {item.type === "action" ? (
                  <item.icon size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                ) : item.type === "nav" ? (
                  <ArrowRight size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                ) : (
                  <Search size={15} className="shrink-0 text-[var(--text-tertiary)]" />
                )}
                <span className="truncate">{item.label || item.title}</span>
                {item.type === "nav" && (
                  <span className="ml-auto text-[10px] text-[var(--text-tertiary)] font-mono shrink-0">
                    {item.to}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 从 ui/index.ts 导出 CommandPalette**

Edit `packages/ui/src/index.ts` — 在 Generic Components 区添加：

```ts
export { CommandPalette } from "./components/command-palette";
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/command-palette.tsx packages/ui/src/index.ts
git commit -m "feat: add CommandPalette component with ⌘K navigation"
```

---

### Task 3: 更新 Topbar — 集成 UserMenu、CommandPalette、通知注释

**Files:**
- Modify: `packages/ui/src/components/layout/Topbar.tsx:1-89`

- [ ] **Step 1: 重写 Topbar.tsx**

```tsx
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

  // ⌘K keyboard shortcut
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
```

- [ ] **Step 2: 更新 Topbar 测试**

Rewrite `packages/ui/src/__tests__/topbar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "@tanstack/react-router";
import { Topbar } from "../components/layout/Topbar";
import { DataProviderProvider } from "../context/data-provider-context";
import type { DataProvider } from "@hexo-cms/core";

const mockDataProvider: DataProvider = {
  getConfig: () => Promise.resolve(null),
  saveConfig: () => Promise.resolve(),
  getToken: () => Promise.resolve(null),
  saveToken: () => Promise.resolve(),
  deleteToken: () => Promise.resolve(),
  getPosts: () => Promise.resolve([]),
  getPost: () => Promise.reject(new Error("not implemented")),
  savePost: () => Promise.resolve(),
  deletePost: () => Promise.resolve(),
  getPages: () => Promise.resolve([]),
  getPage: () => Promise.reject(new Error("not implemented")),
  savePage: () => Promise.resolve(),
  deletePage: () => Promise.resolve(),
  getTags: () => Promise.resolve({ tags: [], categories: [], total: 0 }),
  renameTag: () => Promise.resolve({ updatedCount: 0 }),
  deleteTag: () => Promise.resolve({ updatedCount: 0 }),
  getMediaFiles: () => Promise.resolve([]),
  uploadMedia: () => Promise.resolve({ url: "" }),
  deleteMedia: () => Promise.resolve(),
  getStats: () => Promise.resolve({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
  getThemes: () => Promise.resolve({ currentTheme: "", installedThemes: [] }),
  switchTheme: () => Promise.resolve(),
  getDeployments: () => Promise.resolve([]),
  triggerDeploy: () => Promise.resolve(),
};

function renderTopbar(props: Partial<Parameters<typeof Topbar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <DataProviderProvider provider={mockDataProvider}>
        <Topbar title="测试" {...props} />
      </DataProviderProvider>
    </MemoryRouter>
  );
}

describe("Topbar", () => {
  it("renders search trigger by default", () => {
    renderTopbar();
    expect(screen.getByText("搜索...")).toBeInTheDocument();
  });

  it("hides search trigger when showSearch is false", () => {
    renderTopbar({ showSearch: false });
    expect(screen.queryByText("搜索...")).not.toBeInTheDocument();
  });

  it("renders fallback avatar when no authClient provided", () => {
    renderTopbar();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("renders UserMenu when authClient is provided", async () => {
    const mockAuthClient = {
      getSession: () => Promise.resolve({ state: "authenticated" as const, user: { name: "Test" } }),
      startLogin: () => Promise.resolve({ state: "authenticating" as const }),
      signOut: () => Promise.resolve(),
      reauthorize: () => Promise.resolve({ state: "authenticating" as const }),
    };
    renderTopbar({ authClient: mockAuthClient, onSignedOut: () => {} });
    const userMenu = screen.getByLabelText("用户菜单");
    expect(userMenu).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行测试，确认通过**

```bash
pnpm --filter @hexo-cms/ui test -- topbar
```

Expected: 5 tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/layout/Topbar.tsx packages/ui/src/__tests__/topbar.test.tsx
git commit -m "feat: wire UserMenu and CommandPalette into Topbar, annotate notification bell"
```

---

### Task 4: 更新 CMSLayout 透传 authClient

**Files:**
- Modify: `packages/ui/src/components/layout/CMSLayout.tsx:1-83`

- [ ] **Step 1: 给 CMSLayout 添加 authClient prop**

Edit `CMSLayout.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ATTACHMENTS_HELPER_PLUGIN_ID } from "@hexo-cms/core";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../../utils";
import { usePluginSystem } from "../../plugin";
import type { AuthClient } from "../../types/auth";

// ... routeTitles 不变 ...

export function CMSLayout({
  children,
  isElectron,
  authClient,
  onSignedOut,
}: {
  children: ReactNode;
  isElectron?: boolean;
  authClient?: AuthClient;
  onSignedOut?: () => void;
}) {
  // ... 现有逻辑不变 ...

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-base)]">
      {/* ... traffic light spacer 不变 ... */}
      <div className="flex flex-1 overflow-hidden">
        {/* ... mobile overlay / sidebar 不变 ... */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            title={title}
            isElectron={isElectron}
            onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
            showSearch={showTopbarSearch}
            authClient={authClient}
            onSignedOut={onSignedOut}
          />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
```

具体改动：在第 2-6 行之间加入 `import type { AuthClient } from "../../types/auth";`，在接口中添加 `authClient` 和 `onSignedOut` 参数，在 `<Topbar>` 调用中透传这两个 prop。

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/components/layout/CMSLayout.tsx
git commit -m "feat: forward authClient and onSignedOut through CMSLayout to Topbar"
```

---

### Task 5: 在 Web 和 Desktop 根路由中传入 authClient

**Files:**
- Modify: `packages/web/src/routes/__root.tsx:125-141`
- Modify: `packages/desktop/src/renderer/src/routes/__root.tsx:85-98`

- [ ] **Step 1: Web 根路由 — 添加 authClient 和 onSignedOut**

Edit `packages/web/src/routes/__root.tsx`:

在 `<CMSLayout>` 调用处（约 line 132）改为：

```tsx
<CMSLayout
  authClient={webAuthClient}
  onSignedOut={() => navigate({ to: "/login", replace: true })}
>
```

同时确保 `webAuthClient` 已在文件顶部导入（当前已有 `import { webAuthClient } from "../lib/auth-client";` 在 line 13）。

- [ ] **Step 2: Desktop 根路由 — 添加 authClient 和 onSignedOut**

Edit `packages/desktop/src/renderer/src/routes/__root.tsx`:

在 `<CMSLayout isElectron>` 调用处（约 line 90）改为：

```tsx
<CMSLayout
  isElectron
  authClient={desktopAuthClient}
  onSignedOut={() => navigate({ to: "/login", replace: true })}
>
```

同时确保 `desktopAuthClient` 和 `navigate` 已可用：
- `import { desktopAuthClient } from "../lib/desktop-auth-client";` 在 line 13（确认存在）
- `const navigate = useNavigate();` 在 line 25（确认存在）

- [ ] **Step 3: 运行全部测试**

```bash
pnpm --filter @hexo-cms/ui test
```

Expected: 所有已有测试 PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/routes/__root.tsx packages/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat: pass authClient from root routes to CMSLayout for Topbar user menu"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 运行 UI 包全量测试**

```bash
pnpm --filter @hexo-cms/ui test
```

- [ ] **Step 2: 运行 Web 端 TypeScript 检查**

```bash
pnpm --filter @hexo-cms/web exec tsc --noEmit
```

- [ ] **Step 3: 启动 dev server 验证功能**

```bash
pnpm dev
```

打开浏览器验证：
1. 点击搜索框或按 `⌘K` → 命令面板弹出，显示导航/操作列表
2. 输入关键词 → 模糊匹配过滤结果
3. ↑↓ 导航、Enter 跳转、Esc 关闭
4. 点击头像 → 下拉菜单显示用户名/邮箱/设置/退出登录
5. 通知铃铛显示为灰色禁用状态（opacity-50, pointer-events-none）
6. 退出登录后跳转到 `/login`

- [ ] **Step 4: Commit any fixes (if needed)**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```
