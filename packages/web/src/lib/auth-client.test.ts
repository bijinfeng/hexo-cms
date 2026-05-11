import { afterEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const signInSocial = vi.fn();
const signOut = vi.fn();

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    getSession,
    signIn: { social: signInSocial },
    signOut,
  }),
}));

describe("webAuthClient", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it("requires reauthorization when the Better Auth session exists but the GitHub token is missing", async () => {
    getSession.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          name: "Kebai",
          email: "kebai@example.com",
        },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "REAUTH_REQUIRED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { webAuthClient } = await import("./auth-client");

    await expect(webAuthClient.getSession()).resolves.toEqual({
      state: "reauthorization_required",
      user: {
        id: "user-1",
        name: "Kebai",
        email: "kebai@example.com",
      },
      error: "AUTH_SCOPE_INSUFFICIENT",
    });
  });

  it("keeps the user authenticated when the GitHub token is available", async () => {
    getSession.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          name: "Kebai",
          email: "kebai@example.com",
        },
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const { webAuthClient } = await import("./auth-client");

    await expect(webAuthClient.getSession()).resolves.toMatchObject({
      state: "authenticated",
      user: {
        id: "user-1",
        name: "Kebai",
        email: "kebai@example.com",
      },
    });
  });
});
