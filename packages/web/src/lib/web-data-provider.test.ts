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

  it("loads a single post through the path query parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        post: {
          path: "source/_posts/hello.md",
          title: "Hello",
          date: "2026-05-12",
          content: "Body",
          frontmatter: { title: "Hello" },
        },
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(new WebDataProvider().getPost("source/_posts/hello.md")).resolves.toMatchObject({
      path: "source/_posts/hello.md",
      title: "Hello",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/github/posts?path=source%2F_posts%2Fhello.md", undefined);
  });

  it("saves posts with the HexoPost payload instead of relying on a top-level slug", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);

    const post = {
      path: "source/_posts/hello.md",
      title: "Hello",
      date: "2026-05-12",
      content: "Body",
      frontmatter: { title: "Hello" },
    };

    await new WebDataProvider().savePost(post);

    expect(fetchMock).toHaveBeenCalledWith("/api/github/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  });

  it("reads media files from the API contract field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          files: [{ name: "hero.png", path: "source/images/hero.png", size: 123, url: "/hero.png", sha: "abc" }],
        })),
      ),
    );

    await expect(new WebDataProvider().getMediaFiles()).resolves.toEqual([
      { name: "hero.png", path: "source/images/hero.png", size: 123, url: "/hero.png", sha: "abc" },
    ]);
  });

  it("reads deployments from the API contract field and posts workflowFile when triggering deploy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          runs: [{ id: "1", status: "success", createdAt: "2026-05-12T00:00:00.000Z", duration: 1000, conclusion: "success" }],
        })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new WebDataProvider().getDeployments()).resolves.toHaveLength(1);
    await new WebDataProvider().triggerDeploy(".github/workflows/deploy.yml");

    expect(fetchMock).toHaveBeenLastCalledWith("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowFile: ".github/workflows/deploy.yml" }),
    });
  });
});
