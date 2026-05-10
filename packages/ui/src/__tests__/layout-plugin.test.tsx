import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataProviderProvider } from "../context/data-provider-context";
import { CMSLayout } from "../components/layout/CMSLayout";
import { PluginProvider } from "../plugin";
import { PluginSettingsPanel } from "../plugin/plugin-settings";
import type { DataProvider } from "@hexo-cms/core";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/media" } }),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function createDataProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return {
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(null),
    saveToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    getPosts: vi.fn().mockResolvedValue([]),
    getPost: vi.fn().mockResolvedValue(null),
    savePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue(null),
    savePage: vi.fn().mockResolvedValue(undefined),
    deletePage: vi.fn().mockResolvedValue(undefined),
    getTags: vi.fn().mockResolvedValue({ tags: [], categories: [], total: 0 }),
    renameTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    deleteTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: "" }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: "", installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CMSLayout plugin policy", () => {
  it("hides media topbar search when Attachments Helper is disabled", async () => {
    const user = userEvent.setup();

    render(
      <DataProviderProvider provider={createDataProvider()}>
        <PluginProvider>
          <PluginSettingsPanel />
          <CMSLayout>
            <div>媒体内容</div>
          </CMSLayout>
        </PluginProvider>
      </DataProviderProvider>,
    );

    expect(screen.getByText("搜索...")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "停用" }));

    expect(screen.queryByText("搜索...")).not.toBeInTheDocument();
  });
});
