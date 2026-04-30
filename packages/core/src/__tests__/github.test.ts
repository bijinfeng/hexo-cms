import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubService } from "../github";
import type { HexoPost } from "../types";

// Create mock functions
const mockGetContent = vi.fn();
const mockCreateOrUpdateFileContents = vi.fn();
const mockDeleteFile = vi.fn();

// Mock Octokit
vi.mock("octokit", () => {
  return {
    Octokit: class MockOctokit {
      rest = {
        repos: {
          getContent: mockGetContent,
          createOrUpdateFileContents: mockCreateOrUpdateFileContents,
          deleteFile: mockDeleteFile,
        },
      };
    },
  };
});

describe("GitHubService", () => {
  let service: GitHubService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GitHubService("test-token", {
      owner: "test-owner",
      repo: "test-repo",
      branch: "main",
    });
  });

  describe("getPosts", () => {
    it("should return empty array when directory is empty", async () => {
      mockGetContent.mockResolvedValue({ data: [] });
      const posts = await service.getPosts();
      expect(posts).toEqual([]);
    });

    it("should return empty array when response is not an array", async () => {
      mockGetContent.mockResolvedValue({ data: { type: "file" } });
      const posts = await service.getPosts();
      expect(posts).toEqual([]);
    });

    it("should skip non-markdown files", async () => {
      mockGetContent.mockResolvedValue({
        data: [
          { type: "file", name: "image.png", path: "source/_posts/image.png" },
          { type: "dir", name: "assets", path: "source/_posts/assets" },
        ],
      });
      const posts = await service.getPosts();
      expect(posts).toEqual([]);
    });

    it("should return posts for markdown files", async () => {
      const rawContent = Buffer.from(
        "---\ntitle: Test Post\ndate: 2024-01-01\n---\nHello World"
      ).toString("base64");

      mockGetContent
        .mockResolvedValueOnce({
          data: [{ type: "file", name: "test.md", path: "source/_posts/test.md" }],
        })
        .mockResolvedValueOnce({
          data: { type: "file", content: rawContent, sha: "abc123" },
        });

      const posts = await service.getPosts();
      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe("Test Post");
      expect(posts[0].content).toBe("Hello World");
    });

    it("should return empty array on API error", async () => {
      mockGetContent.mockRejectedValue(new Error("API error"));
      const posts = await service.getPosts();
      expect(posts).toEqual([]);
    });

    it("should use custom directory when provided", async () => {
      mockGetContent.mockResolvedValue({ data: [] });
      await service.getPosts("custom/dir");
      expect(mockGetContent).toHaveBeenCalledWith(
        expect.objectContaining({ path: "custom/dir" })
      );
    });
  });

  describe("getPost", () => {
    it("should parse frontmatter correctly", async () => {
      const rawContent = Buffer.from(
        "---\ntitle: My Post\ndate: 2024-01-15\ntags: [react, typescript]\ndraft: false\n---\n# Content\n\nBody text"
      ).toString("base64");

      mockGetContent.mockResolvedValue({
        data: { type: "file", content: rawContent, sha: "abc123" },
      });

      const post = await service.getPost("source/_posts/my-post.md");
      expect(post).not.toBeNull();
      expect(post!.title).toBe("My Post");
      expect(post!.date).toBe("2024-01-15");
      expect(post!.frontmatter.tags).toEqual(["react", "typescript"]);
      expect(post!.frontmatter.draft).toBe(false);
      expect(post!.content).toBe("# Content\n\nBody text");
    });

    it("should return null when file not found", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      const post = await service.getPost("nonexistent.md");
      expect(post).toBeNull();
    });

    it("should return null when response is not a file", async () => {
      mockGetContent.mockResolvedValue({
        data: [{ type: "dir" }],
      });
      const post = await service.getPost("source/_posts");
      expect(post).toBeNull();
    });

    it("should handle content without frontmatter", async () => {
      const rawContent = Buffer.from("Just plain content").toString("base64");
      mockGetContent.mockResolvedValue({
        data: { type: "file", content: rawContent, sha: "abc123" },
      });

      const post = await service.getPost("source/_posts/plain.md");
      expect(post).not.toBeNull();
      expect(post!.frontmatter).toEqual({});
      expect(post!.content).toBe("Just plain content");
    });
  });

  describe("savePost", () => {
    const testPost: HexoPost = {
      path: "source/_posts/test.md",
      title: "Test Post",
      date: "2024-01-01",
      content: "Hello World",
      frontmatter: { title: "Test Post", date: "2024-01-01" },
    };

    it("should create new file when it does not exist", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      mockCreateOrUpdateFileContents.mockResolvedValue({ data: {} });

      const result = await service.savePost(testPost);
      expect(result).toBe(true);
      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          path: testPost.path,
          sha: undefined,
        })
      );
    });

    it("should update existing file with sha", async () => {
      mockGetContent.mockResolvedValue({
        data: { sha: "existing-sha", type: "file" },
      });
      mockCreateOrUpdateFileContents.mockResolvedValue({ data: {} });

      const result = await service.savePost(testPost);
      expect(result).toBe(true);
      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ sha: "existing-sha" })
      );
    });

    it("should use custom commit message when provided", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      mockCreateOrUpdateFileContents.mockResolvedValue({ data: {} });

      await service.savePost(testPost, "Custom commit message");
      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Custom commit message" })
      );
    });

    it("should return false on API error", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      mockCreateOrUpdateFileContents.mockRejectedValue(new Error("API error"));

      const result = await service.savePost(testPost);
      expect(result).toBe(false);
    });
  });

  describe("deletePost", () => {
    it("should delete file successfully", async () => {
      mockGetContent.mockResolvedValue({
        data: { sha: "file-sha", type: "file" },
      });
      mockDeleteFile.mockResolvedValue({ data: {} });

      const result = await service.deletePost("source/_posts/test.md");
      expect(result).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith(
        expect.objectContaining({ sha: "file-sha" })
      );
    });

    it("should return false when file has no sha", async () => {
      mockGetContent.mockResolvedValue({
        data: [{ type: "dir" }],
      });

      const result = await service.deletePost("source/_posts");
      expect(result).toBe(false);
    });

    it("should return false on API error", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      const result = await service.deletePost("nonexistent.md");
      expect(result).toBe(false);
    });
  });

  describe("getRawFile", () => {
    it("should return file content and sha", async () => {
      const rawContent = Buffer.from("config: value").toString("base64");
      mockGetContent.mockResolvedValue({
        data: { type: "file", content: rawContent, sha: "config-sha" },
      });

      const result = await service.getRawFile("_config.yml");
      expect(result).not.toBeNull();
      expect(result!.content).toBe("config: value");
      expect(result!.sha).toBe("config-sha");
    });

    it("should return null when file not found", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      const result = await service.getRawFile("nonexistent.yml");
      expect(result).toBeNull();
    });
  });

  describe("listDirectory", () => {
    it("should return directory contents", async () => {
      mockGetContent.mockResolvedValue({
        data: [
          { name: "landscape", type: "dir", path: "themes/landscape" },
          { name: "next", type: "dir", path: "themes/next" },
        ],
      });

      const items = await service.listDirectory("themes");
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("landscape");
      expect(items[1].type).toBe("dir");
    });

    it("should return empty array when not a directory", async () => {
      mockGetContent.mockResolvedValue({
        data: { type: "file" },
      });

      const items = await service.listDirectory("themes");
      expect(items).toEqual([]);
    });

    it("should return empty array on error", async () => {
      mockGetContent.mockRejectedValue(new Error("Not found"));
      const items = await service.listDirectory("nonexistent");
      expect(items).toEqual([]);
    });
  });

  describe("constructor", () => {
    it("should default branch to main when not provided", () => {
      const svc = new GitHubService("token", { owner: "owner", repo: "repo" });
      expect((svc as any).config.branch).toBe("main");
    });

    it("should use provided branch", () => {
      const svc = new GitHubService("token", { owner: "owner", repo: "repo", branch: "develop" });
      expect((svc as any).config.branch).toBe("develop");
    });
  });
});
