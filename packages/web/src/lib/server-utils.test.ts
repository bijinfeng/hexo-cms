import { describe, expect, it, vi } from "vitest";
import { getGitHubAccessTokenFromAuth, githubCtxErrorResponse } from "./server-utils";

vi.mock("./db", () => {
  const get = vi.fn();
  const limit = vi.fn(() => ({ get }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { db: { select }, __mocks: { get, select, from, where, orderBy, limit } };
});

const session = {
  user: {
    id: "user-1",
  },
};

describe("server-utils auth token lookup", () => {
  it("reads the GitHub access token via drizzle query", async () => {
    const { __mocks } = await import("./db") as any;
    __mocks.get.mockReturnValue({ accessToken: "gho_oauth_token" });

    const { getGitHubAccessToken } = await import("./server-utils");
    const token = getGitHubAccessToken("user-1");

    expect(token).toBe("gho_oauth_token");
    expect(__mocks.select).toHaveBeenCalled();
  });

  it("returns null when no GitHub account token exists", async () => {
    const { __mocks } = await import("./db") as any;
    __mocks.get.mockReturnValue(undefined);

    const { getGitHubAccessToken } = await import("./server-utils");
    expect(getGitHubAccessToken("user-1")).toBeNull();
  });

  it("uses Better Auth to resolve the linked GitHub access token", async () => {
    const getAccessToken = vi.fn().mockResolvedValue({ accessToken: "gho_oauth_token" });

    const token = await getGitHubAccessTokenFromAuth(
      { getAccessToken },
      new Headers({ cookie: "better-auth.session_token=session" }),
    );

    expect(token).toBe("gho_oauth_token");
    expect(getAccessToken).toHaveBeenCalledWith({
      body: { providerId: "github" },
      headers: expect.any(Headers),
    });
  });

  it("maps Better Auth account lookup failures to a missing GitHub token", async () => {
    const getAccessToken = vi.fn().mockRejectedValue(Object.assign(new Error("Account not found"), {
      code: "ACCOUNT_NOT_FOUND",
    }));

    await expect(getGitHubAccessTokenFromAuth(
      { getAccessToken },
      new Headers({ cookie: "better-auth.session_token=session" }),
    )).resolves.toBeNull();
  });

  it("maps missing GitHub OAuth token to a reauthorization response", async () => {
    const response = githubCtxErrorResponse("reauthorization_required");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "REAUTH_REQUIRED" });
  });

  it("maps missing repository config separately from auth failures", async () => {
    const response = githubCtxErrorResponse("config_missing");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "CONFIG_REQUIRED" });
  });

  it("builds authenticated plugin store handlers with the configured payload key", async () => {
    const { auth } = await import("../lib/auth");
    vi.spyOn(auth.api, "getSession").mockResolvedValue(session as never);

    const { createPluginStoreHandlers } = await import("./server-utils");
    const load = vi.fn().mockReturnValue({ enabled: true });
    const save = vi.fn();
    const handlers = createPluginStoreHandlers({
      payloadKey: "state",
      load,
      save,
      empty: () => ({}),
    });

    const getResponse = await handlers.GET({
      request: new Request("http://localhost/api/plugin/state"),
    });
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual({ state: { enabled: true } });
    expect(load).toHaveBeenCalledWith("user-1");

    const putResponse = await handlers.PUT({
      request: new Request("http://localhost/api/plugin/state", {
        method: "PUT",
        body: JSON.stringify({ state: { enabled: false } }),
      }),
    });
    expect(putResponse.status).toBe(200);
    expect(save).toHaveBeenCalledWith("user-1", { enabled: false });
  });
});
