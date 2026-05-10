import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataProviderProvider } from "../context/data-provider-context";
import { PluginProvider } from "../plugin";
import { PluginSettingsPanel } from "../plugin/plugin-settings";
import { AttachmentsSummaryWidget } from "../plugin/renderers/attachments-summary-widget";
import type { DataProvider } from "@hexo-cms/core";

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

function renderWithProviders(ui: React.ReactNode, provider = createDataProvider()) {
  return render(
    <DataProviderProvider provider={provider}>
      <PluginProvider>{ui}</PluginProvider>
    </DataProviderProvider>,
  );
}

describe("plugin UI", () => {
  it("shows the built-in attachments plugin in settings and can disable it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginSettingsPanel />);

    expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(screen.queryByText("network.fetch")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /停用/ }));

    expect(screen.getByText("未启用")).toBeInTheDocument();
  });

  it("renders attachment summaries from media files", async () => {
    renderWithProviders(
      <AttachmentsSummaryWidget />,
      createDataProvider({
        getMediaFiles: vi.fn().mockResolvedValue([
          { name: "guide.pdf", path: "source/images/guide.pdf", url: "", size: 2048, sha: "1" },
          { name: "hero.png", path: "source/images/hero.png", url: "", size: 1024, sha: "2" },
        ]),
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("guide.pdf")).toBeInTheDocument();
    });
    expect(screen.getByText("附件数")).toBeInTheDocument();
    expect(screen.queryByText("hero.png")).not.toBeInTheDocument();
  });
});
