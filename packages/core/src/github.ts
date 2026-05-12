import { Octokit } from "octokit";
import type { GitHubConfig, HexoPost, Frontmatter } from "./types";
import { DataProviderError, DataProviderErrorCode } from "./types";
import { Logger } from "./logger";

type OctokitStatusError = Error & { status: number };

function isOctokitStatusError(error: unknown): error is OctokitStatusError {
  return error instanceof Error && "status" in error && typeof error.status === "number";
}

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;
  private log: Logger;

  constructor(accessToken: string, config: GitHubConfig) {
    this.octokit = new Octokit({ auth: accessToken });
    this.config = {
      ...config,
      branch: config.branch || "main",
      postsDir: config.postsDir ?? config.posts_dir ?? "source/_posts",
      mediaDir: config.mediaDir ?? config.media_dir ?? "source/images",
      workflowFile: config.workflowFile ?? config.workflow_file,
      autoDeploy: config.autoDeploy ?? (typeof config.auto_deploy === "number" ? config.auto_deploy === 1 : config.auto_deploy),
      deployNotifications: config.deployNotifications ?? (typeof config.deploy_notifications === "number" ? config.deploy_notifications === 1 : config.deploy_notifications),
    };
    this.log = new Logger("GitHubService");
  }

  private handleOctokitError(error: unknown, operation: string, path?: string): never {
    const ctx = { operation, ...(path ? { path } : {}) };
    if (error instanceof DataProviderError) throw error;
    if (isOctokitStatusError(error)) {
      const { status } = error;
      if (status === 401 || status === 403) {
        this.log.error(`Auth failed: ${operation}`, ctx, error);
        throw new DataProviderError("GitHub authentication failed", DataProviderErrorCode.AUTH, status, error);
      }
      if (status === 404) {
        this.log.warn(`Not found: ${operation}`, ctx);
        throw new DataProviderError(`Resource not found: ${path}`, DataProviderErrorCode.NOT_FOUND, status, error);
      }
      if (status === 429) {
        this.log.warn(`Rate limited: ${operation}`, ctx);
        throw new DataProviderError("GitHub API rate limit exceeded", DataProviderErrorCode.RATE_LIMIT, status, error);
      }
    }
    this.log.error(`Operation failed: ${operation}`, ctx, error as Error);
    throw new DataProviderError(`GitHub operation failed: ${operation}`, DataProviderErrorCode.NETWORK, undefined, error as Error);
  }

  /**
   * 获取仓库中的所有 Markdown 文章
   */
  async getPosts(directory: string = this.config.postsDir ?? "source/_posts"): Promise<HexoPost[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: directory,
        ref: this.config.branch,
      });

      if (!Array.isArray(data)) {
        this.log.warn(`getPosts: response is not an array`, { directory, type: typeof data });
        return [];
      }

      const posts: HexoPost[] = [];

      for (const file of data) {
        if (file.type === "file" && file.name.endsWith(".md")) {
          const post = await this.getPost(file.path);
          if (post) {
            posts.push(post);
          }
        }
      }

      return posts;
    } catch (error) {
      if (DataProviderError.isNotFound(error)) {
        this.log.warn(`getPosts: directory not found`, { directory });
        return [];
      }
      if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404) {
        this.log.warn(`getPosts: directory not found (Octokit 404)`, { directory });
        return [];
      }
      this.handleOctokitError(error, "getPosts", directory);
    }
  }

  /**
   * 获取单个文章内容
   */
  async getPost(path: string): Promise<HexoPost | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if ("content" in data && data.type === "file") {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        const { frontmatter, body } = this.parseFrontmatter(content);

        return {
          path,
          title: frontmatter.title || "",
          date: frontmatter.date || "",
          content: body,
          frontmatter,
        };
      }

      this.log.warn(`getPost: response is not a file`, { path });
      return null;
    } catch (error) {
      if (DataProviderError.isNotFound(error)) {
        this.log.warn(`getPost: not found`, { path });
        return null;
      }
      if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404) {
        this.log.warn(`getPost: not found (Octokit 404)`, { path });
        return null;
      }
      this.handleOctokitError(error, "getPost", path);
    }
  }

  /**
   * 创建或更新文章
   */
  async savePost(post: HexoPost, commitMessage?: string): Promise<void> {
    try {
      const content = this.stringifyPost(post);
      const { data: currentFile } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: post.path,
        ref: this.config.branch,
      }).catch(() => ({ data: null }));

      const sha = currentFile && "sha" in currentFile ? currentFile.sha : undefined;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path: post.path,
        message: commitMessage || `Update post: ${post.title}`,
        content: Buffer.from(content).toString("base64"),
        branch: this.config.branch,
        sha,
      });

      this.log.info(`Post saved: ${post.path}`, { title: post.title });
    } catch (error) {
      this.handleOctokitError(error, "savePost", post.path);
    }
  }

  /**
   * 删除文章
   */
  async deletePost(path: string, commitMessage?: string): Promise<void> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if (!("sha" in data)) {
        this.log.warn(`deletePost: no sha in response`, { path });
        throw new DataProviderError(`Cannot delete ${path}: no SHA found`, DataProviderErrorCode.UNKNOWN, undefined);
      }

      await this.octokit.rest.repos.deleteFile({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message: commitMessage || `Delete post: ${path}`,
        sha: data.sha,
        branch: this.config.branch,
      });

      this.log.info(`Post deleted: ${path}`);
    } catch (error) {
      if (error instanceof DataProviderError && error.code !== DataProviderErrorCode.UNKNOWN) throw error;
      this.handleOctokitError(error, "deletePost", path);
    }
  }

  /**
   * 解析 Frontmatter
   */
  private parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const [, frontmatterStr, body] = match;
    const frontmatter: Frontmatter = {};

    frontmatterStr.split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
          value = value
            .slice(1, -1)
            .split(",")
            .map((v: string) => v.trim());
        } else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        } else if (typeof value === "string" && !isNaN(Number(value))) {
          value = Number(value);
        }

        frontmatter[key] = value;
      }
    });

    return { frontmatter, body };
  }

  /**
   * 将文章对象转换为 Markdown 字符串
   */
  private stringifyPost(post: HexoPost): string {
    const frontmatterLines = Object.entries(post.frontmatter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(", ")}]`;
      }
      return `${key}: ${value}`;
    });

    return `---\n${frontmatterLines.join("\n")}\n---\n${post.content}`;
  }

  /**
   * 读取文件原始内容（用于 _config.yml 等配置文件）
   */
  async getRawFile(path: string): Promise<{ content: string; sha: string } | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if ("content" in data && data.type === "file") {
        return {
          content: Buffer.from(data.content, "base64").toString("utf-8"),
          sha: data.sha,
        };
      }
      this.log.warn(`getRawFile: response is not a file`, { path });
      return null;
    } catch (error) {
      if (DataProviderError.isNotFound(error)) {
        this.log.warn(`getRawFile: not found`, { path });
        return null;
      }
      if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404) {
        this.log.warn(`getRawFile: not found (Octokit 404)`, { path });
        return null;
      }
      this.handleOctokitError(error, "getRawFile", path);
    }
  }

  async writeRawFile(path: string, content: string, commitMessage: string): Promise<void> {
    try {
      const existing = await this.getRawFile(path);
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message: commitMessage,
        content: Buffer.from(content).toString("base64"),
        branch: this.config.branch,
        sha: existing?.sha,
      });
      this.log.info(`File written: ${path}`);
    } catch (error) {
      this.handleOctokitError(error, "writeRawFile", path);
    }
  }

  /**
   * 列出目录内容（不递归）
   */
  async listDirectory(path: string): Promise<Array<{ name: string; type: string; path: string }>> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if (!Array.isArray(data)) return [];
      return data.map((item) => ({ name: item.name, type: item.type, path: item.path }));
    } catch (error) {
      this.log.warn(`listDirectory failed`, { path }, error as Error);
      return [];
    }
  }

  async getMediaFiles(directory: string = this.config.mediaDir ?? "source/images"): Promise<Array<{ name: string; type: string; path: string; sha: string; size: number }>> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: directory,
        ref: this.config.branch,
      });

      if (!Array.isArray(data)) return [];

      return data
        .filter((file) => file.type === "file")
        .map((file) => ({
          name: file.name,
          type: file.type,
          path: file.path,
          sha: file.sha,
          size: file.size,
        }));
    } catch (error) {
      this.log.warn(`getMediaFiles failed`, { directory }, error as Error);
      return [];
    }
  }

  async uploadMedia(path: string, base64Content: string, fileName: string): Promise<{ url: string }> {
    try {
      const { data: currentFile } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      }).catch(() => ({ data: null }));

      const sha = currentFile && "sha" in currentFile ? currentFile.sha : undefined;

      const result = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message: `Upload media: ${fileName}`,
        content: base64Content,
        branch: this.config.branch,
        sha,
      });

      this.log.info(`Media uploaded: ${fileName}`, { path });
      return { url: result.data.content?.html_url || "" };
    } catch (error) {
      this.handleOctokitError(error, "uploadMedia", path);
    }
  }

  async deleteMedia(path: string): Promise<void> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if (!("sha" in data)) {
        throw new DataProviderError(`Cannot delete ${path}: no SHA found`, DataProviderErrorCode.UNKNOWN);
      }

      await this.octokit.rest.repos.deleteFile({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        message: `Delete media: ${path}`,
        sha: data.sha,
        branch: this.config.branch,
      });

      this.log.info(`Media deleted: ${path}`);
    } catch (error) {
      if (error instanceof DataProviderError && error.code === DataProviderErrorCode.NOT_FOUND) {
        this.log.warn(`deleteMedia: not found`, { path });
        return;
      }
      this.handleOctokitError(error, "deleteMedia", path);
    }
  }
}
