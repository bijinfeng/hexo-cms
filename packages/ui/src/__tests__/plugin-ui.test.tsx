import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "@hexo-cms/core";
import { DataProviderProvider } from "../context/data-provider-context";
import { DashboardExtensionOutlet, PluginProvider } from "../plugin";
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
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the built-in attachments plugin in settings and can disable it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginSettingsPanel />);

    expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(screen.queryByText("network.fetch")).not.toBeInTheDocument();

    const attachmentsCard = screen.getByText("Attachments Helper").closest(".rounded-xl");
    expect(attachmentsCard).not.toBeNull();

    await user.click(within(attachmentsCard as HTMLElement).getByRole("button", { name: "停用" }));

    expect(within(attachmentsCard as HTMLElement).getByText("未启用")).toBeInTheDocument();
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

  it("renders the comments overview dashboard widget", () => {
    const widgets = [
      {
        pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
        pluginName: "Comments Overview",
        id: "comments.overview",
        title: "评论概览",
        renderer: "builtin.comments.overview",
        size: "medium" as const,
        order: 90,
      },
    ];
    const dashboardWidgets = DashboardExtensionOutlet({ widgets });

    renderWithProviders(<>{dashboardWidgets.map((widget) => widget.content)}</>);

    expect(screen.getByText("待审核")).toBeInTheDocument();
    expect(screen.getByText("打开评论管理")).toBeInTheDocument();
  });

  it("can disable only Comments Overview while keeping Attachments Helper enabled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginSettingsPanel />);

    expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
    expect(screen.getByText("Comments Overview")).toBeInTheDocument();

    const commentsCard = screen.getByText("Comments Overview").closest(".rounded-xl");
    expect(commentsCard).not.toBeNull();

    await user.click(within(commentsCard as HTMLElement).getByRole("button", { name: "启用" }));
    await user.click(within(commentsCard as HTMLElement).getByRole("button", { name: "停用" }));

    expect(within(commentsCard as HTMLElement).getByText("未启用")).toBeInTheDocument();
    expect(screen.getByText("Attachments Helper").closest(".rounded-xl")).toHaveTextContent("已启用");
  });
});
