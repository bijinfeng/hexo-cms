import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "../pages/login";
import { OnboardingPage } from "../pages/onboarding";
import { SettingsPage } from "../pages/settings";
import { DataProviderProvider } from "../context/data-provider-context";
import type { AuthClient } from "../types/auth";
import type { DataProvider } from "@hexo-cms/core";

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

  it("keeps onboarding focused on repository configuration instead of PAT entry", () => {
    render(
      <DataProviderProvider provider={createDataProvider()}>
        <OnboardingPage />
      </DataProviderProvider>,
    );

    expect(screen.queryByLabelText("GitHub Token")).not.toBeInTheDocument();
    expect(screen.queryByText(/Personal Access Token/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("仓库所有者")).toBeInTheDocument();
  });

  it("does not render a PAT management card in settings", async () => {
    render(
      <DataProviderProvider provider={createDataProvider()}>
        <SettingsPage />
      </DataProviderProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /GitHub 集成/ }));

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

    await user.click(screen.getByRole("button", { name: /GitHub 集成/ }));

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
          <SettingsPage authClient={authClient} />
        </DataProviderProvider>,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /GitHub 集成/ }));
      });
      await act(async () => {
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
