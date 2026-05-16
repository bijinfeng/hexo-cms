import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "../components/layout/Topbar";
import { DataProviderProvider } from "../context/data-provider-context";
import type { DataProvider } from "@hexo-cms/core";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ location: { pathname: "/" } }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

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
  readConfigFile: () => Promise.resolve(""),
  writeConfigFile: () => Promise.resolve(),
};

function renderTopbar(props: Partial<Parameters<typeof Topbar>[0]> = {}) {
  return render(
    <DataProviderProvider provider={mockDataProvider}>
      <Topbar title="测试" {...props} />
    </DataProviderProvider>
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

  it("renders UserMenu when authClient is provided", () => {
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
