import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DataProvider } from "../data-provider";
import type { HexoPost, GitHubConfig } from "../types";

// A minimal mock implementation to verify the interface contract
function createMockDataProvider(): DataProvider {
  return {
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(null),
    saveToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    getPosts: vi.fn().mockResolvedValue([]),
    getPost: vi.fn().mockResolvedValue({ path: "", title: "", date: "", content: "", frontmatter: {} }),
    savePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue({ path: "", title: "", date: "", content: "", frontmatter: {} }),
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
  };
}

describe("DataProvider interface", () => {
  let provider: DataProvider;

  beforeEach(() => {
    provider = createMockDataProvider();
  });

  describe("config management", () => {
    it("getConfig returns null when not configured", async () => {
      const config = await provider.getConfig();
      expect(config).toBeNull();
    });

    it("saveConfig accepts a valid config object", async () => {
      const config: GitHubConfig = { owner: "user", repo: "blog", branch: "main" };
      await expect(provider.saveConfig(config)).resolves.toBeUndefined();
    });
  });

  describe("token management", () => {
    it("getToken returns null when no token stored", async () => {
      const token = await provider.getToken();
      expect(token).toBeNull();
    });

    it("saveToken accepts a string token", async () => {
      await expect(provider.saveToken("ghp_test123")).resolves.toBeUndefined();
    });

    it("deleteToken resolves without error", async () => {
      await expect(provider.deleteToken()).resolves.toBeUndefined();
    });
  });

  describe("post management", () => {
    it("getPosts returns an array", async () => {
      const posts = await provider.getPosts();
      expect(Array.isArray(posts)).toBe(true);
    });

    it("getPost accepts a path string", async () => {
      const post = await provider.getPost("source/_posts/test.md");
      expect(post).toHaveProperty("path");
      expect(post).toHaveProperty("title");
      expect(post).toHaveProperty("content");
      expect(post).toHaveProperty("frontmatter");
    });

    it("savePost accepts a HexoPost object", async () => {
      const post: HexoPost = {
        path: "source/_posts/test.md",
        title: "Test",
        date: "2024-01-01",
        content: "Content",
        frontmatter: { title: "Test" },
      };
      await expect(provider.savePost(post)).resolves.toBeUndefined();
    });

    it("deletePost accepts a path string", async () => {
      await expect(provider.deletePost("source/_posts/test.md")).resolves.toBeUndefined();
    });
  });

  describe("page management", () => {
    it("getPages returns an array", async () => {
      const pages = await provider.getPages();
      expect(Array.isArray(pages)).toBe(true);
    });

    it("getPage accepts a path string", async () => {
      const page = await provider.getPage("about/index.md");
      expect(page).toHaveProperty("path");
    });

    it("savePage accepts a HexoPost object", async () => {
      const page: HexoPost = {
        path: "about/index.md",
        title: "About",
        date: "2024-01-01",
        content: "About page",
        frontmatter: { title: "About" },
      };
      await expect(provider.savePage(page)).resolves.toBeUndefined();
    });

    it("deletePage accepts a path string", async () => {
      await expect(provider.deletePage("about/index.md")).resolves.toBeUndefined();
    });
  });

  describe("tags and categories", () => {
    it("getTags returns tags, categories, and total", async () => {
      const result = await provider.getTags();
      expect(result).toHaveProperty("tags");
      expect(result).toHaveProperty("categories");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.tags)).toBe(true);
      expect(Array.isArray(result.categories)).toBe(true);
    });

    it("renameTag returns updatedCount", async () => {
      const result = await provider.renameTag("tag", "old-name", "new-name");
      expect(result).toHaveProperty("updatedCount");
      expect(typeof result.updatedCount).toBe("number");
    });

    it("deleteTag returns updatedCount", async () => {
      const result = await provider.deleteTag("category", "old-category");
      expect(result).toHaveProperty("updatedCount");
    });
  });

  describe("media management", () => {
    it("getMediaFiles returns an array", async () => {
      const files = await provider.getMediaFiles();
      expect(Array.isArray(files)).toBe(true);
    });

    it("uploadMedia returns a url", async () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const result = await provider.uploadMedia(file, "images/test.png");
      expect(result).toHaveProperty("url");
    });

    it("deleteMedia accepts a path string", async () => {
      await expect(provider.deleteMedia("images/test.png")).resolves.toBeUndefined();
    });
  });

  describe("stats", () => {
    it("getStats returns required fields", async () => {
      const stats = await provider.getStats();
      expect(stats).toHaveProperty("totalPosts");
      expect(stats).toHaveProperty("publishedPosts");
      expect(stats).toHaveProperty("draftPosts");
      expect(stats).toHaveProperty("totalViews");
    });
  });

  describe("theme management", () => {
    it("getThemes returns currentTheme and installedThemes", async () => {
      const themes = await provider.getThemes();
      expect(themes).toHaveProperty("currentTheme");
      expect(themes).toHaveProperty("installedThemes");
      expect(Array.isArray(themes.installedThemes)).toBe(true);
    });

    it("switchTheme accepts a theme name", async () => {
      await expect(provider.switchTheme("next")).resolves.toBeUndefined();
    });
  });

  describe("deploy management", () => {
    it("getDeployments returns an array", async () => {
      const deployments = await provider.getDeployments();
      expect(Array.isArray(deployments)).toBe(true);
    });

    it("triggerDeploy accepts a workflow file name", async () => {
      await expect(provider.triggerDeploy("deploy.yml")).resolves.toBeUndefined();
    });
  });
});
