import type { DataProvider } from "@hexo-cms/core";
import type { HexoPost, GitHubConfig } from "@hexo-cms/core";

/**
 * WebDataProvider
 *
 * Web 端 DataProvider 实现，通过 HTTP API 路由访问数据
 */
export class WebDataProvider implements DataProvider {
  // ==================== 配置管理 ====================

  async getConfig(): Promise<GitHubConfig | null> {
    const res = await fetch("/api/github/config");
    if (!res.ok) return null;
    const data = await res.json();
    return data.config ?? null;
  }

  async saveConfig(config: GitHubConfig): Promise<void> {
    await fetch("/api/github/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
  }

  // ==================== Token 管理 ====================

  async getToken(): Promise<string | null> {
    const res = await fetch("/api/auth/token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken ?? null;
  }

  async saveToken(_token: string): Promise<void> {
    // Web 端 token 由 OAuth 管理，不支持手动保存
  }

  async deleteToken(): Promise<void> {
    // Web 端 token 由 OAuth 管理，不支持手动删除
  }

  // ==================== 文章管理 ====================

  async getPosts(): Promise<HexoPost[]> {
    const res = await fetch("/api/github/posts");
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts ?? [];
  }

  async getPost(path: string): Promise<HexoPost> {
    const res = await fetch(`/api/github/posts?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to get post: ${res.statusText}`);
    const data = await res.json();
    return data.post;
  }

  async savePost(post: HexoPost): Promise<void> {
    await fetch("/api/github/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePost(path: string): Promise<void> {
    await fetch("/api/github/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 页面管理 ====================

  async getPages(): Promise<HexoPost[]> {
    const res = await fetch("/api/github/pages");
    if (!res.ok) return [];
    const data = await res.json();
    return data.pages ?? [];
  }

  async getPage(path: string): Promise<HexoPost> {
    const res = await fetch(`/api/github/pages?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`Failed to get page: ${res.statusText}`);
    const data = await res.json();
    return data.page;
  }

  async savePage(post: HexoPost): Promise<void> {
    await fetch("/api/github/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePage(path: string): Promise<void> {
    await fetch("/api/github/pages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 标签和分类管理 ====================

  async getTags(): Promise<{
    tags: Array<{ id: string; name: string; slug: string; count: number }>;
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    total: number;
  }> {
    const res = await fetch("/api/github/tags");
    if (!res.ok) return { tags: [], categories: [], total: 0 };
    return res.json();
  }

  async renameTag(type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }> {
    const res = await fetch("/api/github/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, oldName, newName }),
    });
    if (!res.ok) return { updatedCount: 0 };
    return res.json();
  }

  async deleteTag(type: "tag" | "category", name: string): Promise<{ updatedCount: number }> {
    const res = await fetch("/api/github/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });
    if (!res.ok) return { updatedCount: 0 };
    return res.json();
  }

  // ==================== 媒体管理 ====================

  async getMediaFiles(): Promise<Array<{ name: string; path: string; size: number; url: string; sha: string }>> {
    const res = await fetch("/api/github/media");
    if (!res.ok) return [];
    const data = await res.json();
    return data.files ?? [];
  }

  async uploadMedia(file: File, path: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch("/api/github/media", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Failed to upload media: ${res.statusText}`);
    return res.json();
  }

  async deleteMedia(path: string): Promise<void> {
    await fetch("/api/github/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 统计数据 ====================

  async getStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalViews: number;
  }> {
    const res = await fetch("/api/github/stats");
    if (!res.ok) return { totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 };
    return res.json();
  }

  // ==================== 主题管理 ====================

  async getThemes(): Promise<{
    currentTheme: string;
    installedThemes: Array<{ name: string; path: string }>;
  }> {
    const res = await fetch("/api/github/themes");
    if (!res.ok) return { currentTheme: "", installedThemes: [] };
    return res.json();
  }

  async switchTheme(themeName: string): Promise<void> {
    await fetch("/api/github/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeName }),
    });
  }

  // ==================== 部署管理 ====================

  async getDeployments(): Promise<Array<{
    id: string;
    status: string;
    createdAt: string;
    duration: number;
    conclusion: string;
  }>> {
    const res = await fetch("/api/deploy");
    if (!res.ok) return [];
    const data = await res.json();
    return data.runs ?? [];
  }

  async triggerDeploy(workflowFile: string): Promise<void> {
    await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowFile }),
    });
  }
}
