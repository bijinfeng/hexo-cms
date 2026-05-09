import { afterEach, describe, expect, it, vi } from "vitest";
import { DataProviderError } from "@hexo-cms/core";
import { WebDataProvider } from "./web-data-provider";

describe("WebDataProvider auth errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not swallow reauthorization errors when loading posts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "REAUTH_REQUIRED" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(new WebDataProvider().getPosts()).rejects.toSatisfy(DataProviderError.isAuthError);
  });

  it("still returns an empty list for a missing optional posts directory", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "CONFIG_REQUIRED" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(new WebDataProvider().getPosts()).resolves.toEqual([]);
  });

  it("saves repository config with the flat API payload expected by the route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);

    await new WebDataProvider().saveConfig({
      owner: "kebai",
      repo: "blog",
      branch: "main",
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      owner: "kebai",
      repo: "blog",
      branch: "main",
    });
  });

  it("does not expose the GitHub access token through the legacy token method", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ authenticated: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(new WebDataProvider().getToken()).resolves.toBe("oauth-session");
  });
});
