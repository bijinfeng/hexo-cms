import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataProviderProvider } from "../context/data-provider-context";
import { PluginProvider } from "../plugin";
import { PluginSettingsPanel } from "../plugin/plugin-settings";
import { MediaPage } from "../pages/media";
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
    mergeTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: "" }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: "", installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    readConfigFile: vi.fn().mockResolvedValue(""),
    writeConfigFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function PluginHarness() {
  return (
    <>
      <PluginSettingsPanel />
      <MediaPage />
    </>
  );
}

describe("MediaPage plugin boundaries", () => {
  it("hides document attachment filtering when Attachments Helper is disabled", async () => {
    const user = userEvent.setup();

    render(
      <DataProviderProvider provider={createDataProvider()}>
        <PluginProvider>
          <PluginHarness />
        </PluginProvider>
      </DataProviderProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "文档" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "停用" }));

    expect(screen.queryByRole("tab", { name: "文档" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("搜索文件名...")).not.toBeInTheDocument();
  });
});
