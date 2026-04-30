/**
 * Desktop API Layer
 *
 * 在桌面端渲染进程中直接调用 GitHubService，绕过 HTTP API 层
 * 拦截 fetch 请求，将 /api/* 路由转换为直接的 GitHubService 调用
 */

import { GitHubService } from "@hexo-cms/core";

// 存储 GitHub 配置和 token
let githubConfig: { owner: string; repo: string; branch?: string } | null = null;
let accessToken: string | null = null;

// 初始化配置（从 localStorage 读取）
function loadConfig() {
  try {
    const configStr = localStorage.getItem("github-config");
    if (configStr) {
      githubConfig = JSON.parse(configStr);
    }
  } catch (err) {
    console.error("Failed to load GitHub config:", err);
  }
}

// 初始化 token（从 Electron IPC 读取）
async function loadToken() {
  try {
    accessToken = await window.electronAPI.getToken();
  } catch (err) {
    console.error("Failed to load token:", err);
  }
}

// 创建 GitHubService 实例
function createGitHubService(): GitHubService | null {
  if (!githubConfig || !accessToken) {
    return null;
  }
  return new GitHubService(accessToken, githubConfig);
}

// 拦截 fetch 请求
const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  // 只拦截 /api/ 开头的请求
  if (!url.startsWith("/api/")) {
    return originalFetch(input, init);
  }

  try {
    // 解析 URL 和参数
    const urlObj = new URL(url, window.location.origin);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;
    const method = init?.method || "GET";

    // /api/github/config
    if (pathname === "/api/github/config") {
      if (method === "GET") {
        loadConfig();
        return new Response(
          JSON.stringify({ config: githubConfig }),
          { status: githubConfig ? 200 : 404, headers: { "Content-Type": "application/json" } }
        );
      } else if (method === "POST") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        githubConfig = body.config;
        localStorage.setItem("github-config", JSON.stringify(githubConfig));
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // /api/auth/token
    if (pathname === "/api/auth/token") {
      await loadToken();
      return new Response(
        JSON.stringify({ accessToken: accessToken }),
        { status: accessToken ? 200 : 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // /api/github/posts
    if (pathname === "/api/github/posts") {
      const github = createGitHubService();
      if (!github) {
        return new Response(
          JSON.stringify({ error: "GitHub not configured" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (method === "GET") {
        const posts = await github.getPosts();
        return new Response(
          JSON.stringify({ posts }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else if (method === "POST") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        await github.savePost(body);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else if (method === "DELETE") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        await github.deletePost(body.path);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // /api/github/pages
    if (pathname === "/api/github/pages") {
      const github = createGitHubService();
      if (!github) {
        return new Response(
          JSON.stringify({ error: "GitHub not configured" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (method === "GET") {
        const path = searchParams.get("path");
        if (path) {
          const page = await github.getPost(path);
          return new Response(
            JSON.stringify({ page }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          const posts = await github.getPosts();
          return new Response(
            JSON.stringify({ pages: posts }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      } else if (method === "POST") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        await github.savePost(body);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else if (method === "DELETE") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        await github.deletePost(body.path);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // /api/github/tags
    if (pathname === "/api/github/tags") {
      const github = createGitHubService();
      if (!github) {
        return new Response(
          JSON.stringify({ error: "GitHub not configured" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (method === "GET") {
        const posts = await github.getPosts();

        // 聚合标签和分类
        const tagMap = new Map<string, number>();
        const categoryMap = new Map<string, number>();

        for (const post of posts) {
          const tags = post.frontmatter.tags;
          if (Array.isArray(tags)) {
            for (const tag of tags) {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
          } else if (typeof tags === "string" && tags) {
            tagMap.set(tags, (tagMap.get(tags) || 0) + 1);
          }

          const category = post.frontmatter.category || post.frontmatter.categories;
          if (typeof category === "string" && category) {
            categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
          } else if (Array.isArray(category)) {
            for (const cat of category) {
              if (typeof cat === "string") {
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
              }
            }
          }
        }

        const tags = Array.from(tagMap.entries())
          .map(([name, count], i) => ({
            id: String(i + 1),
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            count
          }))
          .sort((a, b) => b.count - a.count);

        const categories = Array.from(categoryMap.entries())
          .map(([name, count], i) => ({
            id: String(i + 1),
            name,
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            count
          }))
          .sort((a, b) => b.count - a.count);

        return new Response(
          JSON.stringify({ tags, categories, total: posts.length }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // TODO: 实现 POST (重命名) 和 DELETE (删除) 方法
    }

    // /api/github/stats
    if (pathname === "/api/github/stats") {
      const github = createGitHubService();
      if (!github) {
        return new Response(
          JSON.stringify({ error: "GitHub not configured" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const posts = await github.getPosts();
      const published = posts.filter((p) => !p.frontmatter.draft).length;
      const drafts = posts.filter((p) => p.frontmatter.draft).length;

      return new Response(
        JSON.stringify({
          totalPosts: posts.length,
          publishedPosts: published,
          draftPosts: drafts,
          totalViews: 0, // 桌面端无法统计浏览量
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 未实现的 API
    return new Response(
      JSON.stringify({ error: "API not implemented in desktop mode" }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Desktop API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// 初始化
loadConfig();
loadToken();
