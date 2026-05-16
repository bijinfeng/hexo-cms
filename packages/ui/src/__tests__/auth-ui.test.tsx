import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "../pages/login";
import { OnboardingPage } from "../pages/onboarding";
import { SettingsPage } from "../pages/settings";
import { DataProviderProvider } from "../context/data-provider-context";
import type { AuthClient } from "../types/auth";
import type {
  OnboardingClient,
  RepositoryConfigInput,
  RepositoryOption,
  RepositoryValidation,
} from "../types/onboarding";
import type { DataProvider } from "@hexo-cms/core";

const SEARCH_DEBOUNCE_MS = 250;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../lib/electron-api", () => ({
  getElectronAPI: () => ({
    getSession: vi.fn().mockResolvedValue({ state: "authenticated" }),
  }),
}));

function createAuthClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({ state: "anonymous" }),
    startLogin: vi.fn().mockResolvedValue({ state: "authenticating" }),
    signOut: vi.fn().mockResolvedValue(undefined),
    reauthorize: vi.fn().mockResolvedValue({ state: "authenticating" }),
    ...overrides,
  };
}

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

function createOnboardingClient(overrides: Partial<OnboardingClient> = {}): OnboardingClient {
  const repository: RepositoryOption = {
    id: "repo-1",
    owner: "kebai",
    name: "blog",
    fullName: "kebai/blog",
    private: false,
    defaultBranch: "main",
    pushedAt: "2026-05-11T08:00:00.000Z",
    permissions: { push: true },
  };
  const defaultConfig: RepositoryConfigInput = {
    owner: "kebai",
    repo: "blog",
    branch: "main",
    postsDir: "source/_posts",
    mediaDir: "source/images",
    workflowFile: ".github/workflows/deploy.yml",
    autoDeploy: true,
    deployNotifications: true,
  };
  const validation: RepositoryValidation = {
    ok: true,
    repository,
    defaultConfig,
    checks: [
      { id: "access", status: "success", message: "仓库可访问" },
      { id: "permission", status: "success", message: "具备写权限" },
      { id: "branch", status: "success", message: "默认分支存在" },
      { id: "hexo", status: "success", message: "检测到 Hexo 结构" },
    ],
  };

  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      login: "kebai",
      name: "Kebai",
      avatarUrl: "https://example.com/avatar.png",
    }),
    reauthorize: vi.fn().mockResolvedValue(undefined),
    listRepositories: vi.fn().mockResolvedValue([repository]),
    validateRepository: vi.fn().mockResolvedValue(validation),
    saveRepositoryConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function createControllablePromise<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("OAuth UI", () => {
  it("starts login through AuthClient without showing an internal configuration error", async () => {
    const user = userEvent.setup();
    const authClient = createAuthClient();

    render(<LoginPage authClient={authClient} />);

    await user.click(screen.getByRole("button", { name: /使用 GitHub 登录/ }));

    await waitFor(() => {
      expect(authClient.startLogin).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText("认证服务未配置")).not.toBeInTheDocument();
  });

  it("renders desktop device flow instructions when the auth client returns a device flow", async () => {
    const user = userEvent.setup();
    const authClient = createAuthClient({
      startLogin: vi.fn().mockResolvedValue({
        state: "authenticating",
        deviceFlow: {
          userCode: "ABCD-1234",
          verificationUri: "https://github.com/login/device",
          expiresAt: "2026-05-09T08:15:00.000Z",
          interval: 5,
        },
      }),
    });

    render(<LoginPage authClient={authClient} />);

    await user.click(screen.getByRole("button", { name: /使用 GitHub 登录/ }));

    expect(await screen.findByText("ABCD-1234")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /打开 GitHub 授权页面/ })).toHaveAttribute(
      "href",
      "https://github.com/login/device",
    );
  });

  it("completes desktop device flow after the auth session becomes authenticated", async () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      const authClient = createAuthClient({
        getSession: vi.fn().mockResolvedValue({
          state: "authenticated",
          user: { login: "kebai" },
        }),
        startLogin: vi.fn().mockResolvedValue({
          state: "authenticating",
          deviceFlow: {
            userCode: "ABCD-1234",
            verificationUri: "https://github.com/login/device",
            expiresAt: "2026-05-09T08:15:00.000Z",
            interval: 1,
          },
        }),
      });

      render(<LoginPage authClient={authClient} onComplete={onComplete} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /使用 GitHub 登录/ }));
      });
      expect(screen.getByText("ABCD-1234")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a recoverable error when desktop device flow expires", async () => {
    vi.useFakeTimers();
    try {
      const authClient = createAuthClient({
        getSession: vi.fn().mockResolvedValue({
          state: "error",
          error: "AUTH_TIMEOUT",
        }),
        startLogin: vi.fn().mockResolvedValue({
          state: "authenticating",
          deviceFlow: {
            userCode: "ABCD-1234",
            verificationUri: "https://github.com/login/device",
            expiresAt: "2026-05-09T08:15:00.000Z",
            interval: 1,
          },
        }),
      });

      render(<LoginPage authClient={authClient} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /使用 GitHub 登录/ }));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText("授权已过期，请重新登录")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows repository import as the onboarding primary path", async () => {
    const onboardingClient = createOnboardingClient();

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("导入 Hexo 仓库")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索仓库")).toBeInTheDocument();
    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    expect(screen.queryByLabelText("GitHub Token")).not.toBeInTheDocument();
    expect(screen.queryByText(/Personal Access Token/i)).not.toBeInTheDocument();
  });

  it("reloads repositories from the onboarding client when search changes", async () => {
    const user = userEvent.setup();
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesRepository = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const listRepositories = vi.fn().mockImplementation(async ({ query }: { query?: string }) => {
      if (query === "") return [blogRepository];
      if (query === "notes") return [notesRepository];
      return [];
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await screen.findByText("kebai/blog");
    await user.type(screen.getByPlaceholderText("搜索仓库"), "notes");

    await waitFor(() => {
      expect(listRepositories).toHaveBeenLastCalledWith({ query: "notes" });
    });
    expect(await screen.findByText("kebai/notes")).toBeInTheDocument();
  });

  it("debounces repository search requests while the user is typing", async () => {
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesRepository = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const listRepositories = vi.fn().mockImplementation(async ({ query }: { query?: string }) => {
      if (query === "") return [blogRepository];
      if (query === "notes") return [notesRepository];
      return [];
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    listRepositories.mockClear();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText("搜索仓库"), { target: { value: "notes" } });

      expect(listRepositories).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(249);
      });
      expect(listRepositories).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
        await Promise.resolve();
      });

      expect(listRepositories).toHaveBeenCalledTimes(1);
      expect(listRepositories).toHaveBeenLastCalledWith({ query: "notes" });
      expect(screen.getByText("kebai/notes")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs repository search immediately when pressing Enter", async () => {
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesRepository = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const listRepositories = vi.fn().mockImplementation(async ({ query }: { query?: string }) => {
      if (query === "") return [blogRepository];
      if (query === "notes") return [notesRepository];
      return [];
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    listRepositories.mockClear();

    vi.useFakeTimers();
    try {
      const searchInput = screen.getByPlaceholderText("搜索仓库");
      fireEvent.change(searchInput, { target: { value: "notes" } });

      expect(listRepositories).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(listRepositories).toHaveBeenCalledTimes(1);
      expect(listRepositories).toHaveBeenLastCalledWith({ query: "notes" });
      expect(screen.getByText("kebai/notes")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the current repository list visible while a search request is pending", async () => {
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesSearch = createControllablePromise<Array<typeof blogRepository>>();
    const listRepositories = vi.fn().mockImplementation(({ query }: { query?: string }) => {
      if (query === "") return Promise.resolve([blogRepository]);
      if (query === "notes") return notesSearch.promise;
      return Promise.resolve([]);
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    listRepositories.mockClear();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText("搜索仓库"), { target: { value: "notes" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
        await Promise.resolve();
      });

      expect(listRepositories).toHaveBeenCalledWith({ query: "notes" });
      expect(screen.getByText("kebai/blog")).toBeInTheDocument();
      expect(screen.queryByText("正在读取仓库")).not.toBeInTheDocument();
      expect(screen.getByLabelText("正在搜索仓库")).toBeInTheDocument();

      await act(async () => {
        notesSearch.resolve([]);
        await Promise.resolve();
      });

      expect(screen.queryByLabelText("正在搜索仓库")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a recoverable search error while keeping the previous repository list visible", async () => {
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesSearch = createControllablePromise<Array<typeof blogRepository>>();
    const listRepositories = vi.fn().mockImplementation(({ query }: { query?: string }) => {
      if (query === "") return Promise.resolve([blogRepository]);
      if (query === "notes") return notesSearch.promise;
      return Promise.resolve([]);
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    listRepositories.mockClear();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText("搜索仓库"), { target: { value: "notes" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
        await Promise.resolve();
      });

      await act(async () => {
        notesSearch.reject(new Error("search failed"));
        await Promise.resolve();
      });

      expect(screen.getByText("kebai/blog")).toBeInTheDocument();
      expect(screen.getByText("仓库加载失败，请重试")).toBeInTheDocument();
      expect(screen.queryByText("正在读取仓库")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries a failed search while keeping the previous repository list visible", async () => {
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesRepository = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const firstNotesSearch = createControllablePromise<Array<typeof blogRepository>>();
    const secondNotesSearch = createControllablePromise<Array<typeof blogRepository>>();
    let notesAttempts = 0;
    const listRepositories = vi.fn().mockImplementation(({ query }: { query?: string }) => {
      if (query === "") return Promise.resolve([blogRepository]);
      if (query === "notes") {
        notesAttempts += 1;
        return notesAttempts === 1 ? firstNotesSearch.promise : secondNotesSearch.promise;
      }
      return Promise.resolve([]);
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    expect(await screen.findByText("kebai/blog")).toBeInTheDocument();
    listRepositories.mockClear();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByPlaceholderText("搜索仓库"), { target: { value: "notes" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
        await Promise.resolve();
      });

      await act(async () => {
        firstNotesSearch.reject(new Error("search failed"));
        await Promise.resolve();
      });

      expect(screen.getByText("仓库加载失败，请重试")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "重试搜索" }));
        await Promise.resolve();
      });

      expect(listRepositories).toHaveBeenLastCalledWith({ query: "notes" });

      await act(async () => {
        secondNotesSearch.resolve([notesRepository]);
        await Promise.resolve();
      });

      expect(screen.queryByText("仓库加载失败，请重试")).not.toBeInTheDocument();
      expect(screen.getByText("kebai/notes")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears a selected repository when search results no longer include it", async () => {
    const user = userEvent.setup();
    const blogRepository = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const notesRepository = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: false,
      defaultBranch: "main",
      permissions: { push: true },
    };
    const listRepositories = vi.fn().mockImplementation(async ({ query }: { query?: string }) => {
      if (query === "") return [blogRepository];
      if (query === "notes") return [notesRepository];
      return [];
    });
    const onboardingClient = createOnboardingClient({ listRepositories });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await user.click(await screen.findByText("kebai/blog"));
    expect(await screen.findByText("开始管理")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("搜索仓库"), "notes");

    await waitFor(() => {
      expect(listRepositories).toHaveBeenLastCalledWith({ query: "notes" });
    });
    expect(screen.queryByRole("button", { name: "开始管理" })).not.toBeInTheDocument();
    expect(
      screen.getByText("选择一个有写权限的仓库后，HexoCMS 会自动检查它是否可以作为博客项目导入。"),
    ).toBeInTheDocument();
  });

  it("shows desktop reauthorization device flow in onboarding", async () => {
    const onboardingClient = createOnboardingClient({
      reauthorize: vi.fn().mockResolvedValue({
        state: "authenticating",
        deviceFlow: {
          userCode: "WXYZ-9876",
          verificationUri: "https://github.com/login/device",
          expiresAt: "2026-05-09T08:15:00.000Z",
          interval: 1,
        },
      }) as OnboardingClient["reauthorize"],
    });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await screen.findByText("kebai/blog");
    fireEvent.click(screen.getByRole("button", { name: /重新授权/ }));

    expect(await screen.findByText("WXYZ-9876")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /打开 GitHub 授权页面/ })).toHaveAttribute(
      "href",
      "https://github.com/login/device",
    );
  });

  it("refreshes onboarding repositories after desktop reauthorization completes", async () => {
    const repository: RepositoryOption = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      pushedAt: "2026-05-11T08:00:00.000Z",
      permissions: { push: true },
    };
    const listRepositories = vi.fn().mockResolvedValue([repository]);
    const onboardingClient = createOnboardingClient({
      getAuthSession: vi.fn().mockResolvedValue({
        state: "authenticated",
        user: { login: "kebai" },
      }),
      listRepositories,
      reauthorize: vi.fn().mockResolvedValue({
        state: "authenticating",
        deviceFlow: {
          userCode: "WXYZ-9876",
          verificationUri: "https://github.com/login/device",
          expiresAt: "2026-05-09T08:15:00.000Z",
          interval: 1,
        },
      }),
    });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await screen.findByText("kebai/blog");
    expect(listRepositories).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /重新授权/ }));
        await Promise.resolve();
      });
      expect(screen.getByText("WXYZ-9876")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(listRepositories).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("WXYZ-9876")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("validates a selected repository before saving onboarding config", async () => {
    const user = userEvent.setup();
    const onboardingClient = createOnboardingClient();

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await user.click(await screen.findByText("kebai/blog"));
    expect(await screen.findByText("检测到 Hexo 结构")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始管理" }));

    expect(onboardingClient.validateRepository).toHaveBeenCalledWith({
      owner: "kebai",
      repo: "blog",
      branch: "main",
    });
    expect(onboardingClient.saveRepositoryConfig).toHaveBeenCalledWith({
      owner: "kebai",
      repo: "blog",
      branch: "main",
      postsDir: "source/_posts",
      mediaDir: "source/images",
      workflowFile: ".github/workflows/deploy.yml",
      autoDeploy: true,
      deployNotifications: true,
    });
  });

  it("does not save onboarding config when Hexo validation fails", async () => {
    const user = userEvent.setup();
    const onboardingClient = createOnboardingClient({
      validateRepository: vi.fn().mockResolvedValue({
        ok: false,
        checks: [
          { id: "access", status: "success", message: "仓库可访问" },
          { id: "permission", status: "success", message: "具备写权限" },
          { id: "branch", status: "success", message: "默认分支存在" },
          { id: "hexo", status: "error", message: "未检测到 Hexo 配置" },
        ],
        error: "NOT_HEXO_REPO",
      }),
    });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await user.click(await screen.findByText("kebai/blog"));

    expect(await screen.findByText("未检测到 Hexo 配置，请选择已有 Hexo 博客仓库")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "开始管理" })).not.toBeInTheDocument();
    expect(onboardingClient.saveRepositoryConfig).not.toHaveBeenCalled();
  });

  it("ignores stale repository validation results when selection changes", async () => {
    const user = userEvent.setup();
    const firstRepository: RepositoryOption = {
      id: "repo-1",
      owner: "kebai",
      name: "blog",
      fullName: "kebai/blog",
      private: false,
      defaultBranch: "main",
      pushedAt: "2026-05-11T08:00:00.000Z",
      permissions: { push: true },
    };
    const secondRepository: RepositoryOption = {
      id: "repo-2",
      owner: "kebai",
      name: "notes",
      fullName: "kebai/notes",
      private: true,
      defaultBranch: "source",
      pushedAt: "2026-05-11T09:00:00.000Z",
      permissions: { push: true },
    };
    const firstValidation = createDeferred<RepositoryValidation>();
    const secondValidation = createDeferred<RepositoryValidation>();
    const onboardingClient = createOnboardingClient({
      listRepositories: vi.fn().mockResolvedValue([firstRepository, secondRepository]),
      validateRepository: vi
        .fn()
        .mockReturnValueOnce(firstValidation.promise)
        .mockReturnValueOnce(secondValidation.promise),
    });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await user.click(await screen.findByText("kebai/blog"));
    await user.click(await screen.findByText("kebai/notes"));

    secondValidation.resolve({
      ok: true,
      repository: secondRepository,
      defaultConfig: {
        owner: "kebai",
        repo: "notes",
        branch: "source",
        postsDir: "content/posts",
        mediaDir: "content/images",
        workflowFile: ".github/workflows/notes.yml",
        autoDeploy: true,
        deployNotifications: true,
      },
      checks: [{ id: "hexo", status: "success", message: "检测到 Notes Hexo 结构" }],
    });
    expect(await screen.findByText("检测到 Notes Hexo 结构")).toBeInTheDocument();

    firstValidation.resolve({
      ok: true,
      repository: firstRepository,
      defaultConfig: {
        owner: "kebai",
        repo: "blog",
        branch: "main",
        postsDir: "source/_posts",
        mediaDir: "source/images",
        workflowFile: ".github/workflows/deploy.yml",
        autoDeploy: true,
        deployNotifications: true,
      },
      checks: [{ id: "hexo", status: "success", message: "检测到 Blog Hexo 结构" }],
    });

    await user.click(screen.getByRole("button", { name: "开始管理" }));

    expect(onboardingClient.saveRepositoryConfig).toHaveBeenCalledWith({
      owner: "kebai",
      repo: "notes",
      branch: "source",
      postsDir: "content/posts",
      mediaDir: "content/images",
      workflowFile: ".github/workflows/notes.yml",
      autoDeploy: true,
      deployNotifications: true,
    });
    expect(screen.queryByText("检测到 Blog Hexo 结构")).not.toBeInTheDocument();
  });

  it("shows a recoverable error when saving onboarding config fails", async () => {
    const user = userEvent.setup();
    const onboardingClient = createOnboardingClient({
      saveRepositoryConfig: vi.fn().mockRejectedValue(new Error("save failed")),
    });

    render(<OnboardingPage onboardingClient={onboardingClient} />);

    await user.click(await screen.findByText("kebai/blog"));
    expect(await screen.findByText("检测到 Hexo 结构")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始管理" }));

    expect(await screen.findByText("保存失败，请重试")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始管理" })).toBeInTheDocument();
  });

  it("does not render a PAT management card in settings", async () => {
    render(
      <DataProviderProvider provider={createDataProvider()}>
        <SettingsPage />
      </DataProviderProvider>,
    );

    await userEvent.click(screen.getByRole("tab", { name: /GitHub 集成/ }));

    await waitFor(() => {
      expect(screen.getByText("GitHub 仓库")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Personal Access Token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/保存 Token/i)).not.toBeInTheDocument();
  });

  it("shows OAuth account controls in settings when AuthClient is provided", async () => {
    const user = userEvent.setup();
    const onSignedOut = vi.fn();
    const authClient = createAuthClient({
      getSession: vi.fn().mockResolvedValue({
        state: "authenticated",
        user: {
          login: "kebai",
          name: "Kebai",
          email: "kebai@example.com",
        },
      }),
    });

    render(
      <DataProviderProvider provider={createDataProvider()}>
        <SettingsPage authClient={authClient} onSignedOut={onSignedOut} />
      </DataProviderProvider>,
    );

    await user.click(screen.getByRole("tab", { name: /GitHub 集成/ }));

    expect(await screen.findByText("GitHub 授权")).toBeInTheDocument();
    expect(screen.getByText("Kebai")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /重新授权/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /退出登录/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /重新授权/ }));
    expect(authClient.reauthorize).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /退出登录/ }));
    expect(authClient.signOut).toHaveBeenCalledTimes(1);
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  it("shows desktop reauthorization device flow in settings and refreshes when it completes", async () => {
    vi.useFakeTimers();
    try {
      const authClient = createAuthClient({
        getSession: vi
          .fn()
          .mockResolvedValueOnce({
            state: "reauthorization_required",
            user: { login: "kebai" },
          })
          .mockResolvedValueOnce({
            state: "authenticated",
            user: { login: "kebai" },
          }),
        reauthorize: vi.fn().mockResolvedValue({
          state: "authenticating",
          deviceFlow: {
            userCode: "WXYZ-9876",
            verificationUri: "https://github.com/login/device",
            expiresAt: "2026-05-09T08:15:00.000Z",
            interval: 1,
          },
        }),
      });

      render(
        <DataProviderProvider provider={createDataProvider()}>
          <SettingsPage authClient={authClient} initialSection="github" />
        </DataProviderProvider>,
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /重新授权/ }));
      });

      expect(screen.getByText("WXYZ-9876")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(screen.getByText("已通过 GitHub OAuth 授权")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
