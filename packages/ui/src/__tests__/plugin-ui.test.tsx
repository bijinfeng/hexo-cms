import { useEffect, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ATTACHMENTS_HELPER_PLUGIN_ID, COMMENTS_OVERVIEW_PLUGIN_ID } from "@hexo-cms/core";
import { DataProviderProvider } from "../context/data-provider-context";
import {
  DashboardExtensionOutlet,
  PluginErrorBoundary,
  PluginProvider,
  WebPluginLogStore,
  WebPluginSecretStore,
  WebPluginStorageStore,
  usePluginSystem,
} from "../plugin";
import { usePluginDataProvider } from "../plugin/plugin-provider";
import { PluginSettingsPanel } from "../plugin/plugin-settings";
import { AttachmentsSummaryWidget } from "../plugin/renderers/attachments-summary-widget";
import type { DataProvider, PluginManager } from "@hexo-cms/core";

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

function EnabledPluginDashboardWidgets() {
  const { snapshot } = usePluginSystem();
  const configs = Object.fromEntries(snapshot.plugins.map(({ manifest, config }) => [manifest.id, config]));
  const dashboardWidgets = DashboardExtensionOutlet({ widgets: snapshot.extensions.dashboardWidgets, configs });
  return <>{dashboardWidgets.map((widget) => widget.content)}</>;
}

async function selectComboboxOption(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  const trigger = screen.getByRole("combobox", { name: label });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await user.click(await screen.findByRole("option", { name: option }));
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

  it("renders comments settings schema and persists config after remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<PluginSettingsPanel />);

    const commentsCard = screen.getByText("Comments Overview").closest(".rounded-xl");
    expect(commentsCard).not.toBeNull();

    await user.click(within(commentsCard as HTMLElement).getByRole("button", { name: "启用" }));
    await selectComboboxOption(user, "评论服务", "Waline");
    await user.type(screen.getByLabelText("评论后台 URL"), "https://comments.example.com");
    await user.click(screen.getByRole("switch", { name: "展示待审核提醒" }));

    unmount();
    renderWithProviders(<PluginSettingsPanel />);

    expect(screen.getByRole("combobox", { name: "评论服务" })).toHaveTextContent("Waline");
    expect(screen.getByLabelText("评论后台 URL")).toHaveValue("https://comments.example.com");
    expect(screen.getByRole("switch", { name: "展示待审核提醒" })).toHaveAttribute("aria-checked", "false");
  });

  it("applies comments settings to the dashboard widget", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <PluginSettingsPanel />
        <EnabledPluginDashboardWidgets />
      </>,
    );

    const commentsCard = screen.getByText("Comments Overview").closest(".rounded-xl");
    expect(commentsCard).not.toBeNull();

    await user.click(within(commentsCard as HTMLElement).getByRole("button", { name: "启用" }));
    expect(screen.getByText("待审核")).toBeInTheDocument();

    await user.type(screen.getByLabelText("评论后台 URL"), "https://comments.example.com");
    await user.click(screen.getByRole("switch", { name: "展示待审核提醒" }));

    expect(screen.queryByText("待审核")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开评论管理" })).toHaveAttribute(
      "data-plugin-href",
      "https://comments.example.com",
    );
  });

  it("isolates dashboard widget failures and records a sanitized last error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const widgets = [
      {
        pluginId: ATTACHMENTS_HELPER_PLUGIN_ID,
        pluginName: "Attachments Helper",
        id: "attachments.summary",
        title: "Attachments Helper",
        renderer: "builtin.attachments.summary",
        size: "medium" as const,
        order: 80,
      },
      {
        pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
        pluginName: "Comments Overview",
        id: "comments.overview",
        title: "Comments Overview",
        renderer: "builtin.comments.overview",
        size: "medium" as const,
        order: 90,
      },
    ];
    const dashboardWidgets = DashboardExtensionOutlet({
      widgets,
      renderers: {
        "builtin.attachments.summary": () => <div>Healthy plugin widget</div>,
        "builtin.comments.overview": () => {
          throw new Error("Renderer failed with token=secret-token at C:\\Users\\demo\\project\\.env");
        },
      },
    });

    try {
      renderWithProviders(
        <>
          {dashboardWidgets.map((widget) => widget.content)}
          <PluginSettingsPanel />
        </>,
      );

      expect(screen.getByText("Healthy plugin widget")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("插件渲染失败");

      await waitFor(() => {
        const commentsCard = screen.getByText(/hexo-cms-comments-overview/).closest(".rounded-xl");
        expect(commentsCard).not.toBeNull();
        expect(within(commentsCard as HTMLElement).getAllByText(/Renderer failed/).length).toBeGreaterThan(0);
      });

      const commentsCard = screen.getByText(/hexo-cms-comments-overview/).closest(".rounded-xl");
      expect(commentsCard).not.toHaveTextContent("secret-token");
      expect(commentsCard).not.toHaveTextContent("C:\\Users");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("isolates settings schema failures from the plugin settings page", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      renderWithProviders(
        <>
          <PluginSettingsPanel />
          <PluginErrorBoundary
            pluginId={ATTACHMENTS_HELPER_PLUGIN_ID}
            contributionId="attachments.settings"
            contributionType="settings.panel"
          >
            <ThrowingSettingsContribution />
          </PluginErrorBoundary>
        </>,
      );

      expect(screen.getByText("插件管理")).toBeInTheDocument();
      expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("插件渲染失败");

      await waitFor(() => {
        const attachmentsCard = screen.getByText(/hexo-cms-attachments-helper/).closest(".rounded-xl");
        expect(attachmentsCard).not.toBeNull();
        expect(within(attachmentsCard as HTMLElement).getAllByText(/Settings failed/).length).toBeGreaterThan(0);
        expect(attachmentsCard).not.toHaveTextContent("session-token");
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("shows sanitized recent plugin logs in plugin settings", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const widgets = [
      {
        pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
        pluginName: "Comments Overview",
        id: "comments.overview",
        title: "Comments Overview",
        renderer: "builtin.comments.overview",
        size: "medium" as const,
        order: 90,
      },
    ];
    const dashboardWidgets = DashboardExtensionOutlet({
      widgets,
      renderers: {
        "builtin.comments.overview": () => {
          throw new Error("Renderer failed with token=secret-token at /Users/demo/blog/.env");
        },
      },
    });

    try {
      renderWithProviders(
        <>
          {dashboardWidgets.map((widget) => widget.content)}
          <PluginSettingsPanel />
        </>,
      );

      await waitFor(() => {
        expect(screen.getByText("最近日志")).toBeInTheDocument();
        expect(screen.getAllByText(/Renderer failed with token=\[redacted\]/).length).toBeGreaterThan(0);
      });

      const commentsCard = screen.getByText(/hexo-cms-comments-overview/).closest(".rounded-xl");
      expect(commentsCard).not.toBeNull();
      expect(commentsCard).not.toHaveTextContent("secret-token");
      expect(commentsCard).not.toHaveTextContent("/Users/demo");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("emits host events from the plugin wrapped data provider", async () => {
    const provider = createDataProvider({
      uploadMedia: vi.fn().mockResolvedValue({ url: "/images/hero.png" }),
      getDeployments: vi
        .fn()
        .mockResolvedValueOnce([
          { id: "deploy-1", status: "running", createdAt: "2026-05-12T00:00:00.000Z", duration: 0, conclusion: "" },
        ])
        .mockResolvedValueOnce([
          {
            id: "deploy-1",
            status: "success",
            createdAt: "2026-05-12T00:00:00.000Z",
            duration: 42,
            conclusion: "success",
          },
        ]),
    });
    let ready: ((value: { dataProvider: DataProvider; manager: PluginManager }) => void) | undefined;
    const readyPromise = new Promise<{ dataProvider: DataProvider; manager: PluginManager }>((resolve) => {
      ready = resolve;
    });

    renderWithProviders(<PluginEventHarness onReady={(value) => ready?.(value)} />, provider);

    const { dataProvider, manager } = await readyPromise;
    const emitSpy = vi.spyOn(manager, "emitEvent").mockResolvedValue([]);

    await act(async () => {
      await dataProvider.savePost({
        path: "source/_posts/hello.md",
        title: "Hello",
        date: "2026-05-12",
        content: "Hello",
        frontmatter: { title: "Hello" },
      });
      await dataProvider.deletePost("source/_posts/hello.md");
      await dataProvider.savePage({
        path: "source/about/index.md",
        title: "About",
        date: "2026-05-12",
        content: "About",
        frontmatter: { title: "About" },
      });
      await dataProvider.deletePage("source/about/index.md");
      await dataProvider.uploadMedia(new File(["hero"], "hero.png", { type: "image/png" }), "source/images/hero.png");
      await dataProvider.deleteMedia("source/images/hero.png");
      await dataProvider.triggerDeploy("deploy.yml");
      await dataProvider.getDeployments();
      await dataProvider.getDeployments();
    });

    expect(emitSpy.mock.calls.map(([eventName]) => eventName)).toEqual([
      "post.afterSave",
      "post.afterDelete",
      "page.afterSave",
      "page.afterDelete",
      "media.afterUpload",
      "media.afterDelete",
      "deploy.afterTrigger",
      "deploy.statusChange",
    ]);

    expect(emitSpy.mock.calls.find(([eventName]) => eventName === "post.afterSave")?.[1]).toEqual(
      expect.objectContaining({ path: "source/_posts/hello.md", title: "Hello" }),
    );
    expect(emitSpy.mock.calls.find(([eventName]) => eventName === "media.afterUpload")?.[1]).toEqual(
      expect.objectContaining({ path: "source/images/hero.png", url: "/images/hero.png" }),
    );
    expect(emitSpy.mock.calls.find(([eventName]) => eventName === "deploy.statusChange")?.[1]).toEqual(
      expect.objectContaining({ id: "deploy-1", status: "success", previousStatus: "running" }),
    );
  });

  it("persists plugin storage through the web platform storage endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ storage: { "hexo-cms-attachments-helper": { copyCount: 2 } } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new WebPluginStorageStore();

    await expect(store.load()).resolves.toEqual({
      "hexo-cms-attachments-helper": { copyCount: 2 },
    });
    await store.save({
      "hexo-cms-attachments-helper": { copyCount: 3 },
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/plugin/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage: { "hexo-cms-attachments-helper": { copyCount: 3 } } }),
    });
  });

  it("persists plugin logs through the web platform log endpoint", async () => {
    const logs = {
      "hexo-cms-attachments-helper": [
        {
          id: "log-1",
          pluginId: "hexo-cms-attachments-helper",
          level: "info" as const,
          message: "Copied attachment",
          at: "2026-05-13T00:00:00.000Z",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ logs }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new WebPluginLogStore();

    expect(store.load()).toEqual({});
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/plugin/logs");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.load()).toEqual(logs);

    store.save(logs);

    expect(fetchMock).toHaveBeenLastCalledWith("/api/plugin/logs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logs }),
    });
  });

  it("checks and mutates plugin secrets through scoped web secret operations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ configured: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new WebPluginSecretStore();

    await expect(store.load()).resolves.toEqual({});
    await expect(store.has("hexo-cms-analytics", "apiKey")).resolves.toBe(true);
    await store.save({
      "hexo-cms-analytics": { apiKey: "updated-ref" },
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/plugin/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "set",
        pluginId: "hexo-cms-analytics",
        key: "apiKey",
        value: "updated-ref",
      }),
    });

    await store.delete("hexo-cms-analytics", "apiKey");

    expect(fetchMock).toHaveBeenLastCalledWith("/api/plugin/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "delete",
        pluginId: "hexo-cms-analytics",
        key: "apiKey",
      }),
    });
  });
});

function ThrowingSettingsContribution(): never {
  throw new Error("Settings failed with cookie=session-token");
}

function PluginEventHarness({
  onReady,
}: {
  onReady: (value: { dataProvider: DataProvider; manager: PluginManager }) => void;
}) {
  const dataProvider = usePluginDataProvider();
  const { manager } = usePluginSystem();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    onReady({ dataProvider, manager });
  }, [dataProvider, manager, onReady]);

  return null;
}
