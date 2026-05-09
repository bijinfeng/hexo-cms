import { describe, expect, it, vi } from "vitest";
import { getGitHubAccessToken, getGitHubAccessTokenFromAuth, githubCtxErrorResponse } from "./server-utils";

describe("server-utils auth token lookup", () => {
  it("reads the GitHub access token from the linked Better Auth account", () => {
    const get = vi.fn().mockReturnValue({ accessToken: "gho_oauth_token" });
    const prepare = vi.fn().mockReturnValue({ get });

    const token = getGitHubAccessToken({ prepare }, "user-1");

    expect(token).toBe("gho_oauth_token");
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("FROM account"));
    expect(get).toHaveBeenCalledWith("user-1", "github");
  });

  it("returns null when the current user has no GitHub account token", () => {
    const get = vi.fn().mockReturnValue(undefined);
    const prepare = vi.fn().mockReturnValue({ get });

    expect(getGitHubAccessToken({ prepare }, "user-1")).toBeNull();
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
});
