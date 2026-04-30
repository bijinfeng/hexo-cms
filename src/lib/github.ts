import { Octokit } from "octokit";

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
}

export interface HexoPost {
  path: string;
  title: string;
  date: string;
  content: string;
  frontmatter: Record<string, any>;
}

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(accessToken: string, config: GitHubConfig) {
    this.octokit = new Octokit({ auth: accessToken });
    this.config = {
      ...config,
      branch: config.branch || "main",
    };
  }

  /**
   * 获取仓库中的所有 Markdown 文章
   */
  async getPosts(directory: string = "source/_posts"): Promise<HexoPost[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: directory,
        ref: this.config.branch,
      });

      if (!Array.isArray(data)) {
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
      console.error("Failed to get posts:", error);
      return [];
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

      return null;
    } catch (error) {
      console.error(`Failed to get post ${path}:`, error);
      return null;
    }
  }

  /**
   * 创建或更新文章
   */
  async savePost(post: HexoPost, commitMessage?: string): Promise<boolean> {
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

      return true;
    } catch (error) {
      console.error("Failed to save post:", error);
      return false;
    }
  }

  /**
   * 删除文章
   */
  async deletePost(path: string, commitMessage?: string): Promise<boolean> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: this.config.branch,
      });

      if ("sha" in data) {
        await this.octokit.rest.repos.deleteFile({
          owner: this.config.owner,
          repo: this.config.repo,
          path,
          message: commitMessage || `Delete post: ${path}`,
          sha: data.sha,
          branch: this.config.branch,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to delete post:", error);
      return false;
    }
  }

  /**
   * 解析 Frontmatter
   */
  private parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const [, frontmatterStr, body] = match;
    const frontmatter: Record<string, any> = {};

    frontmatterStr.split("\n").forEach((line) => {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value: any = line.slice(colonIndex + 1).trim();

        if (value.startsWith("[") && value.endsWith("]")) {
          value = value
            .slice(1, -1)
            .split(",")
            .map((v: string) => v.trim());
        } else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        } else if (!isNaN(Number(value))) {
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
}
