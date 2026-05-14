import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@hexo-cms/ui/types/auth";
import { createDesktopAuthManager } from "./desktop-auth";
import type { KeychainAdapter } from "./desktop-persistence";

function createMemoryKeychain(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const adapter: KeychainAdapter = {
    async getPassword(_service, account) {
      return values.get(account) ?? null;
    },
    async setPassword(_service, account, password) {
      values.set(account, password);
    },
    async deletePassword(_service, account) {
      return values.delete(account);
    },
  };

  return { adapter, values };
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("desktop auth manager", () => {
  it("loads authenticated sessions and access tokens from the keychain", async () => {
    const { adapter } = createMemoryKeychain({
      "github-oauth-session": JSON.stringify({
        accessToken: "token-1",
        user: { id: "user-1", login: "octo" },
        createdAt: "2026-05-14T10:00:00.000Z",
      }),
    });
    const manager = createDesktopAuthManager({
      clientId: "client-1",
      keytarService: "hexo-cms-test",
      keychain: async () => adapter,
      invalidateGitHubService: vi.fn(),
      openExternal: vi.fn(),
    });

    await expect(manager.getSession()).resolves.toEqual({
      state: "authenticated",
      user: { id: "user-1", login: "octo" },
    });
    await expect(manager.getAccessToken()).resolves.toBe("token-1");
  });

  it("starts Device Flow, opens GitHub, and persists the successful OAuth session", async () => {
    const { adapter, values } = createMemoryKeychain();
    const invalidateGitHubService = vi.fn();
    const openExternal = vi.fn();
    const pollGitHubDeviceFlowToken = vi.fn().mockResolvedValue({
      status: "success" as const,
      token: "token-2",
      tokenType: "bearer",
      scope: "repo user",
    });
    const fetchGitHubUser = vi.fn<(_: string) => Promise<AuthUser | null>>().mockResolvedValue({
      id: "user-2",
      login: "octo",
      name: "Octo",
    });
    const manager = createDesktopAuthManager({
      clientId: "client-1",
      keytarService: "hexo-cms-test",
      keychain: async () => adapter,
      invalidateGitHubService,
      openExternal,
      now: () => new Date("2026-05-14T10:00:00.000Z"),
      sleep: async () => {},
      startGitHubDeviceFlow: async () => ({
        deviceCode: "device-1",
        session: {
          state: "authenticating",
          deviceFlow: {
            userCode: "ABCD-1234",
            verificationUri: "https://github.com/login/device",
            expiresAt: "2026-05-14T10:15:00.000Z",
            interval: 5,
          },
        },
      }),
      pollGitHubDeviceFlowToken,
      fetchGitHubUser,
    });

    await expect(manager.startDeviceFlow()).resolves.toEqual({
      state: "authenticating",
      deviceFlow: {
        userCode: "ABCD-1234",
        verificationUri: "https://github.com/login/device",
        expiresAt: "2026-05-14T10:15:00.000Z",
        interval: 5,
      },
    });
    expect(openExternal).toHaveBeenCalledWith("https://github.com/login/device");

    await flushAsyncWork();

    expect(pollGitHubDeviceFlowToken).toHaveBeenCalledWith({
      clientId: "client-1",
      deviceCode: "device-1",
    });
    expect(fetchGitHubUser).toHaveBeenCalledWith("token-2");
    expect(invalidateGitHubService).toHaveBeenCalledTimes(1);
    expect(JSON.parse(values.get("github-oauth-session") ?? "{}")).toMatchObject({
      accessToken: "token-2",
      tokenType: "bearer",
      scope: "repo user",
      githubUserId: "user-2",
      user: { id: "user-2", login: "octo", name: "Octo" },
      createdAt: "2026-05-14T10:00:00.000Z",
      lastValidatedAt: "2026-05-14T10:00:00.000Z",
    });
    await expect(manager.getSession()).resolves.toEqual({
      state: "authenticated",
      user: { id: "user-2", login: "octo", name: "Octo" },
    });
  });

  it("surfaces Device Flow polling errors when authentication fails", async () => {
    const { adapter } = createMemoryKeychain();
    const manager = createDesktopAuthManager({
      clientId: "client-1",
      keytarService: "hexo-cms-test",
      keychain: async () => adapter,
      invalidateGitHubService: vi.fn(),
      openExternal: vi.fn(),
      now: () => new Date("2026-05-14T10:00:00.000Z"),
      sleep: async () => {},
      startGitHubDeviceFlow: async () => ({
        deviceCode: "device-1",
        session: {
          state: "authenticating",
          deviceFlow: {
            userCode: "ABCD-1234",
            verificationUri: "https://github.com/login/device",
            expiresAt: "2026-05-14T10:15:00.000Z",
            interval: 5,
          },
        },
      }),
      pollGitHubDeviceFlowToken: vi.fn().mockResolvedValue({ status: "error", error: "AUTH_REJECTED" }),
    });

    await manager.startDeviceFlow();
    await flushAsyncWork();

    await expect(manager.getSession()).resolves.toEqual({ state: "error", error: "AUTH_REJECTED" });
  });

  it("signs out idempotently and clears current and legacy keychain accounts", async () => {
    const { adapter, values } = createMemoryKeychain({
      "github-oauth-session": JSON.stringify({ accessToken: "token-1", createdAt: "2026-05-14T10:00:00.000Z" }),
      "github-token": "legacy-token",
    });
    const invalidateGitHubService = vi.fn();
    const manager = createDesktopAuthManager({
      clientId: "client-1",
      keytarService: "hexo-cms-test",
      keychain: async () => adapter,
      invalidateGitHubService,
      openExternal: vi.fn(),
    });

    await manager.signOut();

    expect(values.has("github-oauth-session")).toBe(false);
    expect(values.has("github-token")).toBe(false);
    expect(invalidateGitHubService).toHaveBeenCalledTimes(1);
    await expect(manager.getSession()).resolves.toEqual({ state: "anonymous" });
  });
});
